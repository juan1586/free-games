/**
 * Comprueba que todos los niveles de Salto Geométrico se pueden pasar.
 * Un bot busca (búsqueda en haz) una secuencia de pulsaciones usando el mismo motor que el juego,
 * con decisiones cada 100 ms (ritmo humano), en cada velocidad y con/sin turbo mantenido.
 * También comprueba que cada moneda es alcanzable en velocidad normal.
 *
 * Uso: npm run check:levels            (todos)
 *      npm run check:levels -- 2-3     (solo un nivel)
 */
import { GEO_LEVELS } from '../src/games/geo/levels.js';
import { SPEEDS, STEP_SECONDS, cloneState, createState, loadLevel, step } from '../src/games/geo/physics.js';

const DECISION_SECONDS = 0.1;
const COIN_DECISION_SECONDS = 0.05;
const BEAM_WIDTH = 400;

/** Generador pseudoaleatorio con semilla para que los resultados sean repetibles. */
function createRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function stateKey(state, held, extra = '') {
  return [Math.round(state.y / 3), Math.round(state.vy / 40), state.mode, state.gravityDir, held, state.onGround, state.used.size, extra].join('|');
}

/**
 * Busca un recorrido hasta la meta. `prefer` ordena el haz (p. ej. priorizar tener una moneda).
 * Devuelve el estado ganador o null.
 */
function search(level, { decisionSeconds, turbo, mustHaveCoin = null, seed = 1 }) {
  const random = createRandom(seed);
  const substeps = Math.round(decisionSeconds / STEP_SECONDS);
  let beam = [{ state: createState(), held: false }];

  while (beam.length) {
    const next = new Map();
    for (const node of beam) {
      for (const held of [false, true]) {
        const state = cloneState(node.state);
        let pressed = held && !node.held;
        for (let i = 0; i < substeps && !state.dead && !state.won; i += 1) {
          step(state, level, { held, pressed, turbo }, STEP_SECONDS);
          pressed = false;
        }
        if (state.dead) continue;
        const hasCoin = mustHaveCoin === null || state.coins.has(mustHaveCoin);
        if (state.won) {
          if (hasCoin) return state;
          continue;
        }
        const key = stateKey(state, held, hasCoin);
        if (!next.has(key)) next.set(key, { state, held, hasCoin, order: random() });
      }
    }
    beam = [...next.values()].sort((a, b) => b.hasCoin - a.hasCoin || a.order - b.order).slice(0, BEAM_WIDTH);
  }
  return null;
}

const onlyLabel = process.argv[2];
const levels = GEO_LEVELS.filter((definition) => !onlyLabel || definition.label === onlyLabel);
let failures = 0;

for (const definition of levels) {
  const results = [];
  for (const speed of Object.values(SPEEDS)) {
    for (const turbo of [false, true]) {
      const level = loadLevel(definition, definition.world.speed * speed.factor);
      const passed = Boolean(search(level, { decisionSeconds: DECISION_SECONDS, turbo }));
      if (!passed) failures += 1;
      results.push(`${speed.icon}${turbo ? '+turbo' : ''}:${passed ? 'OK' : 'FALLA'}`);
    }
  }

  const normalLevel = loadLevel(definition, definition.world.speed);
  const coins = Array.from({ length: normalLevel.coinCount }, (_, index) =>
    Boolean(search(normalLevel, { decisionSeconds: COIN_DECISION_SECONDS, turbo: false, mustHaveCoin: index })),
  );
  failures += coins.filter((reachable) => !reachable).length;
  const coinText = coins.map((reachable) => (reachable ? '🪙' : '❌')).join('');

  console.log(`${definition.label} ${definition.name.padEnd(20)} ${results.join('  ')}  monedas:${coinText}`);
}

if (failures > 0) {
  console.error(`\n${failures} comprobación(es) fallaron.`);
  process.exit(1);
}
console.log('\nTodos los niveles se pueden pasar. ✅');
