/**
 * Objetos de la Playa de Cartagena que salen en el parque y en sus atracciones: el galeón pirata,
 * la lancha, palmeras, barriles, cofres y los animales del mar.
 */
import * as THREE from 'three';
import { at } from './kit.js';

export const SEA_COLOR = 0x2f9fe0;
export const SAND_COLOR = 0xf3dca2;

/**
 * Galeón pirata. Mira hacia +Z; mide unos 4 × 12 m y la cubierta queda en y = 2.
 * `sails` y `flag` cambian los colores (los barcos enemigos llevan velas oscuras). Sin `foresails`, el
 * mástil de proa va sin velas (para que no tapen la vista desde el cañón).
 */
export function buildGalleon(kit, { hull = 0x8a5a2b, sails = 0xfff8e7, flag = 0x2b2140, foresails = true } = {}) {
  const ship = new THREE.Group();
  ship.add(at(kit.box(4, 2, 9, hull), 0, 1, 0));
  ship.add(at(kit.box(4.06, 0.25, 9.06, 0xffd166), 0, 1.6, 0));
  // Proa en punta y castillo de popa.
  const bow = at(kit.cone(2, 3, hull, 4), 0, 1.1, 5.9);
  bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  bow.scale.set(1, 1, 0.55);
  ship.add(bow);
  ship.add(at(kit.box(4, 1.6, 2.6, 0x6b3b1f), 0, 2.8, -3.2));
  ship.add(at(kit.box(4.1, 0.2, 2.7, 0xffd166), 0, 3.65, -3.2));
  [-1, 0, 1].forEach((x) => ship.add(at(kit.box(0.5, 0.5, 0.05, 0xfff2a8, { emissive: 0x554400 }), x * 1.2, 2.9, -4.53)));
  // Cañones a los lados.
  [-1, 1].forEach((side) => {
    [-1.5, 0.5, 2.5].forEach((z) => {
      const cannon = at(kit.cyl(0.18, 0.22, 0.9, 0x222222, 8), side * 2.2, 1.25, z);
      cannon.rotation.z = Math.PI / 2;
      ship.add(cannon);
    });
  });
  // Dos mástiles con velas y la bandera arriba.
  [2, -0.8].forEach((z, index) => {
    const height = index === 0 ? 8 : 9.5;
    ship.add(at(kit.cyl(0.14, 0.18, height, 0x6b3b1f, 8), 0, 2 + height / 2, z));
    if (index === 0 && !foresails) return;
    ship.add(at(kit.box(3.6, 2.4, 0.12, sails), 0, 4.6 + index * 0.4, z + 0.12));
    ship.add(at(kit.box(2.8, 1.9, 0.12, sails), 0, 7.2 + index * 0.8, z + 0.12));
    ship.add(at(kit.box(3.8, 0.12, 0.12, 0x6b3b1f), 0, 3.4 + index * 0.4, z));
  });
  ship.add(at(kit.box(1.4, 0.9, 0.05, flag), 0.7, 11.1, -0.8));
  ship.add(at(kit.sphere(0.2, 0xffffff, 8), 0.7, 11.1, -0.76));
  return ship;
}

/** Lancha blanca con franja de color. Mira hacia +Z; mide unos 2 × 4,4 m. */
export function buildSpeedboat(kit, color = 0xff5f5f) {
  const boat = new THREE.Group();
  boat.add(at(kit.box(1.9, 0.8, 3.4, 0xffffff), 0, 0.4, -0.2));
  boat.add(at(kit.box(1.94, 0.18, 3.44, color), 0, 0.62, -0.2));
  const bow = at(kit.cone(0.95 * Math.SQRT2, 1.6, 0xffffff, 4), 0, 0.4, 2.25);
  bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  bow.scale.set(1, 1, 0.42);
  boat.add(bow);
  boat.add(at(kit.box(1.6, 0.6, 0.08, 0xbfe6ff, { opacity: 0.7 }), 0, 1.1, 0.9));
  boat.add(at(kit.box(1.5, 0.3, 0.8, 0x2b6cb0), 0, 0.85, 0.1));
  boat.add(at(kit.box(1.5, 0.3, 0.8, 0x2b6cb0), 0, 0.85, -1.2));
  boat.add(at(kit.box(0.6, 0.7, 0.5, 0x555555), 0, 0.8, -2.1));
  return boat;
}

