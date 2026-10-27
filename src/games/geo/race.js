/**
 * Modo carrera de Salto Geométrico: lo propio de este juego (configuración, apariencia y posición).
 * Todo lo que llega de otra tablet se valida aquí antes de usarse.
 */
import { getGameData } from '../../core/player.js';
import { GEO_LEVELS } from './levels.js';
import { MODES, SPEEDS, getSpeed } from './physics.js';

export const RACE_GAME = 'geo';
const MAX_SKIN_ID_LENGTH = 24;
const MAX_COORDINATE = 1e6;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
const skinId = (value) => (typeof value === 'string' ? value.slice(0, MAX_SKIN_ID_LENGTH) : undefined);

export function parseGeoConfig(raw) {
  const levelIndex = raw?.levelIndex;
  const speedId = raw?.speedId;
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= GEO_LEVELS.length) return null;
  if (!Object.hasOwn(SPEEDS, speedId)) return null;
  return { levelIndex, speedId };
}

export function describeGeoConfig({ levelIndex, speedId }) {
  const level = GEO_LEVELS[levelIndex];
  const speed = getSpeed(speedId);
  return `${level.world.emoji} ${level.label} ${level.name} · ${speed.icon} ${speed.label}`;
}

export const geoRaceRoute = ({ levelIndex }) => `/geo/jugar?nivel=${levelIndex}&carrera=1`;

export const geoLook = () => ({ skin: getGameData('geo').skin });

/** resolveSkin cambia por la primera opción cualquier id desconocido. */
export function parseGeoLook(look) {
  const skin = look.skin && typeof look.skin === 'object' ? look.skin : {};
  return { skin: { shape: skinId(skin.shape), color: skinId(skin.color), trail: skinId(skin.trail), face: skinId(skin.face) } };
}

export function parseGeoPos(message) {
  const { x, y, angle, tilt } = message;
  if (![x, y, angle, tilt].every(isFiniteNumber)) return null;
  return {
    x: clampNumber(x, -MAX_COORDINATE, MAX_COORDINATE),
    y: clampNumber(y, -MAX_COORDINATE, MAX_COORDINATE),
    angle,
    tilt,
    mode: MODES.includes(message.mode) ? message.mode : 'cube',
    gravityDir: message.gravityDir === -1 ? -1 : 1,
    dead: message.dead === true,
  };
}
