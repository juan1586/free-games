/**
 * Construye la Playa de Cartagena en 3D: la Torre del Reloj en la plaza, casitas coloniales con
 * balcones, la chiva rumbera, la muralla con sus cañones (se puede subir por la escalera), la playa
 * con el mar, sombrillas y cangrejos, y las zonas de las atracciones: el galeón pirata, el muelle de
 * las lanchas y la escuela de buceo con su acuario.
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { addBox, addCircle } from './collision.js';
import { buildParkBase } from './parkBase.js';
import { createAvatar } from './avatar.js';
import { randomLook } from './outfits.js';
import { pickLine } from './riders.js';
import { SEA_COLOR, buildChest, buildFish, buildGalleon, buildPalm, buildSpeedboat } from './propsBeach.js';

const WALL = { x: -46, z: 16, width: 4, depth: 40, top: 3 };
const STAIR_STEPS = 12;
const BAY = { x: 52, z: 20, r: 12 };
const GALLEON_POOL = { x: 40, z: -32, r: 9 };
const DOCK_POOL = { x: -40, z: -32, r: 9 };
const HOUSE_COLORS = [0xff8fab, 0xffd166, 0x4dd4ac, 0xff9f43, 0x7fb8ff, 0xc79bff];
const HOUSES = [
  { x: -13, z: 30, side: 1 },
  { x: -13, z: 37, side: 1, balcony: true },
  { x: -13, z: 44, side: 1 },
  { x: 13, z: 30, side: -1 },
  { x: 13, z: 37, side: -1 },
];
const PALMS = [
  [-20, 18], [20, 18], [-24, 54], [28, 22], [32, 2], [36, 46], [30, 56], [-36, 40], [-30, 4],
  [-52, -14], [52, -12], [-20, -50], [22, -52], [-34, 22], [42, -4], [-6, 22], [6, 22],
];
const PALENQUERA_LINES = ['¡Cocadas, alegrías! 🍬', '¡Mango, piña, patilla! 🍉', '¡Qué calor, mija! ☀️', '¡Bienvenida a Cartagena! 🌴'];
const LOOK = { ground: 0xf3dca2, path: 0xd98c5f, plaza: 0xe8b48a, hedge: 0xc9a66b, gate: 0x2bb3c0, sign: '#ffd166', sky: 0x8fd8ff };

export function buildPlayaPark(kit, scene, random, world) {
  const { colliders, animations } = buildParkBase(kit, scene, random, { ...world, look: LOOK });

  buildClockTower(kit, scene, colliders);
  HOUSES.forEach((house, index) => buildHouse(kit, scene, colliders, house, HOUSE_COLORS[index % HOUSE_COLORS.length]));
  buildChiva(kit, scene, colliders, animations);
  buildWall(kit, scene, colliders);
  buildBeach(kit, scene, colliders, animations, random);
  buildGalleonPool(kit, scene, colliders, animations);
  buildDock(kit, scene, colliders, animations);
  buildDiveSchool(kit, scene, colliders, animations, random);
  buildPalenquera(kit, scene, colliders, animations, random);
  PALMS.forEach(([x, z], index) => {
    scene.add(at(buildPalm(kit, { height: 5.5 + (index % 3), lean: index % 2 ? 0.15 : -0.12 }), x, 0, z));
    addCircle(colliders, { x, z, r: 0.4 });
  });

  let time = 0;
  return {
    colliders,
    update(delta) {
      time += delta;
      animations.forEach((animate) => animate(delta, time));
    },
  };
}

/** Torre del Reloj, la puerta de la ciudad amurallada. */
function buildClockTower(kit, scene, colliders) {
  scene.add(at(kit.box(5, 6, 3.5, 0xffd166), 0, 3, 0));
  scene.add(at(kit.box(2, 3.6, 3.6, 0x7a4a2a), 0, 1.8, 0));
  scene.add(at(kit.box(5.3, 0.4, 3.8, 0xfff4e0), 0, 6.1, 0));
  scene.add(at(kit.box(3.2, 3, 3.2, 0xfff4e0), 0, 7.8, 0));
  [-1, 1].forEach((side) => {
    const face = at(kit.cyl(1.1, 1.1, 0.1, 0xffffff, 20), 0, 8, side * 1.62);
    face.rotation.x = Math.PI / 2;
    scene.add(face);
    scene.add(at(kit.box(0.12, 0.8, 0.05, 0x2b2140), 0, 8.3, side * 1.7));
    scene.add(at(kit.box(0.6, 0.1, 0.05, 0x2b2140), 0.25, 8, side * 1.7));
  });
  scene.add(at(kit.box(2, 1.6, 2, 0xffd166), 0, 10.1, 0));
  scene.add(at(kit.sphere(1.1, 0xe85d3a, 10), 0, 11, 0));
  scene.add(at(kit.cyl(0.05, 0.05, 1.2, 0x2b2140, 6), 0, 12.4, 0));
  const sign = kit.label('🕰️ Torre del Reloj', { background: '#ffffff', height: 0.8 });
  scene.add(at(sign.sprite, 0, 13.5, 0));
  addBox(colliders, { x: 0, z: 0, width: 5, depth: 3.5, top: 99 });
}

