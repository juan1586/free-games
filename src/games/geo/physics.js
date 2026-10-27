/**
 * Física de Salto Geométrico. No toca el DOM para que el juego y las pruebas
 * automáticas (un bot que comprueba que cada nivel se puede pasar) compartan el mismo motor.
 * Unidades: píxeles y segundos. El eje Y crece hacia arriba y el suelo está en y = 0.
 */

export const CELL = 40;
export const PLAYER_SIZE = 36;
export const CEILING_Y = 7 * CELL;
export const STEP_SECONDS = 1 / 240;
export const MODES = ['cube', 'rocket', 'ball', 'plane'];

/** Velocidades elegibles antes de jugar. El factor multiplica la velocidad del mundo. */
export const SPEEDS = {
  slow: { id: 'slow', label: 'Tranquila', icon: '🐢', factor: 0.85 },
  normal: { id: 'normal', label: 'Normal', icon: '🐇', factor: 1 },
  fast: { id: 'fast', label: 'Rápida', icon: '⚡', factor: 1.2 },
};

/** Multiplicador mientras se mantiene el turbo. */
export const TURBO_FACTOR = 1.25;

export const getSpeed = (id) => SPEEDS[id] ?? SPEEDS.normal;

const INPUT_BUFFER_SECONDS = 0.1;
const LANDING_TOLERANCE = 10;
const HAZARD_INSET = 7;
const ORB_REACH = 38;
const COIN_REACH = 22;

const CUBE = { gravity: 3000, jump: 850, pad: 1150, orb: 850, maxFall: 1100 };
const BALL = { gravity: 2600, kick: 250, maxSpeed: 900 };
const ROCKET = { acceleration: 1700, maxSpeed: 380 };
const PLANE = { gravity: 1700, flap: 520, maxFall: 520 };
const FLYER_BOOST = 600;

const SPIKE_HIT = { inset: 13, height: 22, smallHeight: 11 };
const SAW_HIT_RATIO = 0.8;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Convierte un objeto del nivel (en celdas) a coordenadas de mundo con su zona de impacto. */
function toWorldObject(source, id) {
  const x = source.x * CELL;
  const y = (source.y ?? 0) * CELL;
  switch (source.type) {
    case 'block': {
      const w = source.w * CELL;
      const h = source.h * CELL;
      return { ...source, id, x, y, w, h, left: x, right: x + w };
    }
    case 'spike': {
      const height = source.small ? SPIKE_HIT.smallHeight : SPIKE_HIT.height;
      const hitY = source.flip ? y + CELL - height : y;
      const hit = { x: x + SPIKE_HIT.inset, y: hitY, w: CELL - SPIKE_HIT.inset * 2, h: height };
      return { ...source, id, x, y, hit, left: x, right: x + CELL };
    }
    case 'saw': {
      const r = source.r * CELL;
      return { ...source, id, cx: x, cy: y, r, left: x - r, right: x + r };
    }
    case 'pad':
      return { ...source, id, x, y, left: x, right: x + CELL };
    case 'orb':
    case 'coin':
      return { ...source, id, cx: x, cy: y, left: x - CELL / 2, right: x + CELL / 2 };
    case 'portal':
      return { ...source, id, x, cy: y, left: x - CELL / 2, right: x + CELL / 2 };
    default:
      throw new Error(`Objeto desconocido: ${source.type}`);
  }
}

/** Prepara un nivel: objetos en píxeles y un índice por columnas para consultar solo lo cercano. */
export function loadLevel(definition, speed) {
  const objects = definition.objects.map(toWorldObject);
  const endX = definition.length * CELL;
  const columns = Array.from({ length: definition.length + 4 }, () => []);
  objects.forEach((object) => {
    const first = Math.max(0, Math.floor(object.left / CELL));
    const last = Math.min(columns.length - 1, Math.floor(object.right / CELL));
    for (let column = first; column <= last; column += 1) columns[column].push(object);
  });
  const coins = objects.filter((object) => object.type === 'coin');
  coins.forEach((coin, index) => (coin.coinIndex = index));
  return { objects, columns, endX, speed, coinCount: coins.length };
}

