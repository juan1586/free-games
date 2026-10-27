/**
 * Filas de las atracciones, sin DOM ni three.js. Cada puesto es { kind: 'npc', npc } o { kind: 'player' }.
 * Cada `secondsPerPerson` sube a la atracción quien va primero.
 */

export const MAX_QUEUE = 8;
/** Distancia entre personas en la fila (m). */
export const QUEUE_SPACING = 1.35;

export function createQueue(ride) {
  return { ride, people: [], timer: ride.secondsPerPerson };
}

export const isFull = (queue) => queue.people.length >= MAX_QUEUE;

export function joinQueue(queue, entry) {
  queue.people.push(entry);
}

export function leaveQueue(queue, entry) {
  queue.people = queue.people.filter((other) => other !== entry);
}

/** Mete a alguien justo delante de `target` (el que se cuela). */
export function cutInFront(queue, entry, target) {
  const index = queue.people.indexOf(target);
  queue.people.splice(Math.max(0, index), 0, entry);
}

export const playerIndex = (queue) => queue.people.findIndex((entry) => entry.kind === 'player');

/** Segundos que le faltan a quien está en `index` para subir. */
export const waitSeconds = (queue, index) => index * queue.ride.secondsPerPerson + queue.timer;

/** Avanza el reloj de la fila. Devuelve quien sube a la atracción (o null). */
export function stepQueue(queue, delta) {
  if (!queue.people.length) {
    queue.timer = queue.ride.secondsPerPerson;
    return null;
  }
  queue.timer -= delta;
  if (queue.timer > 0) return null;
  queue.timer = queue.ride.secondsPerPerson;
  return queue.people.shift();
}

/** Posición (x, z) del puesto `index` de la fila. */
export function slotPosition(ride, index) {
  return {
    x: ride.entrance.x + ride.queueDir.x * index * QUEUE_SPACING,
    z: ride.entrance.z + ride.queueDir.z * index * QUEUE_SPACING,
  };
}
