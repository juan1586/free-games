/**
 * Construye la Selva Amazónica en 3D: la maloca en la plaza, la casa del árbol en una ceiba gigante
 * (se sube por la escalera) con un puente colgante, el río Amazonas con delfines rosados, un caimán
 * dormido y el embarcadero, el lago de las victorias regias (se cruza saltando de hoja en hoja), la
 * cascada, los hongos gigantes, la torre de la tirolesa, el árbol de las guacamayas, monos, tucanes,
 * mariposas y, de vez en cuando, un aguacero con arcoíris.
 * Devuelve también `isWater(x, z)`: quien pisa el río o el lago vuelve a la orilla.
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { addBox, addCircle, isBlocked } from './collision.js';
import { buildParkBase } from './parkBase.js';
import { createAvatar } from './avatar.js';
import { randomLook } from './outfits.js';
import { pickLine } from './riders.js';
import {
  MACAW_COLORS,
  RIVER_COLOR,
  buildButterfly,
  buildCaiman,
  buildCanoe,
  buildCeiba,
  buildFrog,
  buildJungleTree,
  buildLilyPad,
  buildMacaw,
  buildMaloca,
  buildMonkey,
  buildMushroom,
  buildPinkDolphin,
  buildSloth,
  buildToucan,
  flapButterfly,
} from './propsJungle.js';

/** El río va por el oeste: desde aquí hacia afuera es agua. */
const RIVER_EDGE_X = -46;
const POND = { x: -34, z: 34, r: 8 };
/** Victorias regias del lago (cajas de `half` de lado a lado, a 0,25 de alto): hay que saltar entre ellas. */
const LILY_PADS = [
  { x: -27.4, z: 34, half: 1.2 },
  { x: -31.2, z: 35.2, half: 1.2 },
  { x: -35, z: 33.6, half: 1.2 },
  { x: -38.6, z: 34.4, half: 1.2, flower: true },
];
const LILY_TOP = 0.25;
const TREEHOUSE = { x: 36, z: 18, size: 7, top: 4 };
const LOOKOUT = { x: 38, z: 3.5, size: 5 };
const BRIDGE_X = 38;
const STAIR_STEPS = 12;
const MUSHROOMS = [
  { x: 22, z: 46, top: 0.9, color: 0xe63946 },
  { x: 25, z: 44, top: 1.8, color: 0xff9f43 },
  { x: 22.5, z: 41.5, top: 2.7, color: 0xb57bff },
  { x: 25.5, z: 39.5, top: 3.6, color: 0xe63946 },
];
const CLIFF = { x: -20, z: -61.5, width: 14, depth: 5, height: 10 };
const TREES = [
  [-18, 20], [16, 28], [-24, 50], [30, 52], [44, 40], [50, 26], [54, 8], [-36, -8], [-30, 8], [-14, -44], [14, -46],
  [-34, -46], [48, -14], [-8, 30], [8, 34], [-16, 4], [44, -46], [-38, 52], [12, -58], [-10, 46], [52, -30], [-28, -56],
];
const GUIDE_LINES = ['¡Bienvenida a la selva! 🌿', '¡No tires basura al río! 🌊', '¡Cuidemos a los animales! 🐒', '¡Busca las ranas doradas! 🐸', '¡Los árboles nos dan aire! 🌳'];
const LOOK = { ground: 0x4f9a45, path: 0xc89a64, plaza: 0xd8b07a, hedge: 0x1f6a30, gate: 0x2e8b3e, sign: '#ffd93d', sky: 0xa8e6c8 };
const RAIN_SKY = new THREE.Color(0x8aa39a);
/** Aguacero: cada cuánto, cuánto dura y cuánto se queda el arcoíris (s). */
const DRY_SECONDS = 70;
const RAIN_SECONDS = 14;
const RAINBOW_SECONDS = 14;
const RAIN_DROPS = 1400;