export function createState() {
  return {
    x: 0,
    y: 0,
    vy: 0,
    mode: 'cube',
    gravityDir: 1,
    onGround: true,
    buffer: 0,
    time: 0,
    dead: false,
    won: false,
    used: new Set(),
    coins: new Set(),
  };
}

export function cloneState(state) {
  return { ...state, used: new Set(state.used), coins: new Set(state.coins) };
}

function nearbyObjects(level, x) {
  const first = Math.max(0, Math.floor(x / CELL) - 1);
  const last = Math.min(level.columns.length - 1, Math.floor((x + PLAYER_SIZE) / CELL) + 1);
  const found = [];
  for (let column = first; column <= last; column += 1) found.push(...level.columns[column]);
  return found;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleTouchesRect(cx, cy, r, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nearestX) ** 2 + (cy - nearestY) ** 2 < r * r;
}

const playerBox = (state, inset = 0) => ({
  x: state.x + inset,
  y: state.y + inset,
  w: PLAYER_SIZE - inset * 2,
  h: PLAYER_SIZE - inset * 2,
});

function hitsWall(state, nearby) {
  const box = { x: state.x, y: state.y + LANDING_TOLERANCE, w: PLAYER_SIZE, h: PLAYER_SIZE - LANDING_TOLERANCE * 2 };
  return nearby.some((object) => object.type === 'block' && rectsOverlap(box, object));
}

function triggerObjects(state, nearby, events) {
  const centerX = state.x + PLAYER_SIZE / 2;
  const centerY = state.y + PLAYER_SIZE / 2;
  const box = playerBox(state);

  nearby.forEach((object) => {
    if (state.used.has(object.id)) return;

    if (object.type === 'portal' && centerX >= object.x) {
      state.used.add(object.id);
      if (state.mode !== object.mode) {
        state.mode = object.mode;
        state.gravityDir = 1;
        state.vy = clamp(state.vy, -300, 300);
        events.push({ type: 'portal', mode: object.mode });
      }
      return;
    }

    if (object.type === 'pad' && rectsOverlap(box, { x: object.x + 4, y: object.y, w: CELL - 8, h: 12 })) {
      state.used.add(object.id);
      if (state.mode === 'cube') state.vy = CUBE.pad;
      else if (state.mode === 'ball') state.gravityDir *= -1;
      else state.vy = FLYER_BOOST;
      state.onGround = false;
      events.push({ type: 'pad', x: object.x + CELL / 2, y: object.y });
      return;
    }

    const isNearOrb = object.type === 'orb' && Math.hypot(centerX - object.cx, centerY - object.cy) < ORB_REACH;
    if (isNearOrb && state.buffer > 0) {
      state.used.add(object.id);
      state.buffer = 0;
      if (state.mode === 'cube') state.vy = CUBE.orb;
      else if (state.mode === 'ball') {
        state.gravityDir *= -1;
        state.vy = BALL.kick * state.gravityDir;
      } else state.vy = FLYER_BOOST;
      state.onGround = false;
      events.push({ type: 'orb', x: object.cx, y: object.cy });
      return;
    }

    if (object.type === 'coin' && circleTouchesRect(object.cx, object.cy, COIN_REACH, box)) {
      state.used.add(object.id);
      state.coins.add(object.coinIndex);
      events.push({ type: 'coin', index: object.coinIndex, x: object.cx, y: object.cy });
    }
  });
}

function applyModeForces(state, held, dt, events) {
  switch (state.mode) {
    case 'cube':
      if (state.onGround && (held || state.buffer > 0)) {
        state.vy = CUBE.jump;
        state.onGround = false;
        state.buffer = 0;
        events.push({ type: 'jump' });
      }
      state.vy = Math.max(state.vy - CUBE.gravity * dt, -CUBE.maxFall);
      break;
    case 'ball':
      if (state.onGround && state.buffer > 0) {
        state.gravityDir *= -1;
        state.vy = BALL.kick * state.gravityDir;
        state.onGround = false;
        state.buffer = 0;
        events.push({ type: 'flip' });
      }
      state.vy = clamp(state.vy - BALL.gravity * state.gravityDir * dt, -BALL.maxSpeed, BALL.maxSpeed);
      break;
    case 'rocket':
      state.vy = clamp(state.vy + (held ? 1 : -1) * ROCKET.acceleration * dt, -ROCKET.maxSpeed, ROCKET.maxSpeed);
      break;
    case 'plane':
      if (state.buffer > 0) {
        state.vy = PLANE.flap;
        state.buffer = 0;
        events.push({ type: 'flap' });
      }
      state.vy = Math.max(state.vy - PLANE.gravity * dt, -PLANE.maxFall);
      break;
    default:
      break;
  }
}

