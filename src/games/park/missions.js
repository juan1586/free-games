/**
 * Misiones del día del parque: 3 al día, iguales para todo el día (salen de una semilla con la fecha).
 * Se guardan en `park.missions` = { day, list: [{ id, progress, done }] }. Sin DOM ni three.js.
 */
import { localDay } from '../../core/date.js';
import { createRandom } from '../../core/random.js';
import { GOLDEN_BEANS, RIDES } from './worlds.js';

export const MISSIONS_PER_DAY = 3;
export const MISSION_COINS = 15;
/** Premio extra al completar las 3 del día. */
export const ALL_MISSIONS_BONUS = 25;

const mission = (id, icon, text, event, goal, available) => ({ id, icon, text, event, goal, available });

export const MISSION_POOL = [
  mission('rides-2', '🎢', 'Monta 2 atracciones', 'ride', 2),
  mission('rides-4', '🎠', 'Monta 4 atracciones', 'ride', 4),
  mission('coins-25', '🪙', 'Recoge 25 monedas del suelo', 'coin', 25),
  mission('fastpass', '🎟️', 'Usa un pase rápido', 'fastpass', 1),
  mission('snitch', '🚨', 'Avísale al vigilante de alguien que se cuela', 'snitch', 1),
  mission('jumps-30', '🦘', 'Salta 30 veces', 'jump', 30),
  mission('queue-2', '⏳', 'Haz la fila completa 2 veces', 'queue', 2),
  mission('bean', '🌟', 'Encuentra un grano de café dorado', 'bean', 1, (data) => data.goldenBeans.length < GOLDEN_BEANS.length),
  ...RIDES.map((ride) => mission(`ride-${ride.id}`, ride.emoji, `Monta en ${ride.name}`, `ride-${ride.id}`, 1)),
];

const getMission = (id) => MISSION_POOL.find((item) => item.id === id);

function seedFromDay(day) {
  return [...day].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 7);
}

/** Misiones de hoy (las crea si es otro día). No guarda: quien llame decide cuándo. */
export function todaysMissions(data) {
  const day = localDay();
  if (data.missions?.day === day && Array.isArray(data.missions.list)) return data.missions;
  const random = createRandom(seedFromDay(day));
  const pool = MISSION_POOL.filter((item) => !item.available || item.available(data));
  const picked = [];
  while (picked.length < MISSIONS_PER_DAY && pool.length) {
    const [item] = pool.splice(Math.floor(random() * pool.length), 1);
    // Como mucho una misión de «monta en X» por día, para que haya variedad.
    if (item.id.startsWith('ride-') && picked.some((other) => other.id.startsWith('ride-'))) continue;
    picked.push(item);
  }
  return { day, list: picked.map((item) => ({ id: item.id, progress: 0, done: false })) };
}

/** Lista para mostrar: une lo guardado con la definición de cada misión. */
export function describeMissions(missions) {
  return missions.list.map((entry) => ({ ...getMission(entry.id), ...entry })).filter((entry) => entry.text);
}

/**
 * Suma progreso a las misiones de hoy que escuchan `event`.
 * Devuelve { missions, changed, completed: [misiones recién terminadas], allDone: si con esto se completaron las 3 }.
 */
export function recordMission(data, event, amount = 1) {
  const missions = todaysMissions(data);
  const completed = [];
  let changed = missions !== data.missions;
  const list = missions.list.map((entry) => {
    const definition = getMission(entry.id);
    if (!definition || entry.done || definition.event !== event) return entry;
    changed = true;
    const progress = Math.min(definition.goal, entry.progress + amount);
    const done = progress >= definition.goal;
    if (done) completed.push(definition);
    return { ...entry, progress, done };
  });
  const allDone = completed.length > 0 && list.every((entry) => entry.done);
  return { missions: { day: missions.day, list }, changed, completed, allDone };
}