export function buildSelvaPark(kit, scene, random, world) {
  const { colliders, animations } = buildParkBase(kit, scene, random, { ...world, look: LOOK });

  buildMalocaPlaza(kit, scene, colliders, animations);
  buildTreehouse(kit, scene, colliders, animations);
  buildRiver(kit, scene, colliders, animations);
  buildPond(kit, scene, colliders, animations, random);
  buildWaterfall(kit, scene, colliders, animations);
  buildMushrooms(kit, scene, colliders);
  buildZiplineTower(kit, scene, colliders, animations, random);
  buildMacawTree(kit, scene, colliders, animations);
  buildGuide(kit, scene, colliders, animations, random);
  TREES.forEach(([x, z], index) => {
    scene.add(at(buildJungleTree(kit, { height: 8 + (index % 4) * 1.5, color: index % 2 ? 0x2e8b3e : 0x1f7a3a }), x, 0, z));
    addCircle(colliders, { x, z, r: 0.6 });
  });
  buildFerns(kit, scene, colliders, random);
  buildMonkeys(kit, scene, animations);
  buildButterflies(kit, scene, animations, random);
  buildRain(kit, scene, animations, random);

  let time = 0;
  return {
    colliders,
    isWater: (x, z) => x < RIVER_EDGE_X || Math.hypot(x - POND.x, z - POND.z) < POND.r,
    update(delta) {
      time += delta;
      animations.forEach((animate) => animate(delta, time));
    },
  };
}

const sign = (kit, scene, text, x, y, z, background = '#ffffff') => scene.add(at(kit.label(text, { background, height: 0.8 }).sprite, x, y, z));

/** La maloca en la plaza, con tucanes en sus postes y guacamayas que vuelan en círculo. */
function buildMalocaPlaza(kit, scene, colliders, animations) {
  scene.add(buildMaloca(kit, 4));
  addCircle(colliders, { x: 0, z: 0, r: 4.2 });
  sign(kit, scene, '🛖 Maloca', 0, 9.5, 0);
  [[-6, 6], [6, 6]].forEach(([x, z]) => {
    scene.add(at(kit.cyl(0.25, 0.25, 3, 0x8a5a2b, 8), x, 1.5, z));
    [0xe63946, 0xffd93d, 0x2b6cb0].forEach((color, index) => scene.add(at(kit.box(0.55, 0.3, 0.55, color), x, 0.6 + index * 0.9, z)));
    const toucan = buildToucan(kit);
    toucan.position.set(x, 3, z);
    toucan.rotation.y = x < 0 ? 0.6 : -0.6;
    scene.add(toucan);
    addCircle(colliders, { x, z, r: 0.35 });
  });
  const flyers = MACAW_COLORS.map((color, index) => {
    const bird = buildMacaw(kit, color);
    scene.add(bird);
    return { bird, phase: (index / MACAW_COLORS.length) * Math.PI * 2, height: 11 + index };
  });
  animations.push((delta, time) => {
    flyers.forEach(({ bird, phase, height }) => {
      const angle = time * 0.4 + phase;
      bird.position.set(Math.cos(angle) * 16, height + Math.sin(time * 2 + phase), Math.sin(angle) * 16);
      bird.rotation.y = -angle;
      bird.userData.wings.forEach((wing, side) => (wing.rotation.z = (side ? 1 : -1) * (0.8 + Math.sin(time * 9 + phase) * 0.7)));
    });
  });
}

/** Base de madera maciza con piso de tablas (casa del árbol y mirador). */
function addDeck(kit, scene, colliders, { x, z, size, top }) {
  scene.add(at(kit.box(size, top - 0.4, size, 0x6b4423), x, (top - 0.4) / 2, z));
  scene.add(at(kit.box(size + 0.3, 0.4, size + 0.3, 0xc58b4e), x, top - 0.2, z));
  for (let post = -1; post <= 1; post += 2) {
    [-1, 1].forEach((side) => scene.add(at(kit.cyl(0.25, 0.25, top, 0x8a5a2b, 8), x + post * (size / 2 + 0.1), top / 2, z + side * (size / 2 + 0.1))));
  }
  addBox(colliders, { x, z, width: size, depth: size, top });
}

