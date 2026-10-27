/**
 * Parque con amigas (de 2 a 4, cada una en su tablet): lo propio de este juego sobre la conexión de
 * las carreras (core/race.js). Sin three.js. Todo lo que llega de otra tablet se valida aquí.
 */
import { getGameData } from '../../core/player.js';
import { MAX_PLAYERS, isPlayerId } from '../../core/race.js';
import { MAX_SEED } from '../../core/random.js';
import { outfitIds } from './outfits.js';
import { PARK_WORLDS, getRide } from './worlds.js';

export const PARK_GAME = 'park';
const MAX_ID_LENGTH = 24;
const MAX_COORDINATE = 90;
const MAX_HEIGHT = 40;
const MAX_SPEED = 20;
export const NET_MODES = ['walk', 'queue', 'ride', 'result'];

/**
 * Cosas que se pueden decir (siempre textos fijos: nunca se envía texto libre).
 * `emote: true` = tiene botón en pantalla.
 */
export const SAYINGS = {
  wave: { text: '👋 ¡Hola!', icon: '👋', label: 'Saludar', emote: true },
  follow: { text: '🏃 ¡Sígueme!', icon: '🏃', label: 'Sígueme', emote: true },
  laugh: { text: '😂 ¡Jajaja!', icon: '😂', label: 'Reír', emote: true },
  heart: { text: '❤️ ¡Te quiero!', icon: '❤️', label: 'Corazón', emote: true },
  dance: { text: '💃 ¡A bailar!', icon: '💃', label: 'Bailar', emote: true },
  scream: { text: '😱 ¡AAAAH!' },
  snitch: { text: '🚨 ¡Vigilante, se coló!' },
  fastpass: { text: '🎟️ ¡Pase rápido!' },
  ride: { text: '🎉 ¡Qué chévere!' },
  bean: { text: '🌟 ¡Un grano dorado!' },
  // Dentro de una atracción, para las amigas que van juntas.
  brave: { text: '⭐ ¡Valiente!' },
  early: { text: '🙈 ¡Muy pronto!' },
  photo: { text: '📸 ¡Lo tengo!' },
  yum: { text: '☕ ¡Un grano!' },
  oink: { text: '🐷 ¡Corre, cerdito!' },
  win: { text: '🏆 ¡Gané!' },
  milk: { text: '🥛 ¡Leche!' },
};
export const EMOTES = Object.keys(SAYINGS).filter((kind) => SAYINGS[kind].emote);

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
const shortId = (value) => (typeof value === 'string' ? value.slice(0, MAX_ID_LENGTH) : undefined);

export function parseParkConfig(raw) {
  const worldIndex = raw?.worldIndex;
  return Number.isInteger(worldIndex) && worldIndex >= 0 && worldIndex < PARK_WORLDS.length ? { worldIndex } : null;
}

export function describeParkConfig({ worldIndex }) {
  const world = PARK_WORLDS[worldIndex];
  return `${world.emoji} ${world.name} · ¡a pasear juntas!`;
}

export const parkFriendsRoute = ({ worldIndex }) => `/parque/jugar?mundo=${worldIndex}&amigos=1`;

export const parkLook = () => ({ outfit: outfitIds(getGameData('park')) });

/** outfitFromIds cambia por lo básico cualquier id desconocido. */
export function parseParkLook(look) {
  const outfit = look.outfit && typeof look.outfit === 'object' ? look.outfit : {};
  return {
    outfit: {
      skin: shortId(outfit.skin),
      shirt: shortId(outfit.shirt),
      pants: shortId(outfit.pants),
      hat: shortId(outfit.hat),
      extra: shortId(outfit.extra),
    },
  };
}

/** Posición que manda cada amiga unas 10 veces por segundo. */
export function parseParkPos(message) {
  const { x, y, z, h, s } = message;
  if (![x, y, z, h, s].every(isFiniteNumber)) return null;
  return {
    x: clampNumber(x, -MAX_COORDINATE, MAX_COORDINATE),
    y: clampNumber(y, 0, MAX_HEIGHT),
    z: clampNumber(z, -MAX_COORDINATE, MAX_COORDINATE),
    heading: h % (Math.PI * 2),
    speed: clampNumber(s, 0, MAX_SPEED),
    airborne: message.a === true,
    mode: NET_MODES.includes(message.m) ? message.m : 'walk',
    rideId: getRide(message.r) ? message.r : '',
  };
}

/** Una amiga sube a una atracción y se lleva a las que estaban en su fila. Devuelve { rideId, seed, ids } o null. */
export function parseBoard(message) {
  const { ride, seed, ids } = message;
  if (!getRide(ride) || !Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) return null;
  if (!Array.isArray(ids) || !ids.length || ids.length >= MAX_PLAYERS || !ids.every(isPlayerId)) return null;
  return { rideId: ride, seed, ids };
}

/** Posición de una amiga dentro de una atracción (p. ej. su carro chocón). */
export function parseRideState(message) {
  const { x, z, h } = message;
  if (![x, z, h].every(isFiniteNumber) || !getRide(message.ride)) return null;
  return { rideId: message.ride, x: clampNumber(x, -20, 20), z: clampNumber(z, -20, 20), heading: h % (Math.PI * 2) };
}

/** Algo que dijo una amiga. Devuelve { kind, rideId } o null. */
export function parseSaying(message) {
  if (!Object.hasOwn(SAYINGS, message.kind)) return null;
  return { kind: message.kind, rideId: getRide(message.ride) ? message.ride : '' };
}
