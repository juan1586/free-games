/**
 * Mundos del Dino. Cada uno define paleta, fondo, obstáculos, velocidad y la distancia
 * (en metros) que hay que recorrer para desbloquear el siguiente.
 */
export const DINO_WORLDS = [
  {
    id: 'desert',
    name: 'Desierto',
    emoji: '🏜️',
    goal: 400,
    speed: { start: 330, max: 560 },
    flyersFrom: 150,
    palette: {
      skyTop: '#7fd3ff',
      skyBottom: '#ffe7a8',
      far: '#ffc98a',
      near: '#f7a964',
      ground: '#f2b264',
      groundDetail: '#d98b3f',
      obstacle: '#3fb27f',
      obstacleDetail: '#2a8a5f',
      flyer: '#8b5cf6',
      sun: '#ffd93d',
    },
    ground: ['cactus', 'cactusTall', 'cactusDouble'],
    flyer: 'bird',
    particles: null,
  },
  {
    id: 'jungle',
    name: 'Selva',
    emoji: '🌴',
    goal: 600,
    speed: { start: 360, max: 600 },
    flyersFrom: 80,
    palette: {
      skyTop: '#6fe3c1',
      skyBottom: '#d9ffe9',
      far: '#38b77c',
      near: '#21935f',
      ground: '#7a5230',
      groundDetail: '#5b3a1f',
      obstacle: '#8b5a2b',
      obstacleDetail: '#5f3a17',
      flyer: '#ff5f5f',
      sun: '#fff27a',
    },
    ground: ['log', 'rock', 'bush'],
    flyer: 'parrot',
    particles: 'leaves',
  },
  {
    id: 'snow',
    name: 'Nieve',
    emoji: '❄️',
    goal: 800,
    speed: { start: 390, max: 640 },
    flyersFrom: 60,
    palette: {
      skyTop: '#9ec9ff',
      skyBottom: '#eef6ff',
      far: '#d6e6ff',
      near: '#b8d2f5',
      ground: '#ffffff',
      groundDetail: '#cfe0f7',
      obstacle: '#ffffff',
      obstacleDetail: '#7fb2ff',
      flyer: '#5ab0ff',
      sun: '#fff8d6',
    },
    ground: ['snowman', 'iceSpike', 'iceSpikeDouble'],
    flyer: 'bird',
    particles: 'snow',
  },
  {
    id: 'volcano',
    name: 'Volcán',
    emoji: '🌋',
    goal: 1000,
    speed: { start: 420, max: 680 },
    flyersFrom: 40,
    palette: {
      skyTop: '#ff8a5c',
      skyBottom: '#ffd2a1',
      far: '#a8475a',
      near: '#7a2f45',
      ground: '#4a2b3a',
      groundDetail: '#ff7a3d',
      obstacle: '#3b2433',
      obstacleDetail: '#ff9d3d',
      flyer: '#ff5a1f',
      sun: '#ffe066',
    },
    ground: ['lavaRock', 'cone', 'rock'],
    flyer: 'fireball',
    particles: 'embers',
  },
  {
    id: 'space',
    name: 'Espacio',
    emoji: '🚀',
    goal: 1200,
    speed: { start: 450, max: 720 },
    flyersFrom: 30,
    alwaysNight: true,
    palette: {
      skyTop: '#1b1446',
      skyBottom: '#5a3fa8',
      far: '#3b2d7a',
      near: '#2a1f5c',
      ground: '#8f86c9',
      groundDetail: '#6b62a8',
      obstacle: '#4dd4ff',
      obstacleDetail: '#b57bff',
      flyer: '#7cffb2',
      sun: '#f5f0ff',
    },
    ground: ['crystal', 'crystalDouble', 'crater'],
    flyer: 'ufo',
    particles: 'stars',
  },
  // ---------- Mundos para expertos: más rápidos, huecos más cortos y obstáculos que se mueven ----------
  {
    id: 'sea',
    name: 'Fondo del Mar',
    emoji: '🐙',
    expert: true,
    goal: 1300,
    speed: { start: 470, max: 740 },
    flyersFrom: 30,
    gap: [0.95, 1.65],
    noClouds: true,
    specials: { kinds: ['jelly'], chance: 0.3 },
    palette: {
      skyTop: '#0b4f8a',
      skyBottom: '#35c6d9',
      far: '#1b7aa6',
      near: '#13658f',
      ground: '#f2d49b',
      groundDetail: '#d9b26a',
      obstacle: '#ff7a8a',
      obstacleDetail: '#e0475c',
      flyer: '#ffd93d',
      sun: '#bff6ff',
    },
    ground: ['coral', 'shell', 'coralDouble'],
    flyer: 'fish',
    particles: 'bubbles',
  },
  {
    id: 'candy',
    name: 'Ciudad Golosina',
    emoji: '🍭',
    expert: true,
    goal: 1400,
    speed: { start: 490, max: 760 },
    flyersFrom: 30,
    gap: [0.95, 1.6],
    doubleChance: 0.25,
    specials: { kinds: ['gumball'], chance: 0.22 },
    palette: {
      skyTop: '#ff9ed2',
      skyBottom: '#fff0b3',
      far: '#ffc4e1',
      near: '#c9a7ff',
      ground: '#ff8fc2',
      groundDetail: '#ffffff',
      obstacle: '#ff5fa2',
      obstacleDetail: '#ffffff',
      flyer: '#5ab0ff',
      sun: '#fff27a',
    },
    ground: ['lollipop', 'cupcake', 'candyCane'],
    flyer: 'candyFly',
    particles: 'sprinkles',
  },
  {
    id: 'clouds',
    name: 'Reino de las Nubes',
    emoji: '☁️',
    expert: true,
    goal: 1500,
    speed: { start: 510, max: 780 },
    flyersFrom: 30,
    gap: [0.95, 1.6],
    doubleChance: 0.15,
    specials: { kinds: ['pit'], chance: 0.3 },
    palette: {
      skyTop: '#8fd3ff',
      skyBottom: '#ffe1f4',
      far: '#ffffff',
      near: '#eaf4ff',
      ground: '#ffffff',
      groundDetail: '#c9e2ff',
      obstacle: '#7c87b8',
      obstacleDetail: '#ffd93d',
      flyer: '#ff9f43',
      sun: '#ffe066',
      pit: '#8fd3ff',
    },
    ground: ['stormCloud', 'tornado', 'stormCloud'],
    flyer: 'bird',
    particles: null,
  },
  {
    id: 'castle',
    name: 'Castillo Encantado',
    emoji: '👻',
    expert: true,
    goal: 1600,
    speed: { start: 530, max: 800 },
    flyersFrom: 20,
    alwaysNight: true,
    gap: [0.9, 1.55],
    flyerChance: 0.3,
    doubleChance: 0.2,
    specials: { kinds: ['ghost'], chance: 0.24 },
    palette: {
      skyTop: '#1d1240',
      skyBottom: '#6b3fa8',
      far: '#3a2470',
      near: '#2a1a55',
      ground: '#4a3a6b',
      groundDetail: '#7d6aa8',
      obstacle: '#ff9f43',
      obstacleDetail: '#3a2a12',
      flyer: '#2b2140',
      sun: '#fff6d6',
    },
    ground: ['pumpkin', 'candle', 'cauldron'],
    flyer: 'bat',
    particles: 'fireflies',
  },
  {
    id: 'escape',
    name: '¡Huida del Volcán!',
    emoji: '🔥',
    expert: true,
    boss: true,
    goal: 1800,
    speed: { start: 560, max: 840 },
    flyersFrom: 20,
    gap: [0.9, 1.5],
    flyerChance: 0.26,
    doubleChance: 0.2,
    chase: true,
    specials: { kinds: ['meteor', 'pit'], chance: 0.3 },
    palette: {
      skyTop: '#5a1530',
      skyBottom: '#ff7a3d',
      far: '#8a2a3a',
      near: '#5a1a2a',
      ground: '#3b2433',
      groundDetail: '#ff7a3d',
      obstacle: '#2b1a24',
      obstacleDetail: '#ff9d3d',
      flyer: '#ff5a1f',
      sun: '#ffe066',
      pit: '#ff5a1f',
    },
    ground: ['lavaRock', 'cone', 'rock'],
    flyer: 'fireball',
    particles: 'embers',
  },
];

