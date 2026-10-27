/**
 * Choques sencillos en el parque, sin three.js: cajas alineadas a los ejes (con altura, se puede subir
 * encima si se salta) y círculos (troncos, postes…) que tapan de arriba abajo.
 * colliders = { boxes: [{ minX, maxX, minZ, maxZ, top }], circles: [{ x, z, r }] }
 */

/** Altura que se sube sin saltar (un bordillo). */
const STEP_UP = 0.35;

export function createColliders() {
  return { boxes: [], circles: [] };
}

export function addBox(colliders, { x, z, width, depth, top }) {
  colliders.boxes.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, top });
}

export function addCircle(colliders, { x, z, r }) {
  colliders.circles.push({ x, z, r });
}

/** Altura del suelo bajo (x, z) para alguien con los pies en `y` (las cajas más altas no cuentan). */
export function groundHeight(colliders, x, z, y) {
  let height = 0;
  for (const box of colliders.boxes) {
    if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
    if (box.top <= y + STEP_UP && box.top > height) height = box.top;
  }
  return height;
}

/** Empuja la posición fuera de lo que choca. Modifica `position` ({ x, y, z }). */
export function resolveCollisions(colliders, position, radius) {
  for (const box of colliders.boxes) {
    if (box.top <= position.y + STEP_UP) continue;
    const nearestX = Math.max(box.minX, Math.min(position.x, box.maxX));
    const nearestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));
    const dx = position.x - nearestX;
    const dz = position.z - nearestZ;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= radius * radius) continue;
    if (distanceSq > 1e-6) {
      const distance = Math.sqrt(distanceSq);
      position.x = nearestX + (dx / distance) * radius;
      position.z = nearestZ + (dz / distance) * radius;
    } else {
      // El centro quedó dentro de la caja: sale por el lado más cercano.
      const exits = [
        [box.minX - radius - position.x, 0],
        [box.maxX + radius - position.x, 0],
        [0, box.minZ - radius - position.z],
        [0, box.maxZ + radius - position.z],
      ];
      const [moveX, moveZ] = exits.reduce((best, exit) => (Math.abs(exit[0] + exit[1]) < Math.abs(best[0] + best[1]) ? exit : best));
      position.x += moveX;
      position.z += moveZ;
    }
  }
  for (const circle of colliders.circles) {
    const dx = position.x - circle.x;
    const dz = position.z - circle.z;
    const minDistance = circle.r + radius;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= minDistance * minDistance) continue;
    const distance = Math.sqrt(distanceSq) || 1e-3;
    position.x = circle.x + (dx / distance) * minDistance;
    position.z = circle.z + (dz / distance) * minDistance;
  }
}

/** ¿Hay algo en (x, z) a ras de suelo? Sirve para no poner monedas dentro de las cosas. */
export function isBlocked(colliders, x, z, margin = 0.8) {
  return (
    colliders.boxes.some((box) => x > box.minX - margin && x < box.maxX + margin && z > box.minZ - margin && z < box.maxZ + margin) ||
    colliders.circles.some((circle) => (x - circle.x) ** 2 + (z - circle.z) ** 2 < (circle.r + margin) ** 2)
  );
}
