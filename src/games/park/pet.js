/**
 * Mascota que sigue a la jugadora (o a una amiga) por el parque: se queda un poco atrás, da saltitos
 * al andar y, si se queda muy lejos (un salto, un viaje), aparece otra vez a su lado.
 * Las mascotas y sus retos están en `PETS` (outfits.js); aquí solo su figura y cómo se mueven.
 */
import * as THREE from 'three';
import { at } from './kit.js';

const FOLLOW_DISTANCE = 1.6;
const MIN_SPEED = 4;
const CATCH_UP = 3;
const TELEPORT_DISTANCE = 15;
/** Salto de alegría al recoger algo (`cheer`). */
const CHEER_SECONDS = 0.9;
const CHEER_HEIGHT = 0.9;

const EYE = 0x2b2140;

/**
 * Animal de cuatro patas de bloques, mirando a +Z (unicornio, perrito, gatito y dragón).
 * `ears`: 'pointy' | 'floppy' | 'none'; `mane`: colores de la crin; `horn`: cuerno dorado.
 */
function buildQuadruped(kit, { color, snout, ears = 'none', earColor = color, mane = [], horn = false, tail, tailUp = 0.6, spikes = null }) {
  const pet = new THREE.Group();
  const body = new THREE.Group();
  body.add(at(kit.box(0.5, 0.42, 0.8, color), 0, 0.55, 0));
  body.add(at(kit.box(0.4, 0.42, 0.42, color), 0, 0.92, 0.42));
  body.add(at(kit.box(0.3, 0.22, 0.2, snout), 0, 0.84, 0.68));
  [-0.1, 0.1].forEach((x) => body.add(at(kit.box(0.06, 0.08, 0.02, EYE), x, 0.98, 0.64)));
  body.add(at(kit.box(0.08, 0.06, 0.03, EYE), 0, 0.9, 0.79));
  if (ears === 'pointy') {
    [-0.13, 0.13].forEach((x) => body.add(at(kit.cone(0.08, 0.2, earColor, 4), x, 1.22, 0.38)));
  } else if (ears === 'floppy') {
    [-0.23, 0.23].forEach((x) => body.add(at(kit.box(0.08, 0.3, 0.18, earColor), x, 0.96, 0.38)));
  }
  if (horn) {
    const hornMesh = at(kit.cone(0.06, 0.32, 0xffd93d, 6, { emissive: 0x806a00 }), 0, 1.28, 0.5);
    hornMesh.rotation.x = 0.3;
    body.add(hornMesh);
  }
  mane.forEach((maneColor, index) => body.add(at(kit.box(0.1, 0.16, 0.14, maneColor), 0, 1.06 - index * 0.12, 0.24 - index * 0.04)));
  if (spikes) [0.25, 0, -0.25].forEach((z) => body.add(at(kit.cone(0.07, 0.18, spikes, 4), 0, 0.84, z)));
  const tailMesh = at(kit.box(0.1, 0.34, 0.1, tail ?? color), 0, 0.6, -0.44);
  tailMesh.rotation.x = -tailUp;
  body.add(tailMesh);
  [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]].forEach(([x, z]) => body.add(at(kit.box(0.13, 0.36, 0.13, color), x, 0.18, z)));
  pet.add(body);
  pet.add(at(kit.disc(0.4, 0x000000, { opacity: 0.18 }), 0, 0.03, 0));
  pet.userData.body = body;
  pet.userData.tail = tailMesh;
  return pet;
}