/** Mueve en vertical y apoya al jugador en suelo, techo o bloques. Devuelve false si chocó de lleno. */
function resolveVertical(state, nearby) {
  const wasGrounded = state.onGround;
  state.onGround = false;
  const landOnTop = (top) => {
    state.y = top;
    if (state.vy < 0) state.vy = 0;
    if (state.gravityDir === 1) state.onGround = true;
  };
  const landOnBottom = (bottom) => {
    state.y = bottom - PLAYER_SIZE;
    if (state.vy > 0) state.vy = 0;
    if (state.gravityDir === -1) state.onGround = true;
  };

  if (state.y <= 0) landOnTop(0);
  if (state.mode !== 'cube' && state.y + PLAYER_SIZE >= CEILING_Y) landOnBottom(CEILING_Y);

  for (const object of nearby) {
    if (object.type !== 'block' || !rectsOverlap(playerBox(state), object)) continue;
    const top = object.y + object.h;
    if (top - state.y <= LANDING_TOLERANCE) landOnTop(top);
    else if (state.y + PLAYER_SIZE - object.y <= LANDING_TOLERANCE) landOnBottom(object.y);
    else return false;
  }
  state.landed = state.onGround && !wasGrounded;
  return true;
}

function touchesHazard(state, nearby) {
  const box = playerBox(state, HAZARD_INSET);
  return nearby.some((object) => {
    if (object.type === 'spike') return rectsOverlap(box, object.hit);
    if (object.type === 'saw') return circleTouchesRect(object.cx, object.cy, object.r * SAW_HIT_RATIO, box);
    return false;
  });
}

/**
 * Avanza la simulación un paso fijo. input = { held, pressed, turbo }.
 * Devuelve los eventos ocurridos (salto, moneda, portal, muerte, meta...) para sonidos y partículas.
 */
export function step(state, level, input, dt = STEP_SECONDS) {
  const events = [];
  if (state.dead || state.won) return events;
  if (input.pressed) state.buffer = INPUT_BUFFER_SECONDS;
  state.time += dt;

  state.x += level.speed * (input.turbo ? TURBO_FACTOR : 1) * dt;
  let nearby = nearbyObjects(level, state.x);
  if (hitsWall(state, nearby)) {
    state.dead = true;
    events.push({ type: 'death' });
    return events;
  }

  triggerObjects(state, nearby, events);
  applyModeForces(state, input.held, dt, events);
  state.y += state.vy * dt;
  nearby = nearbyObjects(level, state.x);

  if (!resolveVertical(state, nearby) || touchesHazard(state, nearby)) {
    state.dead = true;
    events.push({ type: 'death' });
    return events;
  }
  if (state.landed) events.push({ type: 'land' });

  if (state.x >= level.endX) {
    state.won = true;
    events.push({ type: 'win' });
  }
  state.buffer = Math.max(0, state.buffer - dt);
  return events;
}

/** ¿Hay algún peligro justo delante? Sirve para no dejar banderas de práctica en sitios imposibles. */
export function isSafeSpot(state, level, lookAhead = 3 * CELL) {
  const ahead = { x: state.x, y: state.y - CELL, w: PLAYER_SIZE + lookAhead, h: PLAYER_SIZE + CELL * 2 };
  return !level.objects.some((object) => {
    if (object.right < ahead.x || object.left > ahead.x + ahead.w) return false;
    if (object.type === 'spike') return rectsOverlap(ahead, object.hit);
    if (object.type === 'saw') return circleTouchesRect(object.cx, object.cy, object.r, ahead);
    if (object.type === 'block') return rectsOverlap({ ...ahead, y: state.y + LANDING_TOLERANCE, h: PLAYER_SIZE }, object);
    return false;
  });
}

export function progressOf(state, level) {
  return clamp(state.x / level.endX, 0, 1);
}
