/**
 * Modo carrera de Dino Corre: lo propio de este juego (configuración, apariencia y posición).
 * Todo lo que llega de otra tablet se valida aquí antes de usarse.
 */
import { getGameData, sanitizeName } from '../../core/player.js';
import { DINOS } from './dinos.js';
import { DINO_WORLDS } from './worlds.js';

export const RACE_GAME = 'dino';
const MAX_DISTANCE_PX = 1e7;
const MAX_HEIGHT = 1000;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

export function parseDinoConfig(raw) {
  const worldIndex = raw?.worldIndex;
  if (!Number.isInteger(worldIndex) || worldIndex < 0 || worldIndex >= DINO_WORLDS.length) return null;
  return { worldIndex };
}

export function describeDinoConfig({ worldIndex }) {
  const world = DINO_WORLDS[worldIndex];
  return `${world.emoji} ${world.name} · Meta: ${world.goal} m`;
}

export const dinoRaceRoute = ({ worldIndex }) => `/dino/jugar?mundo=${worldIndex}&carrera=1`;

export function dinoLook() {
  const data = getGameData('dino');
  return { dinoType: data.dinoType, dinoName: data.dinoName };
}

export function parseDinoLook(look) {
  return {
    dinoType: DINOS.some((dino) => dino.id === look.dinoType) ? look.dinoType : DINOS[0].id,
    dinoName: sanitizeName(look.dinoName),
  };
}

/** d: distancia recorrida en px; h: altura del salto; duck: agachado; hurt: tropezando. */
export function parseDinoPos(message) {
  const { d, h } = message;
  if (![d, h].every(isFiniteNumber)) return null;
  return {
    d: clampNumber(d, 0, MAX_DISTANCE_PX),
    h: clampNumber(h, 0, MAX_HEIGHT),
    duck: message.duck === true,
    hurt: message.hurt === true,
  };
}
