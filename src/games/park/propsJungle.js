/**
 * Objetos de la Selva Amazónica que salen en el parque y en sus atracciones: árboles gigantes,
 * helechos, victorias regias, la canoa, la maloca y los animales (guacamayas, tucanes, monos,
 * perezosos, mariposas, delfines rosados, caimanes y ranas).
 */
import * as THREE from 'three';
import { at } from './kit.js';

export const RIVER_COLOR = 0x5a9e8f;
export const JUNGLE_GREENS = [0x2e8b3e, 0x3fae4a, 0x1f7a3a, 0x4cbf5a];
/** Colores de las cuatro guacamayas del coro (rojo, azul, amarillo, verde). */
export const MACAW_COLORS = [0xe63946, 0x2b6cb0, 0xffc93d, 0x3fae4a];

/** Árbol de la selva: tronco alto, copa en capas y lianas que cuelgan. */
export function buildJungleTree(kit, { height = 9, color = 0x2e8b3e } = {}) {
  const tree = new THREE.Group();
  tree.add(at(kit.cyl(0.45, 0.65, height, 0x6b4423, 8), 0, height / 2, 0));
  tree.add(at(kit.sphere(2.8, color, 10), 0, height, 0));
  tree.add(at(kit.sphere(2, 0x3fae4a, 10), 1.6, height - 0.6, 0.8));
  tree.add(at(kit.sphere(1.8, 0x1f7a3a, 10), -1.4, height - 0.4, -0.9));
  [[1.2, 0.6], [-0.9, 1.1], [0.3, -1.3]].forEach(([x, z], index) => {
    const length = 3 + index;
    tree.add(at(kit.box(0.08, length, 0.08, 0x4f7d2a), x, height - 1.4 - length / 2, z));
  });
  return tree;
}

/** La ceiba gigante: tronco ancho con raíces de tabla y una copa enorme. */
export function buildCeiba(kit, { height = 16 } = {}) {
  const tree = new THREE.Group();
  tree.add(at(kit.cyl(1, 1.4, height, 0x8a6a4a, 10), 0, height / 2, 0));
  for (let root = 0; root < 5; root += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (root / 5) * Math.PI * 2;
    pivot.add(at(kit.box(0.35, 2.4, 2.2, 0x7a5a3a), 0, 1.2, 1.6));
    tree.add(pivot);
  }
  [
    [0, 0, 0, 5.5, 0x2e8b3e],
    [3.5, -1, 1.5, 3.8, 0x3fae4a],
    [-3.6, -0.6, -1, 3.6, 0x1f7a3a],
    [1, 0.8, -3.4, 3.4, 0x4cbf5a],
  ].forEach(([x, y, z, r, color]) => {
    const crown = at(kit.sphere(r, color, 12), x, height + y, z);
    crown.scale.y = 0.6;
    tree.add(crown);
  });
  return tree;
}

/** Helecho: hojas largas en abanico. */
export function buildFern(kit, color = 0x3fae4a) {
  const fern = new THREE.Group();
  for (let leaf = 0; leaf < 6; leaf += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (leaf / 6) * Math.PI * 2;
    const blade = at(kit.box(0.35, 0.06, 1.6, color), 0, 0.5, 0.7);
    blade.rotation.x = -0.6;
    pivot.add(blade);
    fern.add(pivot);
  }
  return fern;
}

/** Victoria regia: la hoja gigante y redonda con el borde levantado (y a veces una flor). */
export function buildLilyPad(kit, { radius = 1.3, flower = false } = {}) {
  const pad = new THREE.Group();
  pad.add(at(kit.cyl(radius, radius, 0.12, 0x4caf50, 20), 0, 0, 0));
  pad.add(at(kit.cyl(radius + 0.06, radius + 0.06, 0.08, 0xc0392b, 20), 0, -0.04, 0));
  if (flower) {
    [0, 1, 2, 3, 4].forEach((petal) => {
      const angle = (petal / 5) * Math.PI * 2;
      pad.add(at(kit.sphere(0.18, 0xffc2d1, 6), Math.cos(angle) * 0.18, 0.18, Math.sin(angle) * 0.18));
    });
    pad.add(at(kit.sphere(0.12, 0xffd93d, 6), 0, 0.25, 0));
  }
  return pad;
}