/** Palmera de coco, un poco inclinada. */
export function buildPalm(kit, { height = 6, lean = 0.12 } = {}) {
  const palm = new THREE.Group();
  const trunk = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const piece = at(kit.cyl(0.22, 0.28, height / 4 + 0.05, index % 2 ? 0xa67c52 : 0x8a6440, 7), index * lean * 0.6, (index + 0.5) * (height / 4), 0);
    trunk.add(piece);
  }
  palm.add(trunk);
  const top = at(new THREE.Group(), 4 * lean * 0.6, height, 0);
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (leaf / 7) * Math.PI * 2;
    const frond = at(kit.box(0.6, 0.08, 2.6, leaf % 2 ? 0x3fae4a : 0x2e9a3f), 0, -0.35, 1.2);
    frond.rotation.x = 0.5;
    pivot.add(frond);
    top.add(pivot);
  }
  [0, 2.1, 4.2].forEach((angle) => top.add(at(kit.sphere(0.2, 0x6b4423, 6), Math.cos(angle) * 0.3, -0.35, Math.sin(angle) * 0.3)));
  palm.add(top);
  return palm;
}

/** Barril de madera flotando (blanco del cañón). */
export function buildBarrel(kit) {
  const barrel = new THREE.Group();
  barrel.add(at(kit.cyl(0.7, 0.7, 1.5, 0xa0632d, 10), 0, 0.5, 0));
  [0.05, 0.95].forEach((y) => barrel.add(at(kit.cyl(0.74, 0.74, 0.12, 0x3b2f2f, 10), 0, y, 0)));
  return barrel;
}

/** Cofre del tesoro con monedas encima. */
export function buildChest(kit, { open = false } = {}) {
  const chest = new THREE.Group();
  chest.add(at(kit.box(1.6, 0.9, 1.1, 0x8a4b1f), 0, 0.45, 0));
  chest.add(at(kit.box(1.64, 0.12, 1.14, 0xffd166), 0, 0.8, 0));
  const lid = at(new THREE.Group(), 0, 0.9, -0.55);
  lid.add(at(kit.box(1.6, 0.4, 1.1, 0x8a4b1f), 0, 0.2, 0.55));
  lid.add(at(kit.box(0.25, 0.3, 0.1, 0xffd166), 0, 0.1, 1.12));
  if (open) lid.rotation.x = -1.2;
  chest.add(lid);
  [-0.35, 0, 0.35].forEach((x, index) => chest.add(at(kit.cyl(0.22, 0.22, 0.08, 0xffd21f, 10, { emissive: 0x6a4a00 }), x, 0.95 + index * 0.02, 0.1)));
  chest.userData.lid = lid;
  return chest;
}

/** Estrella de mar de pie (para que se vea girar). */
export function buildStarfish(kit) {
  const star = new THREE.Group();
  for (let arm = 0; arm < 5; arm += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (arm / 5) * Math.PI * 2;
    pivot.add(at(kit.box(0.28, 0.6, 0.16, 0xff9f43, { emissive: 0x552200 }), 0, 0.3, 0));
    star.add(pivot);
  }
  star.add(kit.sphere(0.2, 0xffb35a, 8));
  return star;
}

/** Medusa rosada: cúpula transparente con tentáculos. */
export function buildJellyfish(kit, color = 0xff8ac4) {
  const jelly = new THREE.Group();
  const dome = at(kit.sphere(0.85, color, 12, { opacity: 0.8, emissive: 0x441133 }), 0, 0.45, 0);
  dome.scale.y = 0.65;
  jelly.add(dome);
  [-0.4, -0.13, 0.13, 0.4].forEach((x, index) => jelly.add(at(kit.box(0.08, 0.8, 0.08, color, { opacity: 0.8 }), x, 0.0, index % 2 ? 0.25 : -0.25)));
  return jelly;
}

/** Pelícano que flota en el agua. Mira hacia +Z. */
export function buildPelican(kit) {
  const bird = new THREE.Group();
  bird.add(at(kit.box(0.8, 0.6, 1.2, 0xf4f4f4), 0, 0.45, 0));
  [-1, 1].forEach((side) => bird.add(at(kit.box(0.12, 0.45, 1.0, 0x9aa5b1), side * 0.45, 0.55, -0.1)));
  bird.add(at(kit.box(0.2, 0.7, 0.2, 0xf4f4f4), 0, 1.0, 0.45));
  bird.add(at(kit.box(0.35, 0.3, 0.4, 0xf4f4f4), 0, 1.4, 0.5));
  bird.add(at(kit.box(0.18, 0.18, 0.8, 0xff9f43), 0, 1.3, 1.05));
  return bird;
}