/** Casita colonial de colores con puerta, ventanas y (a veces) balcón de madera con flores. */
function buildHouse(kit, scene, colliders, { x, z, side, balcony }, color) {
  const width = 5;
  const depth = 6.5;
  scene.add(at(kit.box(width, 6, depth, color), x, 3, z));
  scene.add(at(kit.box(width + 0.3, 0.4, depth + 0.3, 0xfff4e0), x, 6.2, z));
  scene.add(at(kit.box(width + 0.6, 0.3, depth + 0.6, 0xc8553d), x, 6.55, z));
  const front = x + (side * width) / 2;
  scene.add(at(kit.box(0.08, 2.2, 1.3, 0x6b3b1f), front + side * 0.02, 1.1, z));
  [-2, 2].forEach((dz) => {
    scene.add(at(kit.box(0.08, 1.2, 0.9, 0x2bb3c0), front + side * 0.02, 1.6, z + dz));
    scene.add(at(kit.box(0.08, 1.2, 0.9, 0x2bb3c0), front + side * 0.02, 4.4, z + dz));
  });
  addBox(colliders, { x, z, width, depth, top: 99 });
  if (!balcony) {
    // Flores (buganvilias) que cuelgan de la fachada.
    [-1.6, 1.6].forEach((dz) => scene.add(at(kit.sphere(0.5, 0xff4f9a, 8), front + side * 0.2, 5.3, z + dz)));
    return;
  }
  // Balcón: piso de madera, baranda y flores. Se sube por las cajas de frutas (hay una caracola).
  const bx = front + side * 0.6;
  scene.add(at(kit.box(1.2, 0.25, 4, 0x8a4b1f), bx, 2.88, z));
  scene.add(at(kit.box(0.1, 0.9, 4, 0x6b3b1f), bx + side * 0.55, 3.45, z));
  [-1.9, -0.95, 0, 0.95, 1.9].forEach((dz) => scene.add(at(kit.box(0.1, 3, 0.1, 0x6b3b1f), bx + side * 0.55, 1.5, z + dz)));
  [-1.4, 0, 1.4].forEach((dz) => scene.add(at(kit.sphere(0.35, 0xff4f9a, 8), bx + side * 0.6, 3.9, z + dz)));
  addBox(colliders, { x: bx, z, width: 1.2, depth: 4, top: 3 });
  const crates = [
    { cx: bx + side * 1.5, cz: z + 0.5, top: 2 },
    { cx: bx + side * 1.5, cz: z + 2.0, top: 1 },
  ];
  crates.forEach(({ cx, cz, top }) => {
    scene.add(at(kit.box(1.2, top, 1.2, 0xc58b4e), cx, top / 2, cz));
    scene.add(at(kit.sphere(0.25, top > 1 ? 0xff9f43 : 0xffd93d, 8), cx - 0.2, top + 0.15, cz));
    scene.add(at(kit.sphere(0.25, 0x4caf50, 8), cx + 0.25, top + 0.15, cz + 0.1));
    addBox(colliders, { x: cx, z: cz, width: 1.2, depth: 1.2, top });
  });
}