/** Guacamaya de bloques. Mira hacia +Z; `userData.wings` son las alas (para aletear). */
export function buildMacaw(kit, color = MACAW_COLORS[0]) {
  const bird = new THREE.Group();
  bird.add(at(kit.box(0.4, 0.6, 0.4, color), 0, 0.5, 0));
  bird.add(at(kit.box(0.34, 0.32, 0.34, color), 0, 0.95, 0.05));
  bird.add(at(kit.box(0.22, 0.12, 0.02, 0xffffff), 0, 0.98, 0.23));
  [-0.09, 0.09].forEach((x) => bird.add(at(kit.box(0.05, 0.06, 0.02, 0x2b2140), x, 1.0, 0.24)));
  bird.add(at(kit.box(0.12, 0.16, 0.16, 0x2b2140), 0, 0.88, 0.28));
  const tail = at(kit.box(0.14, 0.7, 0.08, color), 0, 0.05, -0.2);
  tail.rotation.x = -0.3;
  bird.add(tail);
  const wings = [-1, 1].map((side) => {
    const pivot = at(new THREE.Group(), side * 0.2, 0.7, 0);
    pivot.add(at(kit.box(0.08, 0.5, 0.36, side < 0 ? 0x2b6cb0 : 0xffd93d), 0, -0.2, 0));
    bird.add(pivot);
    return pivot;
  });
  bird.userData.wings = wings;
  return bird;
}

/** Tucán: negro con el pico grande de colores. Mira hacia +Z. */
export function buildToucan(kit) {
  const bird = new THREE.Group();
  bird.add(at(kit.box(0.4, 0.6, 0.45, 0x1d1d26), 0, 0.5, 0));
  bird.add(at(kit.box(0.36, 0.36, 0.36, 0x1d1d26), 0, 0.95, 0.05));
  bird.add(at(kit.box(0.3, 0.2, 0.05, 0xffd93d), 0, 0.72, 0.22));
  bird.add(at(kit.box(0.2, 0.2, 0.55, 0xff9f43), 0, 0.98, 0.5));
  bird.add(at(kit.box(0.21, 0.07, 0.2, 0x3fae4a), 0, 1.05, 0.7));
  [-0.12, 0.12].forEach((x) => bird.add(at(kit.box(0.06, 0.06, 0.02, 0x5ab0ff), x, 1.02, 0.24)));
  return bird;
}

/** Mono café de cola larga. Mira hacia +Z; `userData.tail` se puede mover. */
export function buildMonkey(kit) {
  const monkey = new THREE.Group();
  monkey.add(at(kit.box(0.5, 0.55, 0.4, 0x8a5a2b), 0, 0.6, 0));
  monkey.add(at(kit.box(0.46, 0.42, 0.42, 0x8a5a2b), 0, 1.1, 0));
  monkey.add(at(kit.box(0.34, 0.26, 0.05, 0xf1c79a), 0, 1.06, 0.22));
  [-0.09, 0.09].forEach((x) => monkey.add(at(kit.box(0.05, 0.06, 0.02, 0x2b2140), x, 1.12, 0.25)));
  [-1, 1].forEach((side) => {
    monkey.add(at(kit.box(0.12, 0.16, 0.08, 0xf1c79a), side * 0.27, 1.12, 0));
    monkey.add(at(kit.box(0.14, 0.6, 0.14, 0x8a5a2b), side * 0.32, 0.6, 0.05));
    monkey.add(at(kit.box(0.16, 0.4, 0.16, 0x8a5a2b), side * 0.14, 0.2, 0));
  });
  const tail = at(new THREE.Group(), 0, 0.45, -0.2);
  const piece = at(kit.box(0.08, 0.8, 0.08, 0x8a5a2b), 0, 0.35, -0.1);
  piece.rotation.x = -0.6;
  tail.add(piece);
  monkey.add(tail);
  monkey.userData.tail = tail;
  return monkey;
}

/** Perezoso colgado boca abajo de una rama (la rama no va incluida; cuelga desde y = 0). */
export function buildSloth(kit) {
  const sloth = new THREE.Group();
  const body = at(kit.box(0.6, 0.45, 1.1, 0xb59a7a), 0, -0.6, 0);
  sloth.add(body);
  sloth.add(at(kit.box(0.42, 0.38, 0.38, 0xc8b08f), 0, -0.6, 0.7));
  sloth.add(at(kit.box(0.34, 0.12, 0.02, 0x5c4a3a), 0, -0.58, 0.9));
  [-0.08, 0.08].forEach((x) => sloth.add(at(kit.box(0.05, 0.05, 0.02, 0x1d1d26), x, -0.58, 0.91)));
  [-0.4, 0.4].forEach((z) => [-1, 1].forEach((side) => sloth.add(at(kit.box(0.1, 0.55, 0.1, 0xb59a7a), side * 0.22, -0.28, z))));
  return sloth;
}

