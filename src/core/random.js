/**
 * Generador pseudoaleatorio con semilla (mulberry32): con la misma semilla da la misma secuencia
 * en todas las tablets, así una carrera tiene la misma pista para todos.
 * Devuelve una función que da números en [0, 1), como Math.random.
 */
export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_SEED = 2 ** 31 - 1;

export const randomSeed = () => Math.floor(Math.random() * MAX_SEED);