/** Chiva rumbera: el bus de colores. Por las maletas de atrás se sube al techo. */
function buildChiva(kit, scene, colliders, animations) {
  const chiva = at(new THREE.Group(), 16, 0, 46);
  const stripes = [0xffd166, 0xe63946, 0x2b6cb0, 0x3fae4a];
  chiva.add(at(kit.box(3, 0.6, 7, 0x2b2140), 0, 0.9, 0));
  stripes.forEach((color, index) => chiva.add(at(kit.box(3.02, 0.35, 7.02, color), 0, 1.35 + index * 0.35, 0)));
  // Ventanas abiertas y el techo con la parrilla.
  chiva.add(at(kit.box(3.04, 0.7, 6, 0x3b2f2f), 0, 2.55, 0));
  chiva.add(at(kit.box(3.1, 0.15, 7.1, 0xffd166), 0, 2.95, 0));
  // El frente mira a la plaza (-Z); atrás quedan las maletas.
  chiva.add(at(kit.box(2.6, 1.2, 1.6, 0xe63946), 0, 1.3, -4.2));
  chiva.add(at(kit.box(2.4, 0.5, 0.08, 0xbfe6ff, { opacity: 0.7 }), 0, 2.2, -3.52));
  [-1.3, 1.3].forEach((x) => {
    chiva.add(at(kit.box(0.1, 0.3, 6.8, 0x8a4b1f), x, 3.2, 0));
    [-2.3, 2.3].forEach((z) => {
      const wheel = at(kit.cyl(0.55, 0.55, 0.4, 0x2b2b3a, 14), x + Math.sign(x) * 0.25, 0.55, z);
      wheel.rotation.z = Math.PI / 2;
      chiva.add(wheel);
    });
  });
  [[-0.6, -1.5, 0xff5fa2], [0.5, 0.5, 0x5ab0ff], [-0.3, 2, 0xffd93d]].forEach(([x, z, color]) => chiva.add(at(kit.box(0.9, 0.5, 0.7, color), x, 3.3, z)));
  const lights = [0xff5f5f, 0xffd93d, 0x4dd4ac, 0xb57bff].map((color, index) => {
    const bulb = at(kit.sphere(0.12, color, 6, { emissive: color }), -1.2 + index * 0.8, 3.1, -3.5);
    chiva.add(bulb);
    return bulb;
  });
  scene.add(chiva);
  const sign = kit.label('🚌 Chiva Rumbera', { background: '#ffd166', height: 0.8 });
  scene.add(at(sign.sprite, 16, 4.6, 46));
  addBox(colliders, { x: 16, z: 46, width: 3, depth: 7, top: 3 });
  addBox(colliders, { x: 16, z: 41.8, width: 2.6, depth: 1.6, top: 1.9 });
  // Maletas para trepar.
  [
    { x: 16, z: 50.4, w: 2.4, d: 0.8, top: 2 },
    { x: 16, z: 51.5, w: 2, d: 1, top: 1 },
  ].forEach(({ x, z, w, d, top }, index) => {
    scene.add(at(kit.box(w, top, d, index ? 0x2b6cb0 : 0x8a4b1f), x, top / 2, z));
    addBox(colliders, { x, z, width: w, depth: d, top });
  });
  animations.push((delta, time) => {
    lights.forEach((bulb, index) => (bulb.visible = Math.floor(time * 3 + index) % 2 === 0));
  });
}