/** Mariposa morpho azul. `userData.wings` aletean. */
export function buildButterfly(kit, color = 0x2f8fff) {
  const butterfly = new THREE.Group();
  butterfly.add(at(kit.box(0.05, 0.05, 0.3, 0x1d1d26), 0, 0, 0));
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.add(at(kit.box(0.4, 0.02, 0.36, color, { emissive: 0x0a2a66 }), side * 0.2, 0, 0.04));
    butterfly.add(pivot);
    return { pivot, side };
  });
  butterfly.userData.wings = wings;
  return butterfly;
}

/** Mueve las alas de una mariposa (de buildButterfly). */
export function flapButterfly(butterfly, time) {
  butterfly.userData.wings.forEach(({ pivot, side }) => (pivot.rotation.z = side * Math.sin(time * 14) * 0.8));
}

/** Delfín rosado del Amazonas. Mira hacia +Z. */
export function buildPinkDolphin(kit) {
  const dolphin = new THREE.Group();
  const body = kit.sphere(0.6, 0xff9ec4, 10);
  body.scale.set(0.8, 0.75, 2.1);
  dolphin.add(body);
  dolphin.add(at(kit.box(0.18, 0.18, 0.7, 0xff9ec4), 0, -0.05, 1.5));
  dolphin.add(at(kit.box(0.06, 0.35, 0.3, 0xff7fb0), 0, 0.5, -0.1));
  const tail = at(kit.box(0.8, 0.06, 0.3, 0xff7fb0), 0, 0, -1.3);
  dolphin.add(tail);
  [-0.18, 0.18].forEach((x) => dolphin.add(at(kit.box(0.05, 0.06, 0.02, 0x2b2140), x, 0.12, 1.1)));
  return dolphin;
}

/** Caimán tumbado (dormido, con los ojos cerrados). Mira hacia +Z. */
export function buildCaiman(kit) {
  const caiman = new THREE.Group();
  caiman.add(at(kit.box(0.9, 0.4, 2.2, 0x4f6b35), 0, 0.2, 0));
  caiman.add(at(kit.box(0.6, 0.3, 1.2, 0x5d7b40), 0, 0.17, 1.6));
  caiman.add(at(kit.box(0.3, 0.2, 1.4, 0x4f6b35), 0, 0.12, -1.7));
  [-0.18, 0.18].forEach((x) => caiman.add(at(kit.box(0.14, 0.04, 0.08, 0x2b2140), x, 0.38, 1.25)));
  [[-1, 0.6], [1, 0.6], [-1, -0.6], [1, -0.6]].forEach(([side, z]) => caiman.add(at(kit.box(0.3, 0.15, 0.3, 0x4f6b35), side * 0.55, 0.08, z)));
  for (let ridge = 0; ridge < 5; ridge += 1) caiman.add(at(kit.box(0.12, 0.12, 0.2, 0x3b5228), 0, 0.45, 0.8 - ridge * 0.45));
  return caiman;
}

/** Rana: verde con puntos, o dorada y brillante. */
export function buildFrog(kit, { golden = false } = {}) {
  const frog = new THREE.Group();
  const color = golden ? 0xffd21f : 0x3fd16a;
  const options = golden ? { emissive: 0x6a4a00 } : undefined;
  frog.add(at(kit.box(0.5, 0.3, 0.55, color, options), 0, 0.15, 0));
  [-0.14, 0.14].forEach((x) => {
    frog.add(at(kit.sphere(0.1, color, 8, options), x, 0.33, 0.18));
    frog.add(at(kit.box(0.06, 0.06, 0.02, 0x1d1d26), x, 0.35, 0.27));
  });
  [-1, 1].forEach((side) => frog.add(at(kit.box(0.18, 0.12, 0.4, color, options), side * 0.3, 0.06, -0.05)));
  if (!golden) [-0.1, 0.12].forEach((x) => frog.add(at(kit.box(0.1, 0.02, 0.1, 0x1d1d26), x, 0.31, -0.08)));
  return frog;
}

/** Canoa de madera. Mira hacia +Z; mide unos 1,4 × 5 m. */
export function buildCanoe(kit, color = 0x8a5a2b) {
  const canoe = new THREE.Group();
  // Fondo y costados (por dentro va hueca, para que se vea quién va sentada).
  canoe.add(at(kit.box(1.3, 0.2, 3.6, color), 0, 0.1, 0));
  [-1, 1].forEach((side) => {
    canoe.add(at(kit.box(0.12, 0.5, 3.6, color), side * 0.59, 0.3, 0));
    canoe.add(at(kit.box(0.16, 0.08, 3.62, 0xffd166), side * 0.59, 0.58, 0));
  });
  [-1, 1].forEach((end) => {
    const tip = at(kit.cone(0.65 * Math.SQRT2, 1, color, 4), 0, 0.3, end * 2.3);
    tip.rotation.set((end * Math.PI) / 2, Math.PI / 4, 0);
    tip.scale.set(1, 1, 0.4);
    canoe.add(tip);
  });
  [-1, 0.2, 1.3].forEach((z) => canoe.add(at(kit.box(1.2, 0.08, 0.3, 0x6b3b1f), 0, 0.45, z)));
  return canoe;
}