/** Casa del árbol en la ceiba gigante: escalera al sur y puente colgante al norte hasta el mirador. */
function buildTreehouse(kit, scene, colliders, animations) {
  const { x, z, size, top } = TREEHOUSE;
  addDeck(kit, scene, colliders, TREEHOUSE);
  scene.add(at(buildCeiba(kit), x, 0, z));
  addCircle(colliders, { x, z, r: 1.1 });
  // Casita en la esquina con techo de palma.
  const hut = { x: x - 2.2, z: z - 2.2 };
  scene.add(at(kit.box(2.4, 2.2, 2.4, 0xd9a066), hut.x, top + 1.1, hut.z));
  const roof = at(kit.cone(2.2, 1.6, 0xd9b26a, 4), hut.x, top + 3, hut.z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
  scene.add(at(kit.box(0.9, 1.4, 0.05, 0x3b2414), hut.x + 0.4, top + 0.7, hut.z + 1.23));
  addBox(colliders, { x: hut.x, z: hut.z, width: 2.4, depth: 2.4, top: 99 });
  sign(kit, scene, '🌳 Casa del Árbol', x, top + 4.6, z + 3, '#ffd93d');

  // Escalera: cada escalón sube menos de lo que se sube sin saltar y es más hondo que la jugadora.
  const stepDepth = 0.6;
  for (let step = 0; step < STAIR_STEPS; step += 1) {
    const height = (top / STAIR_STEPS) * (step + 1);
    const sz = z + size / 2 + (STAIR_STEPS - step - 0.5) * stepDepth;
    scene.add(at(kit.box(2.4, height, stepDepth, step % 2 ? 0x8a5a2b : 0xa0703c), x, height / 2, sz));
    addBox(colliders, { x, z: sz, width: 2.4, depth: stepDepth, top: height });
  }

  // Mirador al otro lado del puente, con su árbol.
  addDeck(kit, scene, colliders, { ...LOOKOUT, top });
  scene.add(at(buildJungleTree(kit, { height: 11 }), LOOKOUT.x - 1.7, 0, LOOKOUT.z - 1.7));
  addCircle(colliders, { x: LOOKOUT.x - 1.7, z: LOOKOUT.z - 1.7, r: 0.6 });

  // Puente colgante: tablas que se mecen un poco y cuerdas a los lados (no se cae una por ahí).
  const fromZ = LOOKOUT.z + LOOKOUT.size / 2;
  const toZ = z - size / 2;
  const length = toZ - fromZ;
  const bridge = new THREE.Group();
  const planks = [];
  for (let pz = fromZ + 0.3; pz < toZ; pz += 0.6) {
    const t = (pz - fromZ) / length;
    const plank = at(kit.box(1.6, 0.12, 0.5, t > 0.5 ? 0xc58b4e : 0xb07a43), BRIDGE_X, top - 0.06 - Math.sin(t * Math.PI) * 0.15, pz);
    planks.push({ plank, t });
    bridge.add(plank);
  }
  [-0.9, 0.9].forEach((side) => {
    bridge.add(at(kit.box(0.06, 0.06, length, 0xe8d3a0), BRIDGE_X + side, top + 1, fromZ + length / 2));
    for (let pz = fromZ; pz <= toZ + 0.01; pz += length / 4) bridge.add(at(kit.box(0.06, 1, 0.06, 0xe8d3a0), BRIDGE_X + side, top + 0.5, pz));
    addBox(colliders, { x: BRIDGE_X + side, z: fromZ + length / 2, width: 0.2, depth: length, top: top + 1 });
  });
  scene.add(bridge);
  addBox(colliders, { x: BRIDGE_X, z: fromZ + length / 2, width: 1.6, depth: length, top });
  // Bajo el puente, matas (para que se note que por ahí no se pasa).
  for (let pz = fromZ + 0.8; pz < toZ; pz += 1.6) scene.add(at(kit.sphere(1, 0x2e8b3e, 8), BRIDGE_X, 0.8, pz));
  sign(kit, scene, '🌉 Puente colgante', BRIDGE_X + 2.5, top + 2.4, fromZ + length / 2);

  // Un perezoso cuelga bajo el puente.
  const sloth = buildSloth(kit);
  sloth.position.set(BRIDGE_X + 0.3, top - 0.2, fromZ + length * 0.6);
  scene.add(sloth);
  animations.push((delta, time) => {
    planks.forEach(({ plank, t }) => (plank.position.y = top - 0.06 - Math.sin(t * Math.PI) * (0.15 + Math.sin(time * 2) * 0.04)));
    sloth.rotation.z = Math.sin(time * 0.7) * 0.15;
  });
}

/** El río Amazonas por el oeste: embarcadero con canoas, delfines rosados y un caimán dormido. */
function buildRiver(kit, scene, colliders, animations) {
  const width = 30;
  scene.add(at(kit.plane(width, 180, RIVER_COLOR), RIVER_EDGE_X - width / 2, 0.04, 0));
  scene.add(at(kit.plane(2.5, 180, 0x8a6a4a), RIVER_EDGE_X + 0.6, 0.035, 0));
  sign(kit, scene, '🌊 Río Amazonas', RIVER_EDGE_X - 4, 3.5, 20);

  // Embarcadero: se puede caminar hasta la punta (encima hay una rana dorada).
  const dock = { x: RIVER_EDGE_X - 1, z: -30, width: 7, depth: 2 };
  scene.add(at(kit.box(dock.width, 0.3, dock.depth, 0x8a5a2b), dock.x, 0.15, dock.z));
  for (let px = dock.x - dock.width / 2 + 0.3; px < dock.x + dock.width / 2; px += 1.6) {
    [-1, 1].forEach((side) => scene.add(at(kit.cyl(0.1, 0.1, 1.2, 0x6b3b1f, 6), px, 0.3, dock.z + side * 0.9)));
  }
  addBox(colliders, { x: dock.x, z: dock.z, width: dock.width, depth: dock.depth, top: 0.3 });
  sign(kit, scene, '🛶 Embarcadero', dock.x, 2.6, dock.z - 1.5);
  const canoes = [0x8a5a2b, 0xc0392b, 0x2b6cb0].map((color, index) => {
    const canoe = buildCanoe(kit, color);
    canoe.position.set(dock.x - 1.5 + index * 1.8, 0, dock.z - 2.6 - index * 0.3);
    canoe.rotation.y = Math.PI / 2 + index * 0.15;
    scene.add(canoe);
    return canoe;
  });

  const dolphins = [-10, 18, 40].map((z, index) => {
    const dolphin = buildPinkDolphin(kit);
    scene.add(dolphin);
    return { dolphin, z, phase: index * 2.1 };
  });

  const caiman = buildCaiman(kit);
  caiman.position.set(RIVER_EDGE_X + 2.5, 0, 6);
  caiman.rotation.y = -Math.PI / 2 - 0.3;
  scene.add(caiman);
  addCircle(colliders, { x: RIVER_EDGE_X + 2.5, z: 6, r: 1.3 });
  const snore = kit.label('💤', { background: 'rgba(255,255,255,0)', height: 0.8 });
  scene.add(snore.sprite);

  animations.push((delta, time) => {
    canoes.forEach((canoe, index) => {
      canoe.position.y = Math.sin(time * 1.5 + index) * 0.06 - 0.1;
      canoe.rotation.z = Math.sin(time * 1.1 + index) * 0.05;
    });
    dolphins.forEach(({ dolphin, z, phase }) => {
      // Cada delfín sale a saltar un rato y vuelve a nadar bajo el agua.
      const cycle = (time * 0.5 + phase) % 3;
      const jump = cycle < 1 ? Math.sin(cycle * Math.PI) : 0;
      dolphin.visible = cycle < 1;
      dolphin.position.set(RIVER_EDGE_X - 7 - phase, -0.6 + jump * 2.4, z + cycle * 5);
      dolphin.rotation.x = -Math.cos(cycle * Math.PI) * 0.8;
    });
    const rise = (time * 0.5) % 1;
    snore.sprite.position.set(RIVER_EDGE_X + 1.6, 1 + rise * 1.2, 6 + 1.5);
    snore.sprite.material.opacity = 1 - rise;
    caiman.scale.y = 1 + Math.sin(time * 1.5) * 0.06;
  });
}

/** Lago con victorias regias: se cruza saltando de hoja en hoja; si se cae al agua, vuelve a la orilla. */
function buildPond(kit, scene, colliders, animations, random) {
  const { x, z, r } = POND;
  scene.add(at(kit.disc(r + 1.2, 0x8a6a4a), x, 0.03, z));
  scene.add(at(kit.disc(r, RIVER_COLOR), x, 0.05, z));
  LILY_PADS.forEach((pad) => {
    scene.add(at(buildLilyPad(kit, { radius: pad.half + 0.3, flower: pad.flower }), pad.x, LILY_TOP - 0.06, pad.z));
    addBox(colliders, { x: pad.x, z: pad.z, width: pad.half * 2, depth: pad.half * 2, top: LILY_TOP });
  });
  // Unas cuantas hojas pequeñas de adorno (no se pueden pisar).
  for (let index = 0; index < 6; index += 1) {
    const angle = random() * Math.PI * 2;
    scene.add(at(buildLilyPad(kit, { radius: 0.5 }), x + Math.cos(angle) * (r - 1.2), 0.08, z + Math.sin(angle) * (r - 1.2)));
  }
  sign(kit, scene, '🪷 Lago de las victorias regias', x + 4, 3, z - r - 1);
  // Ranitas verdes que saltan por la orilla.
  const frogs = [0, 1, 2].map((index) => {
    const frog = buildFrog(kit);
    scene.add(frog);
    return { frog, angle: 1 + index * 1.4 };
  });
  animations.push((delta, time) => {
    frogs.forEach((entry, index) => {
      const hop = (time * 0.8 + index * 0.3) % 1;
      if (hop < 0.02) entry.angle += 0.25;
      const distance = r + 1.6;
      entry.frog.position.set(x + Math.cos(entry.angle) * distance, Math.sin(Math.min(1, hop * 2.5) * Math.PI) * 0.6, z + Math.sin(entry.angle) * distance);
      entry.frog.rotation.y = -entry.angle;
    });
  });
}

/** Cascada que cae de una roca: detrás del agua queda un hueco escondido. */
function buildWaterfall(kit, scene, colliders, animations) {
  const { x, z, width, depth, height } = CLIFF;
  scene.add(at(kit.box(width, height, depth, 0x7d8a80), x, height / 2, z));
  scene.add(at(kit.box(width - 3, 1.5, depth - 1, 0x2e8b3e), x, height + 0.5, z));
  addBox(colliders, { x, z, width, depth, top: 99 });
  const front = z + depth / 2;
  const curtainZ = front + 1.6;
  scene.add(at(kit.box(4, height - 0.5, 0.15, 0x9fe0ff, { opacity: 0.55 }), x, (height - 0.5) / 2, curtainZ));
  scene.add(at(kit.box(4.4, 0.5, 2, 0x7d8a80), x, height - 0.25, front + 1));
  scene.add(at(kit.disc(4, 0x6fc3d9), x, 0.04, curtainZ + 2.2));
  const streaks = Array.from({ length: 8 }, (_, index) => {
    const streak = at(kit.box(0.12, 1.4, 0.05, 0xffffff, { opacity: 0.8 }), x - 1.7 + index * 0.48, 0, curtainZ + 0.1);
    scene.add(streak);
    return { streak, offset: index * 0.37 };
  });
  const foam = at(kit.torus(2, 0.18, 0xffffff), x, 0.1, curtainZ + 0.6);
  foam.rotation.x = Math.PI / 2;
  scene.add(foam);
  sign(kit, scene, '💧 Cascada', x + 4, height + 2, front + 1);
  animations.push((delta, time) => {
    streaks.forEach(({ streak, offset }) => (streak.position.y = height - 1 - ((time * 6 + offset * 9) % (height - 1))));
    foam.scale.setScalar(1 + Math.sin(time * 5) * 0.06);
  });
}

/** Hongos gigantes de colores, cada uno más alto: se sube saltando. */
function buildMushrooms(kit, scene, colliders) {
  MUSHROOMS.forEach(({ x, z, top, color }) => {
    scene.add(at(buildMushroom(kit, { top, radius: 1.25, color }), x, 0, z));
    addBox(colliders, { x, z, width: 2.2, depth: 2.2, top });
  });
  sign(kit, scene, '🍄 Hongos gigantes', 20, 3.2, 44);
}

/** Torre de la tirolesa con su cable; de vez en cuando baja alguien colgada. */
function buildZiplineTower(kit, scene, colliders, animations, random) {
  const tower = { x: 36, z: -32, top: 7 };
  [-1.4, 1.4].forEach((dx) => [-1.4, 1.4].forEach((dz) => scene.add(at(kit.box(0.35, tower.top, 0.35, 0x8a5a2b), tower.x + dx, tower.top / 2, tower.z + dz))));
  scene.add(at(kit.box(3.8, 0.4, 3.8, 0xc58b4e), tower.x, tower.top, tower.z));
  const roof = at(kit.cone(3, 1.8, 0xd9b26a, 4), tower.x, tower.top + 3, tower.z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
  [-1.4, 1.4].forEach((dx) => scene.add(at(kit.box(0.2, 2.2, 0.2, 0x8a5a2b), tower.x + dx, tower.top + 1.1, tower.z)));
  for (let rung = 0.5; rung < tower.top; rung += 0.6) scene.add(at(kit.box(1, 0.08, 0.08, 0x6b3b1f), tower.x, rung, tower.z + 1.6));
  addBox(colliders, { x: tower.x, z: tower.z, width: 3.2, depth: 3.2, top: 99 });
  sign(kit, scene, '🌿 Tirolesa', tower.x, tower.top + 4.6, tower.z);

  const start = new THREE.Vector3(tower.x, tower.top + 1.8, tower.z);
  const end = new THREE.Vector3(76, 3, -56);
  const cable = at(new THREE.Group(), (start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
  cable.add(kit.box(0.06, 0.06, start.distanceTo(end), 0x333333));
  cable.lookAt(end);
  scene.add(cable);
  const rider = createAvatar(kit, randomLook(random));
  rider.update(0, { seated: true, cheer: true });
  const hanger = new THREE.Group();
  rider.root.position.y = -2.9;
  hanger.add(rider.root, at(kit.box(0.3, 0.25, 0.5, 0xffd93d), 0, -0.1, 0));
  scene.add(hanger);
  animations.push((delta, time) => {
    const t = (time / 7) % 1;
    hanger.position.lerpVectors(start, end, t);
    hanger.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    rider.update(delta, { seated: true, cheer: true });
  });
}

/** El árbol de las guacamayas, al lado del coro: cantan y se mueven en su rama. */
function buildMacawTree(kit, scene, colliders, animations) {
  const tree = { x: 0, z: -48 };
  scene.add(at(kit.cyl(1, 1.3, 9, 0x6b4423, 10), tree.x, 4.5, tree.z));
  scene.add(at(kit.sphere(4, 0x2e8b3e, 10), tree.x, 10, tree.z));
  scene.add(at(kit.sphere(3, 0x3fae4a, 10), tree.x + 3, 9, tree.z + 1));
  const branch = at(kit.cyl(0.2, 0.3, 8, 0x6b4423, 8), tree.x, 5.5, tree.z + 1.4);
  branch.rotation.z = Math.PI / 2;
  scene.add(branch);
  addCircle(colliders, { x: tree.x, z: tree.z, r: 1.3 });
  const birds = MACAW_COLORS.map((color, index) => {
    const bird = buildMacaw(kit, color);
    bird.position.set(tree.x - 3 + index * 2, 5.6, tree.z + 1.4);
    bird.scale.setScalar(1.3);
    scene.add(bird);
    return bird;
  });
  animations.push((delta, time) => {
    // Cantan por turnos, como en el juego del coro.
    const singer = Math.floor(time * 1.5) % birds.length;
    birds.forEach((bird, index) => {
      const singing = index === singer;
      bird.position.y = 5.6 + (singing ? Math.abs(Math.sin(time * 12)) * 0.3 : 0);
      bird.userData.wings.forEach((wing, side) => (wing.rotation.z = singing ? (side ? 1 : -1) * 0.8 : 0));
    });
  });
}

/** La guía de la selva frente a la maloca: da consejos para cuidar la selva. */
function buildGuide(kit, scene, colliders, animations, random) {
  const spot = { x: -7, z: 13 };
  const avatar = createAvatar(kit, {
    ...randomLook(random),
    skin: { color: '#a0673f' },
    shirt: { color: '#3fae4a', stripe: '#ffd93d' },
    pants: { color: '#8a5a2b' },
    hat: { kind: 'brim', color: '#d9b26a', band: '#e63946' },
    extra: { kind: 'backpack', color: '#2b6cb0' },
  });
  avatar.root.position.set(spot.x, 0, spot.z);
  avatar.root.rotation.y = 2.4;
  avatar.shadow.position.set(spot.x, 0.03, spot.z);
  scene.add(avatar.root, avatar.shadow);
  addCircle(colliders, { x: spot.x, z: spot.z, r: 0.6 });
  const name = kit.label('🌿 Guía Yaku', { height: 0.45 });
  name.sprite.position.set(spot.x, 3.2, spot.z);
  const talk = kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
  talk.sprite.position.set(spot.x, 3.9, spot.z);
  talk.sprite.visible = false;
  scene.add(name.sprite, talk.sprite);
  let timer = 2;
  animations.push((delta) => {
    avatar.update(delta, { speed: 0 });
    timer -= delta;
    if (timer <= 0) {
      talk.sprite.visible = !talk.sprite.visible;
      if (talk.sprite.visible) talk.setText(pickLine(GUIDE_LINES, random));
      timer = talk.sprite.visible ? 2.8 : 3 + random() * 3;
    }
  });
}

/** Helechos y matas por todo el parque (InstancedMesh: muchos sin pesar). */
function buildFerns(kit, scene, colliders, random) {
  const spots = [];
  while (spots.length < 70) {
    const angle = random() * Math.PI * 2;
    const radius = 16 + random() * 48;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    // Ni en el agua ni en el camino de la entrada.
    if (x < RIVER_EDGE_X + 2 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 2 || Math.abs(x) < 5 || isBlocked(colliders, x, z, 1)) continue;
    spots.push({ x, z, scale: 0.7 + random() * 0.7 });
  }
  const matrix = new THREE.Matrix4();
  const ferns = new THREE.InstancedMesh(kit.geometry('fern-cone', () => new THREE.ConeGeometry(1.1, 1.3, 6)), kit.mat(0x3fae4a), spots.length);
  const leaves = new THREE.InstancedMesh(kit.geometry('fern-top', () => new THREE.SphereGeometry(0.7, 7, 5)), kit.mat(0x2e8b3e), spots.length);
  spots.forEach(({ x, z, scale }, index) => {
    matrix.makeScale(scale, scale, scale).setPosition(x, 0.65 * scale, z);
    ferns.setMatrixAt(index, matrix);
    matrix.makeScale(scale, scale * 0.7, scale).setPosition(x + 0.4 * scale, 0.5 * scale, z + 0.3 * scale);
    leaves.setMatrixAt(index, matrix);
  });
  scene.add(ferns, leaves);
}

/** Monos que saltan de árbol en árbol (y de la casa del árbol al mirador). */
function buildMonkeys(kit, scene, animations) {
  const routes = [
    { from: new THREE.Vector3(-18, 7, 20), to: new THREE.Vector3(-8, 7, 30), speed: 0.35 },
    { from: new THREE.Vector3(16, 7.5, 28), to: new THREE.Vector3(8, 7, 34), speed: 0.3 },
    { from: new THREE.Vector3(37, 4, 21), to: new THREE.Vector3(39.5, 4, 2), speed: 0.18 },
  ];
  const monkeys = routes.map((route) => {
    const monkey = buildMonkey(kit);
    scene.add(monkey);
    return { monkey, ...route };
  });
  const spot = new THREE.Vector3();
  animations.push((delta, time) => {
    monkeys.forEach(({ monkey, from, to, speed }, index) => {
      // Ida y vuelta, con una pausa en cada punta (ahí mueve la cola).
      const cycle = (time * speed + index * 0.3) % 2;
      const leg = cycle < 1 ? cycle : 2 - cycle;
      const t = Math.min(1, Math.max(0, (leg - 0.25) * 2));
      spot.lerpVectors(from, to, t);
      spot.y += Math.sin(t * Math.PI) * 3;
      monkey.position.copy(spot);
      monkey.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + (cycle < 1 ? 0 : Math.PI);
      monkey.userData.tail.rotation.z = Math.sin(time * 5 + index) * 0.6;
    });
  });
}

/** Mariposas morpho azules que revolotean por el parque. */
function buildButterflies(kit, scene, animations, random) {
  const butterflies = Array.from({ length: 10 }, (_, index) => {
    const butterfly = buildButterfly(kit, index % 4 === 3 ? 0xff9f43 : 0x2f8fff);
    butterfly.scale.setScalar(1.3);
    scene.add(butterfly);
    const angle = random() * Math.PI * 2;
    const radius = 14 + random() * 40;
    return { butterfly, x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, phase: random() * 6, size: 2 + random() * 3 };
  });
  animations.push((delta, time) => {
    butterflies.forEach(({ butterfly, x, z, phase, size }) => {
      const angle = time * 0.7 + phase;
      butterfly.position.set(x + Math.cos(angle) * size, 1.6 + Math.sin(time * 2 + phase) * 0.6, z + Math.sin(angle * 1.3) * size);
      butterfly.rotation.y = -angle;
      flapButterfly(butterfly, time + phase);
    });
  });
}

/** Aguacero de la selva: el cielo se pone gris, llueve un rato y luego sale el arcoíris. */
function buildRain(kit, scene, animations, random) {
  const positions = new Float32Array(RAIN_DROPS * 3);
  for (let index = 0; index < RAIN_DROPS; index += 1) {
    positions[index * 3] = (random() - 0.5) * 130;
    positions[index * 3 + 1] = random() * 30;
    positions[index * 3 + 2] = (random() - 0.5) * 130;
  }
  const geometry = kit.track(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = kit.track(new THREE.PointsMaterial({ color: 0xc8e8ff, size: 0.4, transparent: true, opacity: 0.8 }));
  const rain = new THREE.Points(geometry, material);
  rain.visible = false;
  scene.add(rain);

  const rainbow = at(new THREE.Group(), 0, 0, -90);
  [0xff5f5f, 0xff9f43, 0xffd93d, 0x4caf50, 0x2f8fff, 0x8e44ad].forEach((color, index) => {
    const radius = 46 - index * 1.4;
    const arc = new THREE.Mesh(kit.geometry(`rainbow-${index}`, () => new THREE.TorusGeometry(radius, 0.7, 6, 48, Math.PI)), kit.mat(color, { opacity: 0.75 }));
    rainbow.add(arc);
  });
  rainbow.visible = false;
  scene.add(rainbow);

  const sky = scene.background.clone();
  const cycle = DRY_SECONDS + RAIN_SECONDS + RAINBOW_SECONDS;
  // El primer aguacero llega pronto, para que se vea.
  const offset = DRY_SECONDS - 35;
  animations.push((delta, time) => {
    const moment = (time + offset) % cycle;
    const raining = moment >= DRY_SECONDS && moment < DRY_SECONDS + RAIN_SECONDS;
    const rainProgress = raining ? (moment - DRY_SECONDS) / RAIN_SECONDS : 0;
    // Se oscurece al empezar y se aclara al final.
    const gloom = raining ? Math.min(1, rainProgress * 5, (1 - rainProgress) * 5) : 0;
    scene.background.lerpColors(sky, RAIN_SKY, gloom);
    scene.fog.color.copy(scene.background);
    rain.visible = raining;
    if (raining) {
      const attribute = geometry.getAttribute('position');
      for (let index = 0; index < RAIN_DROPS; index += 1) {
        let y = attribute.array[index * 3 + 1] - delta * 22;
        if (y < 0) y += 30;
        attribute.array[index * 3 + 1] = y;
      }
      attribute.needsUpdate = true;
    }
    const rainbowTime = moment - DRY_SECONDS - RAIN_SECONDS;
    rainbow.visible = rainbowTime > 0;
    if (rainbow.visible) rainbow.scale.set(1, Math.min(1, rainbowTime / 2, (RAINBOW_SECONDS - rainbowTime) / 2), 1);
  });
}