/** Muralla de piedra con almenas, garita y cañones. Escalera al sur para subir. */
function buildWall(kit, scene, colliders) {
  const { x, z, width, depth, top } = WALL;
  scene.add(at(kit.box(width, top, depth, 0xd9b77a), x, top / 2, z));
  scene.add(at(kit.box(width + 0.1, 0.5, depth + 0.1, 0xb8935a), x, 0.25, z));
  addBox(colliders, { x, z, width, depth, top });
  // Almenas en el borde de afuera (no se cae una por ese lado).
  for (let mz = z - depth / 2 + 1; mz <= z + depth / 2 - 1; mz += 2.5) {
    scene.add(at(kit.box(0.6, 0.8, 1.2, 0xd9b77a), x - width / 2 + 0.3, top + 0.4, mz));
    addBox(colliders, { x: x - width / 2 + 0.3, z: mz, width: 0.6, depth: 1.2, top: top + 0.8 });
  }
  // Escalera: cada escalón sube menos de lo que se sube sin saltar y es más hondo que el radio de
  // la jugadora (si no, el siguiente la frena antes de pisar este).
  const stepDepth = 0.6;
  for (let step = 0; step < STAIR_STEPS; step += 1) {
    const height = (top / STAIR_STEPS) * (step + 1);
    const sz = z + depth / 2 + (STAIR_STEPS - step - 0.5) * stepDepth;
    scene.add(at(kit.box(3, height, stepDepth, step % 2 ? 0xc9a66b : 0xd9b77a), x + 0.3, height / 2, sz));
    addBox(colliders, { x: x + 0.3, z: sz, width: 3, depth: stepDepth, top: height });
  }
  // Garita (la casetita del guardia) en la punta norte.
  const gz = z - depth / 2 + 1;
  scene.add(at(kit.cyl(0.8, 0.8, 2, 0xe8cf9c, 10), x - 1, top + 1, gz));
  scene.add(at(kit.sphere(0.85, 0xe8cf9c, 10), x - 1, top + 2.1, gz));
  scene.add(at(kit.box(0.5, 1, 0.1, 0x3b2f2f), x - 1, top + 0.9, gz + 0.8));
  addCircle(colliders, { x: x - 1, z: gz, r: 0.8 });
  // Cañones apuntando al mar y sus balas.
  [8, 20, 30].forEach((cz) => {
    const cannon = at(kit.cyl(0.25, 0.32, 1.8, 0x222222, 10), x - 0.6, top + 0.55, cz);
    cannon.rotation.z = Math.PI / 2 - 0.1;
    scene.add(cannon);
    [-0.3, 0.3].forEach((dz) => scene.add(at(kit.sphere(0.2, 0x222222, 6), x + 0.8, top + 0.2, cz + dz)));
  });
  const sign = kit.label('🏰 Las Murallas', { background: '#ffffff', height: 0.9 });
  scene.add(at(sign.sprite, x + 2.5, top + 2.4, z + depth / 2 + 1));
}

