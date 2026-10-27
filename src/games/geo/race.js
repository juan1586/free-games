/**
 * Mensajes del modo carrera de Salto Geométrico. Todo lo que llega de la otra tablet
 * se valida aquí antes de usarse (nombres, números, ids), porque viene de fuera.
 */
import { AVATARS, getActivePlayer, getGameData, sanitizeName } from '../../core/player.js';
import { GEO_LEVELS } from './levels.js';
import { MODES, SPEEDS } from './physics.js';

export const RACE_GAME = 'geo';
const MAX_SKIN_ID_LENGTH = 24;
const MAX_COORDINATE = 1e6;
const MAX_RACE_MS = 60 * 60 * 1000;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
const skinId = (value) => (typeof value === 'string' ? value.slice(0, MAX_SKIN_ID_LENGTH) : undefined);

function parseRaceConfig(message) {
  const { levelIndex, speedId } = message;
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= GEO_LEVELS.length) return null;
  if (!Object.hasOwn(SPEEDS, speedId)) return null;
  return { type: message.type, levelIndex, speedId };
}

const PARSERS = {
  hello(message) {
    const skin = message.skin && typeof message.skin === 'object' ? message.skin : {};
    return {
      type: 'hello',
      name: sanitizeName(message.name) || 'Amiga',
      avatar: AVATARS.includes(message.avatar) ? message.avatar : AVATARS[0],
      // resolveSkin cambia por la primera opción cualquier id desconocido.
      skin: { shape: skinId(skin.shape), color: skinId(skin.color), trail: skinId(skin.trail), face: skinId(skin.face) },
    };
  },
  room: parseRaceConfig,
  start: parseRaceConfig,
  pos(message) {
    const { x, y, angle, tilt } = message;
    if (![x, y, angle, tilt].every(isFiniteNumber)) return null;
    return {
      type: 'pos',
      x: clampNumber(x, -MAX_COORDINATE, MAX_COORDINATE),
      y: clampNumber(y, -MAX_COORDINATE, MAX_COORDINATE),
      angle,
      tilt,
      mode: MODES.includes(message.mode) ? message.mode : 'cube',
      gravityDir: message.gravityDir === -1 ? -1 : 1,
      dead: message.dead === true,
    };
  },
  finish(message) {
    if (!isFiniteNumber(message.ms) || message.ms < 0 || message.ms > MAX_RACE_MS) return null;
    return { type: 'finish', ms: message.ms };
  },
  result(message) {
    return ['host', 'guest', 'tie'].includes(message.winner) ? { type: 'result', winner: message.winner } : null;
  },
  ready: () => ({ type: 'ready' }),
  go: () => ({ type: 'go' }),
  rematch: () => ({ type: 'rematch' }),
};

/** Devuelve el mensaje limpio o null si no es válido. */
export function parseRaceMessage(raw) {
  const parse = Object.hasOwn(PARSERS, raw?.type) ? PARSERS[raw.type] : null;
  return parse ? parse(raw) : null;
}

/** Presentación de la jugadora activa para la otra tablet. */
export function createHello() {
  const player = getActivePlayer();
  return { type: 'hello', name: player?.name ?? 'Amiga', avatar: player?.avatar ?? AVATARS[0], skin: getGameData('geo').skin };
}