/** Pez de colores. Mira hacia +Z. */
export function buildFish(kit, color = 0xffd93d) {
  const fish = new THREE.Group();
  fish.add(at(kit.box(0.35, 0.55, 0.8, color), 0, 0, 0));
  const tail = at(kit.box(0.08, 0.5, 0.35, color), 0, 0, -0.5);
  tail.rotation.x = Math.PI / 4;
  fish.add(tail);
  [-1, 1].forEach((side) => fish.add(at(kit.box(0.02, 0.1, 0.1, 0x2b2140), side * 0.18, 0.08, 0.28)));
  return fish;
}

/** Tortuga marina. Mira hacia +Z. */
export function buildTurtle(kit) {
  const turtle = new THREE.Group();
  const shell = kit.sphere(0.9, 0x3f8f4f, 10);
  shell.scale.set(1, 0.45, 1.2);
  turtle.add(shell);
  turtle.add(at(kit.box(0.45, 0.35, 0.5, 0x9ccc65), 0, 0, 1.25));
  [-1, 1].forEach((side) => {
    const front = at(kit.box(0.9, 0.08, 0.35, 0x9ccc65), side * 0.95, 0, 0.5);
    front.rotation.y = side * 0.4;
    turtle.add(front, at(kit.box(0.5, 0.08, 0.3, 0x9ccc65), side * 0.65, 0, -0.9));
  });
  return turtle;
}

/** Almeja abierta con una perla brillante. */
export function buildClam(kit) {
  const clam = new THREE.Group();
  const bottom = kit.sphere(0.5, 0xd9a3c7, 10);
  bottom.scale.set(1, 0.35, 0.9);
  const lid = at(kit.sphere(0.5, 0xe8b9d6, 10), 0, 0.25, -0.35);
  lid.scale.set(1, 0.35, 0.9);
  lid.rotation.x = -0.9;
  clam.add(bottom, lid, at(kit.sphere(0.22, 0xffffff, 10, { emissive: 0x777788 }), 0, 0.2, 0.05));
  return clam;
}

/**
 * Islitas para el paseo en lancha: montículo de arena con una palmera y boyas junto al camino.
 * Todo en InstancedMesh (pocas llamadas de dibujo). `positions` son los lugares que da drive.js.
 */
export function buildIslands(kit, positions) {
  const buoys = positions.filter((position, index) => Math.abs(position.x) < 8.5 && index % 4 === 0);
  const islands = positions.filter((position, index) => Math.abs(position.x) > 10 && index % 9 === 0);
  const matrix = new THREE.Matrix4();
  const make = (key, factory, color, list, place) => {
    const mesh = new THREE.InstancedMesh(kit.geometry(key, factory), kit.mat(color), Math.max(1, list.length));
    mesh.count = list.length;
    list.forEach((item, index) => {
      place(item);
      mesh.setMatrixAt(index, matrix);
    });
    return mesh;
  };
  const group = new THREE.Group();
  group.add(
    make('buoy', () => new THREE.CylinderGeometry(0.3, 0.4, 1, 8), 0xff5f5f, buoys, ({ x, z }) => matrix.makeTranslation(x, 0.3, z)),
    make('buoy-top', () => new THREE.SphereGeometry(0.3, 8, 6), 0xffffff, buoys, ({ x, z }) => matrix.makeTranslation(x, 0.9, z)),
    make('island', () => new THREE.SphereGeometry(3, 12, 6), SAND_COLOR, islands, ({ x, z, scale }) =>
      matrix.makeScale(scale * 1.2, 0.3, scale * 1.2).setPosition(x, 0, z),
    ),
    make('island-trunk', () => new THREE.CylinderGeometry(0.2, 0.28, 5, 6), 0x8a6440, islands, ({ x, z, scale }) =>
      matrix.makeScale(scale, scale, scale).setPosition(x, 2.5 * scale + 0.6, z),
    ),
    // Copa como un paraguas: el cono va boca abajo.
    make('island-crown', () => new THREE.ConeGeometry(2.2, 1.2, 7).rotateX(Math.PI), 0x2e9a3f, islands, ({ x, z, scale }) =>
      matrix.makeScale(scale, scale, scale).setPosition(x, 5 * scale + 0.4, z),
    ),
  );
  return group;
}