/** La playa: el mar con olas, sombrillas, un castillo de arena, cangrejos y gaviotas. */
function buildBeach(kit, scene, colliders, animations, random) {
  const { x, z, r } = BAY;
  scene.add(at(kit.disc(r + 2.2, 0xfff1c9), x, 0.03, z));
  scene.add(at(kit.disc(r, SEA_COLOR), x, 0.06, z));
  scene.add(at(kit.disc(r - 4, 0x2585c4), x + 2, 0.07, z));
  addCircle(colliders, { x, z, r: r - 0.6 });
  const wave = at(kit.torus(r, 0.12, 0xffffff), x, 0.08, z);
  wave.rotation.x = Math.PI / 2;
  scene.add(wave);
  const sign = kit.label('🌊 Mar Caribe', { background: '#ffffff', height: 0.9 });
  scene.add(at(sign.sprite, x - 4, 3, z - 6));

  [
    [34, 14, 0xff5f5f],
    [36, 28, 0x2bb3c0],
    [44, 36, 0xffd166],
    [30, -2, 0xff8ac4],
  ].forEach(([ux, uz, color]) => {
    scene.add(at(kit.cyl(0.07, 0.07, 3, 0xffffff, 6), ux, 1.5, uz));
    scene.add(at(kit.cone(1.8, 0.8, color, 8), ux, 3.2, uz));
    scene.add(at(kit.box(1.2, 0.04, 2.2, 0xffffff), ux + 1.1, 0.05, uz + 0.6));
    scene.add(at(kit.box(1.2, 0.05, 0.25, color), ux + 1.1, 0.06, uz + 0.6));
    addCircle(colliders, { x: ux, z: uz, r: 0.2 });
  });

  // Castillo de arena.
  const castle = at(new THREE.Group(), 37.5, 0, 40);
  castle.add(at(kit.box(2.2, 0.8, 2.2, 0xe8c27a), 0, 0.4, 0));
  [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([cx, cz]) => {
    castle.add(at(kit.cyl(0.35, 0.4, 1.3, 0xe8c27a, 8), cx, 0.65, cz));
    castle.add(at(kit.cone(0.4, 0.5, 0xe8c27a, 8), cx, 1.55, cz));
  });
  castle.add(at(kit.box(0.4, 0.3, 0.05, 0xff5f5f), 0, 1.6, 0));
  castle.add(at(kit.cyl(0.02, 0.02, 1, 0xffffff, 4), -0.2, 1.2, 0));
  scene.add(castle);
  addCircle(colliders, { x: 37.5, z: 40, r: 1.5 });
  scene.add(at(kit.cyl(0.35, 0.25, 0.5, 0xff5f5f, 10), 35.6, 0.25, 41.2));

  const crabs = [0, 1, 2].map((index) => {
    const crab = new THREE.Group();
    crab.add(at(kit.box(0.6, 0.25, 0.4, 0xe63946), 0, 0.2, 0));
    [-1, 1].forEach((side) => crab.add(at(kit.box(0.2, 0.2, 0.2, 0xe63946), side * 0.42, 0.3, 0.2)));
    [-0.12, 0.12].forEach((ex) => crab.add(at(kit.box(0.06, 0.15, 0.06, 0x2b2140), ex, 0.4, 0.18)));
    scene.add(crab);
    return { crab, angle: index * 2.1, radius: r + 1.2 + index * 0.4 };
  });
  const gulls = [0, 1, 2].map((index) => {
    const gull = new THREE.Group();
    gull.add(at(kit.box(0.3, 0.25, 0.7, 0xffffff), 0, 0, 0));
    [-1, 1].forEach((side) => gull.add(at(kit.box(1, 0.05, 0.35, 0xdfe6ec), side * 0.6, 0.05, 0)));
    scene.add(gull);
    return { gull, phase: (index / 3) * Math.PI * 2, height: 9 + index * 2 };
  });
  animations.push((delta, time) => {
    wave.scale.setScalar(1 + Math.sin(time * 1.3) * 0.025);
    crabs.forEach((entry, index) => {
      entry.angle += delta * 0.12 * (index % 2 ? 1 : -1);
      const step = Math.sin(time * 6 + index) * 0.06;
      entry.crab.position.set(x + Math.cos(entry.angle) * entry.radius + step, 0, z + Math.sin(entry.angle) * entry.radius);
      entry.crab.rotation.y = -entry.angle;
    });
    gulls.forEach(({ gull, phase, height }) => {
      const angle = time * 0.35 + phase;
      gull.position.set(x - 6 + Math.cos(angle) * 14, height + Math.sin(time * 2 + phase), z + Math.sin(angle) * 14);
      gull.rotation.y = -angle;
      gull.children[1].rotation.z = Math.sin(time * 8 + phase) * 0.4;
      gull.children[2].rotation.z = -Math.sin(time * 8 + phase) * 0.4;
    });
  });
  // Unas cuantas variaciones al azar de las conchas en la arena.
  for (let index = 0; index < 12; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = r + 2 + random() * 5;
    scene.add(at(kit.sphere(0.15, index % 2 ? 0xffc2d1 : 0xfff4e0, 6), x + Math.cos(angle) * distance, 0.05, z + Math.sin(angle) * distance));
  }
}

