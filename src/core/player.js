import { loadState, saveState } from './storage.js';

export const MAX_NAME_LENGTH = 12;

export const AVATARS = ['🦄', '🐱', '🐶', '🦊', '🐼', '🐸', '🐵', '🦁', '🐰', '🐯', '🐧', '🐙'];

const DEFAULT_STATE = { players: [], activePlayerId: null, muted: false };

const createDefaultGames = () => ({
  dino: {
    bestScore: 0,
    coins: 0,
    unlockedWorld: 0,
    dinoType: 'trex',
    dinoName: '',
    racesPlayed: 0,
    raceWins: 0,
    owned: [],
    hat: 'none',
    trail: 'none',
    medals: {},
  },
  tetris: { bestScore: 0, bestLines: 0, unlockedWorld: 0, stars: {} },
  geo: {
    unlockedLevel: 0,
    levels: {},
    skin: { shape: 'cube', color: 'grape', trail: 'none', face: 'happy' },
    speed: 'normal',
    achievements: [],
    totalAttempts: 0,
    totalJumps: 0,
    skinChanges: 0,
    racesPlayed: 0,
    raceWins: 0,
  },
  park: {
    coins: 0,
    welcomed: false,
    outfit: { skin: 'skin-2', shirt: 'shirt-pink', pants: 'pants-jeans', hat: 'none', extra: 'none' },
    owned: [],
    ridesDone: {},
    totalRides: 0,
    fastPasses: 0,
    snitches: 0,
    goldenBeans: [],
    missions: { day: '', list: [] },
    missionsDone: 0,
    friendVisits: 0,
  },
  album: { stickers: [], fresh: [], lastChest: '', chestsOpened: 0 },
});

let state = loadState(DEFAULT_STATE);
const listeners = new Set();

function persist() {
  saveState(state);
  listeners.forEach((listener) => listener(state));
}

function generateId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Número al azar de 4 cifras que distingue al jugador en las estadísticas sin revelar su nombre. */
function generateStatsId() {
  return 1000 + Math.floor(Math.random() * 9000);
}

export function sanitizeName(rawName) {
  return String(rawName ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function onPlayersChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlayers() {
  return state.players;
}

export function getActivePlayer() {
  return state.players.find((player) => player.id === state.activePlayerId) ?? null;
}

export function createPlayer(name, avatar) {
  const cleanName = sanitizeName(name);
  if (!cleanName) throw new Error('El nombre no puede estar vacío');
  const player = {
    id: generateId(),
    statsId: generateStatsId(),
    name: cleanName,
    avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
    games: createDefaultGames(),
  };
  state.players.push(player);
  state.activePlayerId = player.id;
  persist();
  return player;
}

/** Número del jugador activo para las estadísticas (los perfiles antiguos lo reciben al vuelo). */
export function getStatsId() {
  const player = getActivePlayer();
  if (!player) return null;
  if (!player.statsId) {
    player.statsId = generateStatsId();
    persist();
  }
  return player.statsId;
}

export function editPlayer(id, { name, avatar }) {
  const player = state.players.find((candidate) => candidate.id === id);
  if (!player) return;
  const cleanName = sanitizeName(name);
  if (cleanName) player.name = cleanName;
  if (AVATARS.includes(avatar)) player.avatar = avatar;
  persist();
}

export function deletePlayer(id) {
  state.players = state.players.filter((player) => player.id !== id);
  if (state.activePlayerId === id) state.activePlayerId = state.players[0]?.id ?? null;
  persist();
}

export function setActivePlayer(id) {
  if (!state.players.some((player) => player.id === id)) return;
  state.activePlayerId = id;
  persist();
}

export function getGameData(gameKey) {
  const player = getActivePlayer();
  const defaults = createDefaultGames()[gameKey];
  if (!player) return defaults;
  player.games ??= {};
  player.games[gameKey] = { ...defaults, ...player.games[gameKey] };
  return player.games[gameKey];
}

export function updateGameData(gameKey, changes) {
  const player = getActivePlayer();
  if (!player) return;
  player.games[gameKey] = { ...getGameData(gameKey), ...changes };
  persist();
}

export function isMuted() {
  return Boolean(state.muted);
}

export function setMuted(muted) {
  state.muted = Boolean(muted);
  persist();
}