/** Remo (palo con pala), para poner en las manos o en la canoa. */
export function buildPaddle(kit) {
  const paddle = new THREE.Group();
  paddle.add(at(kit.cyl(0.04, 0.04, 1.8, 0x8a5a2b, 6), 0, 0, 0));
  paddle.add(at(kit.box(0.3, 0.5, 0.05, 0xc58b4e), 0, -1, 0));
  return paddle;
}

/** Maloca: la gran casa redonda con techo de palma hasta el suelo. */
export function buildMaloca(kit, radius = 4) {
  const maloca = new THREE.Group();
  maloca.add(at(kit.cyl(radius, radius, 2.4, 0xc58b4e, 16), 0, 1.2, 0));
  maloca.add(at(kit.cone(radius + 1.4, 6.5, 0xd9b26a, 16), 0, 5.4, 0));
  maloca.add(at(kit.cone(radius + 1.5, 0.6, 0xb8935a, 16), 0, 2.5, 0));
  // Dibujos de colores en la pared y la puerta.
  for (let mark = 0; mark < 8; mark += 1) {
    const angle = (mark / 8) * Math.PI * 2 + 0.2;
    const tile = at(kit.box(0.6, 0.6, 0.05, mark % 2 ? 0xe63946 : 0x2b2140), Math.sin(angle) * (radius + 0.02), 1.4, Math.cos(angle) * (radius + 0.02));
    tile.rotation.y = angle;
    tile.rotation.z = Math.PI / 4;
    maloca.add(tile);
  }
  maloca.add(at(kit.box(1.4, 2, 0.1, 0x3b2414), 0, 1, radius + 0.02));
  return maloca;
}

/** Hongo gigante: tallo blanco y sombrero rojo con puntos (las ranas suben a jugar). */
export function buildMushroom(kit, { top = 1, radius = 1.2, color = 0xe63946 } = {}) {
  const mushroom = new THREE.Group();
  mushroom.add(at(kit.cyl(0.35, 0.45, top, 0xfff4e0, 10), 0, top / 2, 0));
  const cap = at(kit.sphere(radius, color, 12), 0, top - 0.05, 0);
  cap.scale.y = 0.4;
  mushroom.add(cap);
  [[0.5, 0.2], [-0.4, 0.5], [-0.3, -0.5], [0.4, -0.5]].forEach(([x, z]) =>
    mushroom.add(at(kit.sphere(0.16, 0xffffff, 6), x * radius, top + radius * 0.25, z * radius)),
  );
  return mushroom;
}

/**
 * Orilla de la selva para el paseo en canoa: árboles, helechos y juncos junto al río.
 * Todo en InstancedMesh (pocas llamadas de dibujo). `positions` son los lugares que da drive.js.
 */
export function buildRiverbank(kit, positions) {
  const reeds = positions.filter((position, index) => Math.abs(position.x) < 8.5 && index % 3 === 0);
  const trees = positions.filter((position, index) => Math.abs(position.x) > 9 && index % 5 === 0);
  const ferns = positions.filter((position, index) => Math.abs(position.x) > 7 && index % 5 === 2);
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
    make('reed', () => new THREE.CylinderGeometry(0.05, 0.08, 1.6, 5), 0x7fb84a, reeds, ({ x, z }) => matrix.makeTranslation(x * 1.15, 0.6, z)),
    make('bank-trunk', () => new THREE.CylinderGeometry(0.4, 0.55, 9, 7), 0x6b4423, trees, ({ x, z, scale }) =>
      matrix.makeScale(scale, scale, scale).setPosition(x, 4.5 * scale, z),
    ),
    make('bank-crown', () => new THREE.SphereGeometry(3, 9, 6), 0x2e8b3e, trees, ({ x, z, scale }) =>
      matrix.makeScale(scale, scale * 0.8, scale).setPosition(x, 9 * scale, z),
    ),
    make('bank-fern', () => new THREE.ConeGeometry(1.2, 1.4, 6), 0x3fae4a, ferns, ({ x, z, scale }) =>
      matrix.makeScale(scale, scale, scale).setPosition(x, 0.7 * scale, z),
    ),
  );
  return group;
}