/** El galeón pirata anclado en su laguna (la atracción se juega dentro de él). */
function buildGalleonPool(kit, scene, colliders, animations) {
  const { x, z, r } = GALLEON_POOL;
  scene.add(at(kit.disc(r + 1, 0xb8935a), x, 0.03, z));
  scene.add(at(kit.disc(r, SEA_COLOR), x, 0.05, z));
  addCircle(colliders, { x, z, r: r + 0.3 });
  const ship = buildGalleon(kit);
  ship.position.set(x, -0.5, z);
  ship.rotation.y = -2.3;
  scene.add(ship);
  scene.add(at(buildChest(kit, { open: true }), x - 9, 0, z + 9.5));
  addCircle(colliders, { x: x - 9, z: z + 9.5, r: 1 });
  animations.push((delta, time) => {
    ship.rotation.z = Math.sin(time * 0.8) * 0.04;
    ship.position.y = -0.5 + Math.sin(time * 1.1) * 0.1;
  });
}

/** Muelle con lanchas de colores meciéndose en el agua. */
function buildDock(kit, scene, colliders, animations) {
  const { x, z, r } = DOCK_POOL;
  scene.add(at(kit.disc(r + 1, 0xb8935a), x, 0.03, z));
  scene.add(at(kit.disc(r, SEA_COLOR), x, 0.05, z));
  addCircle(colliders, { x, z, r: r + 0.3 });
  const dock = at(new THREE.Group(), x + 5, 0, z + 5);
  dock.rotation.y = Math.PI / 4;
  dock.add(at(kit.box(2.2, 0.2, 9, 0x8a4b1f), 0, 0.45, -2));
  [-1, 1].forEach((side) => [-6, -3, 0, 2].forEach((pz) => dock.add(at(kit.cyl(0.12, 0.12, 1.2, 0x6b3b1f, 6), side * 1.05, 0.3, pz))));
  scene.add(dock);
  const boats = [0xff5f5f, 0x2bb3c0, 0xffd166].map((color, index) => {
    const boat = buildSpeedboat(kit, color);
    boat.position.set(x - 3 + index * 3, 0, z - 2 + index * 1.5);
    boat.rotation.y = 0.8 + index * 0.3;
    scene.add(boat);
    return boat;
  });
  animations.push((delta, time) => {
    boats.forEach((boat, index) => {
      boat.position.y = Math.sin(time * 1.6 + index) * 0.08 - 0.15;
      boat.rotation.z = Math.sin(time * 1.2 + index) * 0.05;
    });
  });
}