/** Pollito redondo con pico y alitas. */
function buildChick(kit) {
  const pet = new THREE.Group();
  const body = new THREE.Group();
  const yellow = 0xffe14d;
  body.add(at(kit.sphere(0.32, yellow, 12), 0, 0.45, 0));
  body.add(at(kit.sphere(0.22, yellow, 12), 0, 0.85, 0.08));
  const beak = at(kit.cone(0.07, 0.16, 0xff9f1c, 6), 0, 0.82, 0.32);
  beak.rotation.x = Math.PI / 2;
  body.add(beak);
  [-0.08, 0.08].forEach((x) => body.add(at(kit.box(0.05, 0.07, 0.02, EYE), x, 0.9, 0.27)));
  body.add(at(kit.box(0.04, 0.12, 0.04, 0xffb84d), 0, 1.1, 0.06));
  [-0.32, 0.32].forEach((x) => body.add(at(kit.box(0.06, 0.18, 0.26, 0xffd21f), x, 0.48, -0.02)));
  [-0.1, 0.1].forEach((x) => body.add(at(kit.box(0.05, 0.16, 0.05, 0xff9f1c), x, 0.08, 0)));
  pet.add(body);
  pet.add(at(kit.disc(0.32, 0x000000, { opacity: 0.18 }), 0, 0.03, 0));
  pet.userData.body = body;
  return pet;
}

/** Dragón bebé verde con alas que aletean; flota un poco sobre el suelo. */
function buildDragon(kit) {
  const pet = buildQuadruped(kit, { color: 0x4dc76a, snout: 0x9be8a8, ears: 'pointy', earColor: 0xffd93d, tail: 0x3aa457, tailUp: 0.2, spikes: 0xff8a3d });
  const wings = [-1, 1].map((side) => {
    const pivot = at(new THREE.Group(), side * 0.25, 0.78, -0.05);
    pivot.add(at(kit.box(0.5, 0.04, 0.36, 0xb98cff, { emissive: 0x2a1450 }), side * 0.25, 0, 0));
    pet.userData.body.add(pivot);
    return { pivot, side };
  });
  pet.userData.wings = wings;
  pet.userData.hover = 0.45;
  return pet;
}

const BUILDERS = {
  unicorn: (kit) => buildQuadruped(kit, { color: 0xffffff, snout: 0xffe0f0, mane: [0xff8ac4, 0xb57bff, 0x5ab0ff], horn: true, tail: 0xff8ac4, tailUp: 0 }),
  dog: (kit) => buildQuadruped(kit, { color: 0xd4955a, snout: 0xf3dcb8, ears: 'floppy', earColor: 0x7a4a24, tailUp: 0.9 }),
  cat: (kit) => buildQuadruped(kit, { color: 0xa7adc2, snout: 0xffe3ec, ears: 'pointy', earColor: 0xff9fc4, tail: 0x8a90a6, tailUp: 1.1 }),
  chick: buildChick,
  dragon: buildDragon,
};

/** Crea la mascota de `kind` en la escena (null si no hay). Devuelve { update(delta, owner), cheer(), remove() }. */
export function createPet(kit, scene, kind) {
  const build = BUILDERS[kind];
  if (!build) return null;
  const pet = build(kit);
  const { body, tail, wings, hover = 0 } = pet.userData;
  pet.visible = false;
  scene.add(pet);
  const position = new THREE.Vector3();
  let placed = false;
  let hop = 0;
  let cheer = 0;

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
      let lift = hover + Math.abs(Math.sin(hop)) * (moving ? 0.25 : 0.04);
      // Salto de alegría: sube, da una vuelta y baja.
      if (cheer > 0) {
        cheer = Math.max(0, cheer - delta);
        const t = 1 - cheer / CHEER_SECONDS;
        lift += Math.sin(t * Math.PI) * CHEER_HEIGHT;
        body.rotation.y = t * Math.PI * 2;
      } else {
        body.rotation.y = 0;
      }
      body.position.y = lift;
      if (tail) tail.rotation.z = Math.sin(hop * 1.5) * 0.4;
      wings?.forEach(({ pivot, side }) => (pivot.rotation.z = side * Math.sin(hop * 2.2) * 0.6));
      if (distance > 0.2) pet.rotation.y = Math.atan2(dx, dz);
    },
    cheer() {
      cheer = CHEER_SECONDS;
    },
    remove() {
      scene.remove(pet);
    },
  };
}