/**
 * Movimiento de los obstáculos especiales. Depende solo de lo que ha recorrido el obstáculo
 * (`travel`, en píxeles), no del tiempo: así en carrera se mueve igual para todos.
 * bottom = distancia del borde inferior al suelo.
 */
export const OBSTACLE_MOTIONS = {
  // Sube y baja: hay que saltar, agacharse o pasar por debajo según el momento.
  jelly: { kind: 'bob', lift: 42, amplitude: 40, frequency: 0.011 },
  ghost: { kind: 'bob', lift: 40, amplitude: 36, frequency: 0.007, fade: true },
  bat: { kind: 'bob', amplitude: 14, frequency: 0.03 },
  // Bota sobre el suelo.
  gumball: { kind: 'bounce', amplitude: 62, frequency: 0.009 },
  // Cae del cielo (con su sombra de aviso) y se queda en el suelo, lejos todavía del dino.
  meteor: { kind: 'fall', distance: 260 },
};

/** Coloca el obstáculo según su movimiento. groundY = altura del suelo en pantalla. */
export function moveObstacle(obstacle, groundY) {
  const motion = OBSTACLE_MOTIONS[obstacle.kind];
  if (!motion) return;
  let bottom = obstacle.baseBottom;
  if (motion.kind === 'bob') {
    bottom += Math.sin(obstacle.travel * motion.frequency + obstacle.phase) * motion.amplitude;
  } else if (motion.kind === 'bounce') {
    bottom = groundY - Math.abs(Math.sin(obstacle.travel * motion.frequency + obstacle.phase)) * motion.amplitude;
  } else if (motion.kind === 'fall') {
    const progress = Math.min(1, obstacle.travel / motion.distance);
    bottom = groundY - (1 - progress * progress) * (groundY + 10);
  }
  obstacle.y = bottom - obstacle.h;
  if (motion.fade) obstacle.alpha = 0.55 + 0.45 * Math.abs(Math.sin(obstacle.travel * 0.012 + obstacle.phase));
}

