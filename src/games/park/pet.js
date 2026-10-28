/**
 * Mascota que sigue a la jugadora (o a una amiga) por el parque: se queda un poco atrás, da saltitos
 * al andar y, si se queda muy lejos (un salto, un viaje), aparece otra vez a su lado.
 * Por ahora solo el unicornio bebé, que se abre con las 5 llaves secretas.
 */
import * as THREE from 'three';
import { at } from './kit.js';

const FOLLOW_DISTANCE = 1.6;
const MIN_SPEED = 4;
const CATCH_UP = 3;
const TELEPORT_DISTANCE = 15;

/** Unicornio bebé de bloques, mirando a +Z. */
function buildUnicorn(kit) {
  const pet = new THREE.Group();
  const body = new THREE.Group();
  body.add(at(kit.box(0.5, 0.42, 0.8, 0xffffff), 0, 0.55, 0));
  body.add(at(kit.box(0.4, 0.42, 0.42, 0xffffff), 0, 0.92, 0.42));
  body.add(at(kit.box(0.3, 0.22, 0.2, 0xffe0f0), 0, 0.84, 0.68));
  [-0.1, 0.1].forEach((x) => body.add(at(kit.box(0.06, 0.08, 0.02, 0x2b2140), x, 0.98, 0.64)));
  const horn = at(kit.cone(0.06, 0.32, 0xffd93d, 6, { emissive: 0x806a00 }), 0, 1.28, 0.5);
  horn.rotation.x = 0.3;
  body.add(horn);
  [0xff8ac4, 0xb57bff, 0x5ab0ff].forEach((color, index) => body.add(at(kit.box(0.1, 0.16, 0.14, color), 0, 1.06 - index * 0.12, 0.24 - index * 0.04)));
  body.add(at(kit.box(0.1, 0.34, 0.1, 0xff8ac4), 0, 0.6, -0.44));
  [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]].forEach(([x, z]) => body.add(at(kit.box(0.13, 0.36, 0.13, 0xffffff), x, 0.18, z)));
  pet.add(body);
  pet.add(at(kit.disc(0.4, 0x000000, { opacity: 0.18 }), 0, 0.03, 0));
  pet.userData.body = body;
  return pet;
}

const BUILDERS = { unicorn: buildUnicorn };

/** Crea la mascota de `kind` en la escena (null si no hay). Devuelve { update(delta, owner), remove() }. */
export function createPet(kit, scene, kind) {
  const build = BUILDERS[kind];
  if (!build) return null;
  const pet = build(kit);
  pet.visible = false;
  scene.add(pet);
  const position = new THREE.Vector3();
  let placed = false;
  let hop = 0;

  return {
    /** owner = { x, y, z, visible }. */
    update(delta, { x, y, z, visible }) {
      pet.visible = visible;
      if (!visible) {
        placed = false;
        return;
      }
      let dx = x - position.x;
      let dz = z - position.z;
      let distance = Math.hypot(dx, dz);
      if (!placed || distance > TELEPORT_DISTANCE) {
        position.set(x - 1.2, y, z + 1.2);
        placed = true;
        dx = x - position.x;
        dz = z - position.z;
        distance = Math.hypot(dx, dz);
      }
      const moving = distance > FOLLOW_DISTANCE;
      if (moving) {
        const step = Math.min(distance - FOLLOW_DISTANCE, delta * Math.max(MIN_SPEED, distance * CATCH_UP));
        position.x += (dx / distance) * step;
        position.z += (dz / distance) * step;
      }
      position.y += (y - position.y) * Math.min(1, delta * 8);
      hop += delta * (moving ? 12 : 3);
      pet.position.copy(position);
      pet.userData.body.position.y = Math.abs(Math.sin(hop)) * (moving ? 0.25 : 0.04);
      if (distance > 0.2) pet.rotation.y = Math.atan2(dx, dz);
    },
    remove() {
      scene.remove(pet);
    },
  };
}