/** Escuela de buceo (casita con techo de paja) y un acuario con peces de verdad... de bloques. */
function buildDiveSchool(kit, scene, colliders, animations, random) {
  scene.add(at(kit.box(6, 3.4, 5, 0x2bb3c0), -7, 1.7, -46));
  const roof = at(kit.cone(4.8, 2.4, 0xd9b26a, 4), -7, 4.6, -46);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
  scene.add(at(kit.box(1.2, 2.2, 0.1, 0x6b3b1f), -7, 1.1, -43.45));
  scene.add(at(kit.box(1, 0.6, 0.1, 0xffd93d), -5, 2.4, -43.45));
  const sign = kit.label('🤿 Escuela de Buceo', { background: '#ffffff', height: 0.8 });
  scene.add(at(sign.sprite, -7, 6.5, -46));
  addBox(colliders, { x: -7, z: -46, width: 6, depth: 5, top: 99 });

  const tank = { x: 7, z: -46, width: 7, depth: 4, height: 3.6 };
  scene.add(at(kit.box(tank.width + 0.4, 0.5, tank.depth + 0.4, 0x5a6b78), tank.x, 0.25, tank.z));
  scene.add(at(kit.box(tank.width, tank.height, tank.depth, 0x5ac8ff, { opacity: 0.35 }), tank.x, 0.5 + tank.height / 2, tank.z));
  scene.add(at(kit.box(tank.width + 0.4, 0.2, tank.depth + 0.4, 0x5a6b78), tank.x, 0.6 + tank.height, tank.z));
  [0xff6f91, 0xffd93d, 0xb57bff].forEach((color, index) =>
    scene.add(at(kit.cone(0.35, 1.2, color, 6), tank.x - 2 + index * 2, 1.1, tank.z + (index % 2 ? 0.8 : -0.8))),
  );
  addBox(colliders, { x: tank.x, z: tank.z, width: tank.width + 0.4, depth: tank.depth + 0.4, top: 99 });
  const fishes = [0xffd93d, 0xff9f43, 0x5ab0ff, 0xff5fa2].map((color, index) => {
    const fish = buildFish(kit, color);
    scene.add(fish);
    return { fish, phase: random() * 6, speed: 0.5 + index * 0.15, y: 1.4 + (index % 3) * 0.8 };
  });
  animations.push((delta, time) => {
    fishes.forEach(({ fish, phase, speed, y }) => {
      const angle = time * speed + phase;
      fish.position.set(tank.x + Math.cos(angle) * 2.7, y + Math.sin(time * 2 + phase) * 0.2, tank.z + Math.sin(angle) * 1.2);
      fish.rotation.y = -angle;
    });
  });
}

/** La palenquera con su ponchera de frutas en la cabeza: saluda a quien pasa. */
function buildPalenquera(kit, scene, colliders, animations, random) {
  const base = randomLook(random);
  const avatar = createAvatar(kit, {
    ...base,
    skin: { color: '#6e4426' },
    shirt: { color: '#ffd166', stripe: '#e63946' },
    pants: { color: '#2b6cb0' },
    hat: { kind: 'none' },
    extra: { kind: 'none' },
  });
  avatar.root.position.set(7, 0, 14);
  avatar.root.rotation.y = -2.2;
  const bowl = at(new THREE.Group(), 0, 2.32, 0);
  bowl.add(at(kit.cyl(0.55, 0.35, 0.25, 0xc0c8d0, 12), 0, 0.12, 0));
  [[0xffd93d, -0.2, 0], [0xe63946, 0.2, 0.1], [0x3fae4a, 0, -0.2], [0xff9f43, 0.05, 0.2]].forEach(([color, fx, fz]) =>
    bowl.add(at(kit.sphere(0.2, color, 8), fx, 0.35, fz)),
  );
  avatar.root.add(bowl);
  scene.add(avatar.root, avatar.shadow);
  avatar.shadow.position.set(7, 0.03, 14);
  addCircle(colliders, { x: 7, z: 14, r: 0.6 });
  const name = kit.label('🍉 La Palenquera', { height: 0.45 });
  name.sprite.position.set(7, 3.5, 14);
  const talk = kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
  talk.sprite.position.set(7, 4.2, 14);
  talk.sprite.visible = false;
  scene.add(name.sprite, talk.sprite);
  let timer = 2;
  animations.push((delta) => {
    avatar.update(delta, { speed: 0 });
    timer -= delta;
    if (timer <= 0) {
      talk.sprite.visible = !talk.sprite.visible;
      if (talk.sprite.visible) talk.setText(pickLine(PALENQUERA_LINES, random));
      timer = talk.sprite.visible ? 2.5 : 3 + random() * 3;
    }
  });
}