/** Medallas de cada mundo. La de plata pide monedas según lo largo que es el mundo. */
export const MEDALS = [
  { id: 'bronze', icon: '🥉', name: 'Bronce', hint: (world) => `Llega a ${world.goal} m` },
  { id: 'silver', icon: '🥈', name: 'Plata', hint: (world) => `Llega a la meta con ${silverCoins(world)} 🪙` },
  { id: 'gold', icon: '🥇', name: 'Oro', hint: (world) => `Llega a ${world.goal * 2} m` },
];

export const silverCoins = (world) => Math.round(world.goal / 25);

/** Medallas que se ganan con lo recorrido y las monedas de la partida actual. */
export function medalsForRun(world, meters, coins) {
  const earned = [];
  if (meters >= world.goal) earned.push('bronze');
  if (meters >= world.goal && coins >= silverCoins(world)) earned.push('silver');
  if (meters >= world.goal * 2) earned.push('gold');
  return earned;
}

/**
 * Medallas guardadas de un mundo. Quien superó un mundo antes de que hubiera medallas
 * tiene ya la de bronce (lo sabemos porque el siguiente está desbloqueado).
 */
export function savedMedals(data, worldIndex) {
  const medals = data.medals[DINO_WORLDS[worldIndex].id] ?? [];
  return worldIndex < data.unlockedWorld && !medals.includes('bronze') ? ['bronze', ...medals] : medals;
}

/** Tamaño de cada tipo de obstáculo (ancho, alto) en píxeles lógicos. */
export const OBSTACLE_SIZES = {
  cactus: [24, 42],
  cactusTall: [28, 58],
  cactusDouble: [50, 44],
  log: [54, 28],
  rock: [42, 30],
  bush: [40, 40],
  snowman: [32, 52],
  iceSpike: [24, 46],
  iceSpikeDouble: [46, 40],
  lavaRock: [44, 34],
  cone: [50, 44],
  crystal: [26, 50],
  crystalDouble: [48, 42],
  crater: [52, 26],
  bird: [44, 28],
  parrot: [44, 30],
  fireball: [38, 30],
  ufo: [50, 28],
  coral: [30, 48],
  coralDouble: [52, 44],
  shell: [40, 28],
  fish: [44, 28],
  jelly: [34, 42],
  lollipop: [28, 56],
  cupcake: [40, 38],
  candyCane: [26, 50],
  candyFly: [46, 26],
  gumball: [34, 34],
  stormCloud: [50, 36],
  tornado: [32, 54],
  pit: [92, 48],
  pumpkin: [42, 36],
  candle: [22, 48],
  cauldron: [46, 38],
  bat: [42, 26],
  ghost: [36, 42],
  meteor: [40, 40],
};

