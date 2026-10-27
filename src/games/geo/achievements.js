import { GEO_LEVELS } from './levels.js';

/** Estrellas que da cada reto cumplido (además de 1 por nivel y 1 por moneda). */
export const STARS_PER_ACHIEVEMENT = 2;

const levelProgress = (data, level) => data.levels[level.id] ?? {};
const completedLevels = (data) => GEO_LEVELS.filter((level) => levelProgress(data, level).completed);
const countCoins = (data) =>
  GEO_LEVELS.reduce((total, level) => total + (levelProgress(data, level).coins ?? []).filter(Boolean).length, 0);
const completedWithMode = (data, mode) => completedLevels(data).some((level) => level.modes.includes(mode));

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
    title: '¡Rapidísima!',
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
  { id: 'jumper', icon: '🦘', title: 'Saltarina', description: 'Salta 500 veces.', check: (data) => data.totalJumps >= 500 },
  { id: 'persistent', icon: '💪', title: 'Nunca me rindo', description: 'Haz 100 intentos.', check: (data) => data.totalAttempts >= 100 },
  { id: 'first-race', icon: '🏁', title: 'Primera carrera', description: 'Corre una carrera con una amiga.', check: (data) => data.racesPlayed >= 1 },
  { id: 'race-win', icon: '🏆', title: 'Campeona', description: 'Gana una carrera con amiga.', check: (data) => data.raceWins >= 1 },
  { id: 'race-wins-3', icon: '🥇', title: 'Tres copas', description: 'Gana 3 carreras con amigas.', check: (data) => data.raceWins >= 3 },
  {
    id: 'all-levels',
    icon: '🌈',
    title: 'Campeona arcoíris',
    description: 'Termina los 15 niveles.',
    check: (data) => completedLevels(data).length === GEO_LEVELS.length,
  },
  {
    id: 'all-coins',
    icon: '👑',
    title: 'Tesoro completo',
    description: 'Consigue las 45 monedas.',
    check: (data) => countCoins(data) === GEO_LEVELS.length * 3,
  },
];

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
