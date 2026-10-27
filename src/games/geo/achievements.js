import { GEO_LEVELS, MAIN_LEVELS } from './levels.js';

/** Estrellas que da cada reto cumplido (además de 1 por nivel y 1 por moneda). */
export const STARS_PER_ACHIEVEMENT = 2;

const levelProgress = (data, level) => data.levels[level.id] ?? {};
const completedLevels = (data) => GEO_LEVELS.filter((level) => levelProgress(data, level).completed);
const countCoins = (data, levels = GEO_LEVELS) =>
  levels.reduce((total, level) => total + (levelProgress(data, level).coins ?? []).filter(Boolean).length, 0);
const completedWithMode = (data, mode) => completedLevels(data).some((level) => level.modes.includes(mode));
const completedWithPortal = (data, portal) => completedLevels(data).some((level) => level.portals.has(portal));

/**
 * Retos. `check(data, context)` decide si ya se cumplió; context trae datos del intento
 * recién terminado (p. ej. { won, practice, attempts }).
 */
export const ACHIEVEMENTS = [
  { id: 'first-win', icon: '🎉', title: 'Primera meta', description: 'Termina tu primer nivel.', check: (data) => completedLevels(data).length > 0 },
  {
    id: 'practice',
    icon: '🚩',
    title: 'Practicar ayuda',
    description: 'Llega a la meta en modo práctica.',
    check: (data, context) => Boolean(context.won && context.practice),
  },
  {
    id: 'all-coins-level',
    icon: '🪙',
    title: 'Cazamonedas',
    description: 'Consigue las 3 monedas de un nivel.',
    check: (data) => GEO_LEVELS.some((level) => (levelProgress(data, level).coins ?? []).filter(Boolean).length === 3),
  },
  {
    id: 'quick',
    icon: '⚡',
    title: '¡A toda velocidad!',
    description: 'Termina un nivel en 3 intentos o menos.',
    check: (data, context) => Boolean(context.won && !context.practice && context.attempts <= 3),
  },
  { id: 'rocket', icon: '🚀', title: 'Piloto espacial', description: 'Termina un nivel con cohete.', check: (data) => completedWithMode(data, 'rocket') },
  { id: 'ball', icon: '🔵', title: 'Al revés', description: 'Termina un nivel con la pelota.', check: (data) => completedWithMode(data, 'ball') },
  { id: 'plane', icon: '✈️', title: 'Vuela alto', description: 'Termina un nivel con el avión.', check: (data) => completedWithMode(data, 'plane') },
  {
    id: 'light-speed',
    icon: '💨',
    title: 'Velocidad luz',
    description: 'Termina un nivel en velocidad Rápida.',
    check: (data, context) => Boolean(context.won && !context.practice && context.speed === 'fast'),
  },
  { id: 'stylist', icon: '🎨', title: 'A la moda', description: 'Cambia tu apariencia 3 veces.', check: (data) => data.skinChanges >= 3 },
  { id: 'jumper', icon: '🦘', title: 'Saltos sin parar', description: 'Salta 500 veces.', check: (data) => data.totalJumps >= 500 },
  { id: 'persistent', icon: '💪', title: 'Nunca me rindo', description: 'Haz 100 intentos.', check: (data) => data.totalAttempts >= 100 },
  { id: 'gravity', icon: '🙃', title: 'Patas arriba', description: 'Termina un nivel con la gravedad al revés.', check: (data) => completedWithPortal(data, 'flipUp') },
  { id: 'magnet', icon: '🧲', title: 'Superimán', description: 'Termina un nivel con el imán.', check: (data) => completedWithMode(data, 'magnet') },
  { id: 'wave', icon: '〰️', title: 'Onda expansiva', description: 'Termina un nivel con la onda.', check: (data) => completedWithMode(data, 'wave') },
  { id: 'supersonic', icon: '⏩', title: 'Supersónica', description: 'Termina un nivel con portal rápido.', check: (data) => completedWithPortal(data, 'fast') },
  {
    id: 'flawless',
    icon: '💎',
    title: 'Sin un rasguño',
    description: 'Termina un nivel de experto al primer intento.',
    check: (data, context) => Boolean(context.won && !context.practice && context.expert && context.attempts === 1),
  },
  {
    id: 'dragon',
    icon: '🐉',
    title: 'Domadora de dragones',
    description: 'Termina el nivel secreto.',
    check: (data) => completedLevels(data).some((level) => level.secret),
  },
  {
    id: 'boss',
    icon: '👑',
    title: 'Vencí al jefe',
    description: 'Termina «El Gran Jefe».',
    check: (data) => completedLevels(data).some((level) => level.boss),
  },
  { id: 'first-race', icon: '🏁', title: 'Primera carrera', description: 'Corre una carrera con amigos.', check: (data) => data.racesPlayed >= 1 },
  { id: 'race-win', icon: '🏆', title: 'Primera copa', description: 'Gana una carrera con amigos.', check: (data) => data.raceWins >= 1 },
  { id: 'race-wins-3', icon: '🥇', title: 'Tres copas', description: 'Gana 3 carreras con amigos.', check: (data) => data.raceWins >= 3 },
  {
    id: 'all-levels',
    icon: '🌈',
    title: 'Corona arcoíris',
    description: `Termina los ${MAIN_LEVELS.length} niveles.`,
    check: (data) => MAIN_LEVELS.every((level) => levelProgress(data, level).completed),
  },
  {
    id: 'all-coins',
    icon: '👑',
    title: 'Tesoro completo',
    description: `Consigue las ${MAIN_LEVELS.length * 3} monedas.`,
    check: (data) => countCoins(data, MAIN_LEVELS) === MAIN_LEVELS.length * 3,
  },
];

/** Monedas (de los niveles normales) que abren el nivel secreto. */
export const SECRET_COINS = 60;
export const countMainCoins = (data) => countCoins(data, MAIN_LEVELS);
export const isSecretUnlocked = (data) => countMainCoins(data) >= SECRET_COINS;

/** ¿Puede jugar este nivel? Los normales se abren en orden; el secreto, con monedas. */
export const canPlayLevel = (data, level) => (level.secret ? isSecretUnlocked(data) : level.index <= data.unlockedLevel);

/** Devuelve los retos que se acaban de cumplir (aún no guardados). */
export function findNewAchievements(data, context = {}) {
  return ACHIEVEMENTS.filter((achievement) => !data.achievements.includes(achievement.id) && achievement.check(data, context));
}

export function countStars(data) {
  return completedLevels(data).length + countCoins(data) + data.achievements.length * STARS_PER_ACHIEVEMENT;
}

export function countCompleted(data) {
  return completedLevels(data).length;
}

export const MAX_STARS = GEO_LEVELS.length * 4 + ACHIEVEMENTS.length * STARS_PER_ACHIEVEMENT;