function cactusArm(ctx, x, y, w, h, flip) {
  ctx.fillRect(x, y, w, 6);
  ctx.fillRect(flip ? x : x + w - 6, y - h, 6, h);
}

function drawCactus(ctx, x, y, w, h, palette) {
  ctx.fillStyle = palette.obstacle;
  const trunkW = Math.min(14, w * 0.5);
  const trunkX = x + (w - trunkW) / 2;
  ctx.beginPath();
  ctx.roundRect(trunkX, y, trunkW, h, [trunkW / 2, trunkW / 2, 2, 2]);
  ctx.fill();
  cactusArm(ctx, x, y + h * 0.45, trunkX - x + 2, h * 0.25, true);
  cactusArm(ctx, trunkX + trunkW - 2, y + h * 0.35, x + w - trunkX - trunkW + 2, h * 0.2, false);
  ctx.fillStyle = palette.obstacleDetail;
  ctx.fillRect(trunkX + trunkW / 2 - 1, y + 6, 2, h - 10);
}

const OBSTACLE_PAINTERS = {
  cactus: drawCactus,
  cactusTall: drawCactus,
  cactusDouble(ctx, x, y, w, h, palette) {
    drawCactus(ctx, x, y + 8, w * 0.48, h - 8, palette);
    drawCactus(ctx, x + w * 0.52, y, w * 0.48, h, palette);
  },
  log(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = '#d9a066';
    ctx.beginPath();
    ctx.ellipse(x + w - h / 2, y + h / 2, h / 2 - 3, h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.obstacleDetail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w - h / 2, y + h / 2, h / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4dd47a';
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 2, 8, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  },
  rock(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.15, y + h * 0.3);
    ctx.lineTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.85, y + h * 0.25);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.4);
    ctx.lineTo(x + w * 0.5, y + 4);
    ctx.lineTo(x + w * 0.45, y + h * 0.5);
    ctx.fill();
  },
  bush(ctx, x, y, w, h) {
    ctx.fillStyle = '#2fae6a';
    [[0.3, 0.6, 0.32], [0.7, 0.6, 0.32], [0.5, 0.35, 0.36]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, w * r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillRect(x + w * 0.1, y + h * 0.6, w * 0.8, h * 0.4);
    ctx.fillStyle = '#ff6b9d';
    [[0.3, 0.4], [0.65, 0.3], [0.5, 0.7]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  snowman(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.strokeStyle = palette.obstacleDetail;
    ctx.lineWidth = 2;
    [[0.5, 0.74, 0.5], [0.5, 0.42, 0.36], [0.5, 0.16, 0.26]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, w * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.15);
    ctx.lineTo(x + w * 0.85, y + h * 0.18);
    ctx.lineTo(x + w * 0.5, y + h * 0.21);
    ctx.fill();
    ctx.fillStyle = '#2b2140';
    ctx.fillRect(x + w * 0.38, y + h * 0.1, 3, 3);
    ctx.fillStyle = '#ff5f5f';
    ctx.fillRect(x + w * 0.2, y + h * 0.27, w * 0.6, 4);
  },
  iceSpike(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w / 2, y + 6);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.fill();
  },
  iceSpikeDouble(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.iceSpike(ctx, x, y + 10, w * 0.5, h - 10, palette);
    OBSTACLE_PAINTERS.iceSpike(ctx, x + w * 0.45, y, w * 0.55, h, palette);
  },
  lavaRock(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.rock(ctx, x, y, w, h, { obstacleDetail: palette.obstacle });
    ctx.strokeStyle = palette.obstacleDetail;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w * 0.45, y + h * 0.5);
    ctx.lineTo(x + w * 0.6, y + h * 0.3);
    ctx.moveTo(x + w * 0.45, y + h * 0.5);
    ctx.lineTo(x + w * 0.7, y + h * 0.7);
    ctx.stroke();
  },
  cone(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.38, y + 6);
    ctx.lineTo(x + w * 0.62, y + 6);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 6, w * 0.13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + w * 0.45, y + 6, 4, h * 0.4);
  },
  crystal(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h * 0.3);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.lineTo(x, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.lineTo(x, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  crystalDouble(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.crystal(ctx, x, y + 12, w * 0.5, h - 12, { obstacle: palette.obstacleDetail });
    OBSTACLE_PAINTERS.crystal(ctx, x + w * 0.45, y, w * 0.55, h, palette);
  },
  crater(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.groundDetail;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, w / 2, h, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.arc(x + w * 0.3, y + h * 0.6, 4, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.45, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  bird(ctx, x, y, w, h, palette, frame) {
    const flap = Math.sin(frame * 0.3) * h * 0.45;
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.55, y + h * 0.5 - flap);
    ctx.lineTo(x + w * 0.65, y + h * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.2, y + h * 0.45, h * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, y + h * 0.42);
    ctx.lineTo(x - 4, y + h * 0.5);
    ctx.lineTo(x + w * 0.08, y + h * 0.54);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.18, y + h * 0.4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  },
  parrot(ctx, x, y, w, h, palette, frame) {
    OBSTACLE_PAINTERS.bird(ctx, x, y, w, h, palette, frame);
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(x + w * 0.75, y + h * 0.5, w * 0.25, 4);
    ctx.fillStyle = '#5ab0ff';
    ctx.fillRect(x + w * 0.75, y + h * 0.5 + 4, w * 0.22, 3);
  },
  fireball(ctx, x, y, w, h, palette, frame) {
    const wobble = Math.sin(frame * 0.5) * 3;
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.2 + wobble);
    ctx.lineTo(x + w * 0.4, y + h * 0.5);
    ctx.lineTo(x + w, y + h * 0.8 - wobble);
    ctx.fill();
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.arc(x + h / 2, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(x + h / 2 - 2, y + h / 2 - 2, h / 4, 0, Math.PI * 2);
    ctx.fill();
  },
  ufo(ctx, x, y, w, h, palette, frame) {
    ctx.fillStyle = 'rgba(200, 240, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.4, w * 0.22, h * 0.35, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.55, w / 2, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ['#ffd93d', '#ff5fa2', '#5ab0ff'].forEach((color, index) => {
      ctx.fillStyle = (Math.floor(frame / 8) + index) % 3 === 0 ? '#fff' : color;
      ctx.beginPath();
      ctx.arc(x + w * (0.25 + index * 0.25), y + h * 0.58, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  // ---------- Fondo del Mar ----------
  coral(ctx, x, y, w, h, palette) {
    ctx.strokeStyle = palette.obstacle;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h);
    ctx.lineTo(x + w / 2, y + 6);
    ctx.moveTo(x + w / 2, y + h * 0.6);
    ctx.lineTo(x + 4, y + h * 0.3);
    ctx.moveTo(x + w / 2, y + h * 0.45);
    ctx.lineTo(x + w - 4, y + h * 0.15);
    ctx.stroke();
    ctx.fillStyle = palette.obstacleDetail;
    [[0.5, 0.1], [0.12, 0.3], [0.88, 0.15]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.lineCap = 'butt';
  },
  coralDouble(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.coral(ctx, x, y + 10, w * 0.5, h - 10, { obstacle: '#ffb347', obstacleDetail: '#ff8a1f' });
    OBSTACLE_PAINTERS.coral(ctx, x + w * 0.45, y, w * 0.55, h, palette);
  },
  shell(ctx, x, y, w, h) {
    ctx.fillStyle = '#ffd6e5';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h);
    ctx.arc(x + w / 2, y + h, w / 2, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff8fb8';
    ctx.lineWidth = 2;
    [-0.6, -0.2, 0.2, 0.6].forEach((lean) => {
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h);
      ctx.lineTo(x + w / 2 + lean * w * 0.45, y + h * 0.15 + Math.abs(lean) * h * 0.4);
      ctx.stroke();
    });
  },
  fish(ctx, x, y, w, h, palette, frame) {
    const wag = Math.sin(frame * 0.4) * 5;
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.7, y + h / 2);
    ctx.lineTo(x + w, y + h * 0.15 + wag);
    ctx.lineTo(x + w, y + h * 0.85 + wag);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.4, y + h / 2, w * 0.38, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f43';
    ctx.fillRect(x + w * 0.38, y + h * 0.15, 5, h * 0.7);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.18, y + h * 0.42, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.arc(x + w * 0.17, y + h * 0.42, 1.8, 0, Math.PI * 2);
    ctx.fill();
  },
  jelly(ctx, x, y, w, h, palette, frame) {
    ctx.fillStyle = 'rgba(214, 140, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.4, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.lineTo(x, y + h * 0.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(214, 140, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [0.2, 0.4, 0.6, 0.8].forEach((cx, index) => {
      const wave = Math.sin(frame * 0.2 + index) * 4;
      ctx.beginPath();
      ctx.moveTo(x + w * cx, y + h * 0.5);
      ctx.quadraticCurveTo(x + w * cx + wave, y + h * 0.75, x + w * cx, y + h - 2);
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  // ---------- Ciudad Golosina ----------
  lollipop(ctx, x, y, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + w / 2 - 2.5, y + w * 0.8, 5, h - w * 0.8);
    const colors = ['#ff5fa2', '#ffd93d', '#4dd4ac', '#5ab0ff'];
    for (let ring = 0; ring < 4; ring += 1) {
      ctx.fillStyle = colors[ring];
      ctx.beginPath();
      ctx.arc(x + w / 2, y + w / 2, (w / 2) * (1 - ring * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  cupcake(ctx, x, y, w, h) {
    ctx.fillStyle = '#ffb3d9';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h * 0.5);
    ctx.lineTo(x + w - 4, y + h * 0.5);
    ctx.lineTo(x + w - 9, y + h);
    ctx.lineTo(x + 9, y + h);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(x + w * 0.3, y + h * 0.45, w * 0.22, 0, Math.PI * 2);
    ctx.arc(x + w * 0.7, y + h * 0.45, w * 0.22, 0, Math.PI * 2);
    ctx.arc(x + w * 0.5, y + h * 0.28, w * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5f5f';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  },
  candyCane(ctx, x, y, w, h) {
    ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + w - 6, y + h);
    ctx.lineTo(x + w - 6, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2 - 6, 0, Math.PI, true);
    ctx.stroke();
    ctx.strokeStyle = '#ff5f5f';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  },
  candyFly(ctx, x, y, w, h, palette, frame) {
    const twist = Math.sin(frame * 0.3) * 4;
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y + h / 2);
    ctx.lineTo(x, y + twist + 2);
    ctx.lineTo(x, y + h - twist - 2);
    ctx.moveTo(x + w * 0.75, y + h / 2);
    ctx.lineTo(x + w, y - twist + 2);
    ctx.lineTo(x + w, y + h + twist - 2);
    ctx.fill();
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.28, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x + w * 0.4, y + h * 0.2, 4, h * 0.6);
  },
  gumball(ctx, x, y, w, h, palette, frame) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-frame * 0.15);
    ctx.fillStyle = '#ff5f5f';
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(-w / 2, -3, w, 6);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.3, 5, 0, Math.PI * 2);
    ctx.fill();
  },
  // ---------- Reino de las Nubes ----------
  stormCloud(ctx, x, y, w, h, palette, frame) {
    ctx.fillStyle = palette.obstacle;
    [[0.3, 0.55, 0.3], [0.7, 0.55, 0.3], [0.5, 0.35, 0.34]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, w * r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillRect(x + w * 0.1, y + h * 0.55, w * 0.8, h * 0.45);
    if (Math.floor(frame / 10) % 3 === 0) {
      ctx.fillStyle = palette.obstacleDetail;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.55, y + h * 0.4);
      ctx.lineTo(x + w * 0.4, y + h * 0.7);
      ctx.lineTo(x + w * 0.52, y + h * 0.7);
      ctx.lineTo(x + w * 0.42, y + h);
      ctx.lineTo(x + w * 0.66, y + h * 0.6);
      ctx.lineTo(x + w * 0.54, y + h * 0.6);
      ctx.fill();
    }
  },
  tornado(ctx, x, y, w, h, palette, frame) {
    ctx.strokeStyle = palette.obstacle;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let ring = 0; ring < 5; ring += 1) {
      const ringY = y + 4 + ring * (h / 5);
      const ringW = w * (1 - ring * 0.16);
      const sway = Math.sin(frame * 0.2 + ring) * 3;
      ctx.beginPath();
      ctx.ellipse(x + w / 2 + sway, ringY, ringW / 2, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  },
  pit(ctx, x, y, w, h, palette) {
    const hole = ctx.createLinearGradient(0, y, 0, y + h);
    hole.addColorStop(0, palette.pit ?? '#2b2140');
    hole.addColorStop(1, palette.skyTop);
    ctx.fillStyle = hole;
    ctx.fillRect(x, y, w, h + 10);
    ctx.fillStyle = palette.groundDetail;
    ctx.fillRect(x - 3, y, 6, h + 10);
    ctx.fillRect(x + w - 3, y, 6, h + 10);
  },
  // ---------- Castillo Encantado ----------
  pumpkin(ctx, x, y, w, h) {
    ctx.fillStyle = '#ff9f43';
    [0.3, 0.7, 0.5].forEach((cx) => {
      ctx.beginPath();
      ctx.ellipse(x + w * cx, y + h * 0.6, w * 0.26, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#3fb27f';
    ctx.fillRect(x + w / 2 - 3, y, 6, h * 0.25);
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.38, y + h * 0.4);
    ctx.lineTo(x + w * 0.44, y + h * 0.5);
    ctx.moveTo(x + w * 0.56, y + h * 0.5);
    ctx.lineTo(x + w * 0.62, y + h * 0.4);
    ctx.lineTo(x + w * 0.7, y + h * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.65, w * 0.16, 0, Math.PI);
    ctx.fill();
  },
  candle(ctx, x, y, w, h, palette, frame) {
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 14, w - 6, h - 14, 3);
    ctx.fill();
    const flicker = Math.sin(frame * 0.6) * 2;
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 7, 5 + flicker * 0.3, 8 + flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff7a3d';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 9, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  cauldron(ctx, x, y, w, h, palette, frame) {
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.6, w / 2, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7cffb2';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.3, w * 0.42, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    [0.3, 0.6].forEach((cx, index) => {
      const rise = (frame * 0.6 + index * 9) % 14;
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * 0.25 - rise, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  bat(ctx, x, y, w, h, palette, frame) {
    const flap = Math.sin(frame * 0.6) * h * 0.4;
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h / 2);
    ctx.lineTo(x, y + h / 2 - flap);
    ctx.lineTo(x + w * 0.2, y + h * 0.7);
    ctx.lineTo(x + w / 2, y + h * 0.6);
    ctx.lineTo(x + w * 0.8, y + h * 0.7);
    ctx.lineTo(x + w, y + h / 2 - flap);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(x + w / 2 - 5, y + h * 0.42, 3, 3);
    ctx.fillRect(x + w / 2 + 2, y + h * 0.42, 3, 3);
  },
  ghost(ctx, x, y, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    for (let wave = 0; wave < 4; wave += 1) {
      ctx.lineTo(x + w - (wave + 0.5) * (w / 4), y + h - 7);
      ctx.lineTo(x + w - (wave + 1) * (w / 4), y + h);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.38, 3.5, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.38, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.58, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  // ---------- ¡Huida del Volcán! ----------
  meteor(ctx, x, y, w, h, palette, frame) {
    const flicker = Math.sin(frame * 0.7) * 4;
    ctx.fillStyle = 'rgba(255, 160, 40, 0.75)';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h * 0.4);
    ctx.lineTo(x + w * 0.7, y - 30 - flicker);
    ctx.lineTo(x + w - 4, y + h * 0.4);
    ctx.fill();
    ctx.fillStyle = '#5a2a1a';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9d3d';
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.4, 5, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.65, 4, 0, Math.PI * 2);
    ctx.fill();
  },
};

export function drawObstacle(ctx, kind, x, y, palette, frame) {
  const [w, h] = OBSTACLE_SIZES[kind];
  OBSTACLE_PAINTERS[kind](ctx, x, y, w, h, palette, frame);
}
