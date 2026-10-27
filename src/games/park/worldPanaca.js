/**
 * Construye la Granja Panaca en 3D: molino en la plaza, corrales con vacas y ovejas (se puede saltar
 * la cerca), gallinero, estanque con patos, maizal, el establo de la vaca Lola, el galpón del tractor
 * y la pista de la carrera de cerditos (que también usa rides/cerditos.js).
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { addBox, addCircle } from './collision.js';
import { PARK_RADIUS, buildParkBase } from './parkBase.js';
import { buildChicken, buildCornField, buildCow, buildHayBale, buildPig, buildSheep, buildTractor, buildTree } from './props.js';

const PIG_TRACK = { x: 40, z: -30, inner: 7, outer: 11 };
/** Carriles de la pista de cerditos (radio de cada uno). */
export const PIG_LANES = [7.9, 8.8, 9.7, 10.6];
export const PIG_COLORS = [0xff8ac4, 0xffd93d, 0x5ab0ff, 0x4dd4ac];
const COW_PEN = { x: 40, z: 12, width: 16, depth: 12 };
const SHEEP_PEN = { x: -40, z: 12, width: 16, depth: 12 };
const COOP = { x: 16, z: 40 };
const POND = { x: -18, z: 40, r: 6 };
const BARN = { x: -40, z: -32 };
const SHED = { x: 0, z: -48 };
const TREES = [
  [-10, 24], [10, 24], [-10, 32], [-30, 26], [-34, 44], [-48, 30], [-52, -12], [52, -12],
  [-14, -58], [14, -58], [-26, 54], [30, 52], [-56, -30], [24, -50],
];

const LOOK = { ground: 0x9ad66b, path: 0xd9b98a, plaza: 0xe6cfa0, hedge: 0x5aa64a, gate: 0xe63946, sign: '#ffffff' };

export function buildPanacaPark(kit, scene, random, world) {
  const { colliders, animations } = buildParkBase(kit, scene, random, { ...world, look: LOOK });

  buildWindmill(kit, scene, colliders, animations);
  buildPen(kit, scene, colliders, animations, random, COW_PEN, 3, () => buildCow(kit, { spots: random() < 0.5 ? 0x2b2140 : 0x8a5a2b }));
  buildPen(kit, scene, colliders, animations, random, SHEEP_PEN, 4, () => buildSheep(kit));
  buildCoop(kit, scene, colliders, animations, random);
  buildPond(kit, scene, colliders, animations);
  buildCorn(kit, scene, colliders, random);
  TREES.forEach(([x, z]) => {
    scene.add(at(buildTree(kit, 0.9 + random() * 0.4), x, 0, z));
    addCircle(colliders, { x, z, r: 0.5 });
  });
  buildBarn(kit, scene, colliders);
  buildShed(kit, scene, colliders);
  const pigTrack = buildPigTrack(kit, scene, colliders, animations, random);

  let time = 0;
  return {
    colliders,
    pigTrack,
    update(delta) {
      time += delta;
      animations.forEach((animate) => animate(delta, time));
    },
  };
}

function buildWindmill(kit, scene, colliders, animations) {
  scene.add(at(kit.cyl(1.8, 2.6, 8, 0xfaf3e3, 12), 0, 4, 0));
  scene.add(at(kit.cone(2.4, 2.6, 0xe63946, 12), 0, 9.3, 0));
  scene.add(at(kit.box(1.2, 2, 0.1, 0x8a5a2b), 0, 1, 2.45));
  const blades = at(new THREE.Group(), 0, 7.2, 2.3);
  blades.add(kit.cyl(0.3, 0.3, 0.4, 0x8a5a2b, 8));
  blades.children[0].rotation.x = Math.PI / 2;
  [0, 1, 2, 3].forEach((index) => {
    const blade = at(new THREE.Group(), 0, 0, 0.2);
    blade.rotation.z = (index * Math.PI) / 2;
    blade.add(at(kit.box(0.9, 4.2, 0.08, 0xffffff), 0, 2.4, 0));
    blade.add(at(kit.box(0.15, 4.2, 0.12, 0x8a5a2b), -0.4, 2.4, 0));
    blades.add(blade);
  });
  scene.add(blades);
  addCircle(colliders, { x: 0, z: 0, r: 2.8 });
  animations.push((delta) => (blades.rotation.z += delta * 0.8));
}

/** Corral con cerca baja (se puede saltar) y animales que pastan dentro. */
function buildPen(kit, scene, colliders, animations, random, pen, count, buildAnimal) {
  const { x, z, width, depth } = pen;
  const fence = (cx, cz, w, d) => {
    scene.add(at(kit.box(w, 0.12, d, 0xffffff), cx, 0.9, cz));
    scene.add(at(kit.box(w, 0.12, d, 0xffffff), cx, 0.5, cz));
    addBox(colliders, { x: cx, z: cz, width: Math.max(w, 0.3), depth: Math.max(d, 0.3), top: 1.0 });
  };
  fence(x, z - depth / 2, width, 0.1);
  fence(x, z + depth / 2, width, 0.1);
  fence(x - width / 2, z, 0.1, depth);
  fence(x + width / 2, z, 0.1, depth);
  for (let px = -width / 2; px <= width / 2; px += 2) {
    [-depth / 2, depth / 2].forEach((pz) => scene.add(at(kit.box(0.15, 1.1, 0.15, 0x8a5a2b), x + px, 0.55, z + pz)));
  }
  scene.add(at(kit.plane(width, depth, 0x7cc35a), x, 0.02, z));

  const animals = Array.from({ length: count }, () => {
    const mesh = buildAnimal();
    const animal = { mesh, x: x + (random() - 0.5) * (width - 4), z: z + (random() - 0.5) * (depth - 4), heading: random() * Math.PI * 2, timer: random() * 3 };
    scene.add(mesh);
    return animal;
  });
  animations.push((delta, time) => {
    animals.forEach((animal, index) => {
      animal.timer -= delta;
      if (animal.timer <= 0) {
        animal.timer = 2 + random() * 4;
        animal.heading += (random() - 0.5) * 2.5;
        animal.walking = random() < 0.6;
      }
      if (animal.walking) {
        const nextX = animal.x + Math.sin(animal.heading) * delta * 0.8;
        const nextZ = animal.z + Math.cos(animal.heading) * delta * 0.8;
        if (Math.abs(nextX - x) < width / 2 - 1.6 && Math.abs(nextZ - z) < depth / 2 - 1.6) {
          animal.x = nextX;
          animal.z = nextZ;
        } else {
          animal.heading += Math.PI / 2;
        }
      }
      animal.mesh.position.set(animal.x, animal.walking ? Math.abs(Math.sin(time * 6 + index)) * 0.05 : 0, animal.z);
      animal.mesh.rotation.y = animal.heading;
    });
  });
}

function buildCoop(kit, scene, colliders, animations, random) {
  const { x, z } = COOP;
  scene.add(at(kit.box(5, 2.4, 4, 0xfff1d6), x, 1.2, z));
  scene.add(at(kit.box(5.6, 0.25, 4.6, 0xe63946), x, 2.5, z));
  scene.add(at(kit.box(1, 1.2, 0.1, 0x8a5a2b), x, 0.6, z + 2.02));
  const sign = kit.label('🐔 Gallinero', { background: '#e63946', color: '#ffffff', height: 0.8 });
  scene.add(at(sign.sprite, x, 3.5, z + 2.4));
  addBox(colliders, { x, z, width: 5.6, depth: 4.6, top: 2.6 });
  // Pacas de heno para trepar al techo (hay un huevo dorado arriba).
  [
    { bx: 19.3, bz: 41.4, height: 1.0 },
    { bx: 19.3, bz: 39.6, height: 1.9 },
  ].forEach(({ bx, bz, height }) => {
    scene.add(at(buildHayBale(kit, height), bx, 0, bz));
    addBox(colliders, { x: bx, z: bz, width: 1.6, depth: 1.2, top: height });
  });

  const chickens = Array.from({ length: 5 }, (_, index) => {
    const mesh = buildChicken(kit, index % 2 ? 0xffffff : 0xc58b4e);
    mesh.scale.setScalar(0.6);
    const chicken = { mesh, angle: random() * Math.PI * 2, radius: 4 + random() * 3, speed: 0.3 + random() * 0.4 };
    scene.add(mesh);
    return chicken;
  });
  animations.push((delta, time) => {
    chickens.forEach((chicken, index) => {
      chicken.angle += chicken.speed * delta;
      const cx = x + Math.cos(chicken.angle) * chicken.radius;
      const cz = z + 1 + Math.sin(chicken.angle) * chicken.radius * 0.6 + 3;
      chicken.mesh.position.set(cx, Math.abs(Math.sin(time * 8 + index)) * 0.08, cz);
      chicken.mesh.rotation.y = -chicken.angle;
    });
  });
}

function buildPond(kit, scene, colliders, animations) {
  const { x, z, r } = POND;
  scene.add(at(kit.disc(r + 0.6, 0xd9b98a), x, 0.03, z));
  scene.add(at(kit.disc(r, 0x5ab0ff), x, 0.05, z));
  addCircle(colliders, { x, z, r });
  const ducks = [0, 1, 2].map((index) => {
    const duck = new THREE.Group();
    duck.add(at(kit.box(0.6, 0.4, 0.8, 0xffd93d), 0, 0.25, 0));
    duck.add(at(kit.box(0.35, 0.35, 0.35, 0xffd93d), 0, 0.6, 0.3));
    duck.add(at(kit.box(0.2, 0.08, 0.2, 0xff9f43), 0, 0.55, 0.55));
    scene.add(duck);
    return { duck, phase: (index / 3) * Math.PI * 2 };
  });
  animations.push((delta, time) => {
    ducks.forEach(({ duck, phase }) => {
      const angle = time * 0.25 + phase;
      duck.position.set(x + Math.cos(angle) * (r - 2), Math.sin(time * 3 + phase) * 0.04, z + Math.sin(angle) * (r - 2.5));
      duck.rotation.y = -angle;
    });
  });
}

function buildCorn(kit, scene, colliders, random) {
  const positions = [];
  for (let z = 26; z <= 48; z += 3.5) {
    for (let x = 28; x <= 56; x += 2) {
      if (Math.hypot(x, z) > PARK_RADIUS - 2) continue;
      const stalk = { x: x + (random() - 0.5) * 0.4, z, scale: 0.85 + random() * 0.3 };
      positions.push(stalk);
      addCircle(colliders, { x: stalk.x, z: stalk.z, r: 0.35 });
    }
  }
  scene.add(buildCornField(kit, positions));
}

/** Establo rojo de la vaca Lola (la del ordeño), con Lola en la puerta. */
function buildBarn(kit, scene, colliders) {
  const { x, z } = BARN;
  scene.add(at(kit.box(12, 7, 10, 0xc0392b), x, 3.5, z));
  const roof = at(kit.cone(8.6, 4, 0x6b2b2b, 4), x, 9, z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
  scene.add(at(kit.box(4, 4.5, 0.15, 0xffffff), x + 2, 2.25, z + 5.02));
  scene.add(at(kit.box(3.4, 4, 0.18, 0x8a3324), x + 2, 2, z + 5.05));
  const sign = kit.label('🐄 Establo de Lola', { background: '#ffffff', height: 0.9 });
  scene.add(at(sign.sprite, x + 2, 6, z + 5.4));
  addBox(colliders, { x, z, width: 12, depth: 10, top: 99 });
  const lola = buildCow(kit, { spots: 0x8a5a2b });
  lola.position.set(x + 7.5, 0, z + 7);
  lola.rotation.y = 0.9;
  scene.add(lola);
  addCircle(colliders, { x: x + 7.5, z: z + 7, r: 1.4 });
}

function buildShed(kit, scene, colliders) {
  const { x, z } = SHED;
  scene.add(at(kit.box(10, 4, 6, 0x8fb3c7), x, 2, z));
  scene.add(at(kit.box(11, 0.3, 7, 0x5a6b78), x, 4.15, z));
  addBox(colliders, { x, z, width: 10, depth: 6, top: 99 });
  const tractor = buildTractor(kit);
  tractor.position.set(x - 9, 0, z + 7);
  tractor.rotation.y = 0.5;
  scene.add(tractor);
  addCircle(colliders, { x: x - 9, z: z + 7, r: 2.6 });
}

/** Pista redonda de la carrera de cerditos; en el parque los cerditos dan vueltas solos. */
function buildPigTrack(kit, scene, colliders, animations, random) {
  const { x, z, inner, outer } = PIG_TRACK;
  scene.add(at(kit.cyl(outer + 0.3, outer + 0.3, 0.12, 0xb07a40, 40), x, 0.06, z));
  scene.add(at(kit.cyl(inner - 0.2, inner - 0.2, 0.16, 0x7cc35a, 32), x, 0.08, z));
  const fence = at(kit.torus(outer + 0.5, 0.15, 0xffffff), x, 0.8, z);
  fence.rotation.x = Math.PI / 2;
  scene.add(fence);
  // Meta: raya blanca y arco.
  scene.add(at(kit.box(0.3, 0.05, outer - inner + 0.6, 0xffffff), x, 0.14, z + (inner + outer) / 2));
  scene.add(at(kit.box(0.3, 3.2, 0.3, 0xffffff), x, 1.6, z + outer + 0.8));
  scene.add(at(kit.box(0.3, 3.2, 0.3, 0xffffff), x, 1.6, z + inner - 0.8));
  scene.add(at(kit.box(0.3, 0.5, outer - inner + 1.9, 0xe63946), x, 3.2, z + (inner + outer) / 2));
  const sign = kit.label('🐷 ¡Carrera de Cerditos!', { background: '#ffd93d', height: 0.9 });
  scene.add(at(sign.sprite, x, 4.2, z + (inner + outer) / 2));
  addCircle(colliders, { x, z, r: outer + 0.8 });

  const group = at(new THREE.Group(), x, 0.12, z);
  const pigs = PIG_COLORS.map((color, lane) => {
    const mesh = buildPig(kit, color);
    group.add(mesh);
    return { mesh, lane, angle: random() * Math.PI * 2, speed: 4 + random() * 1.5 };
  });
  scene.add(group);

  const handle = { center: new THREE.Vector3(x, 0.12, z), lanes: PIG_LANES, group, idle: true };
  animations.push((delta, time) => {
    if (!handle.idle) return;
    pigs.forEach((pig, index) => {
      const radius = PIG_LANES[pig.lane];
      pig.speed += (random() - 0.5) * delta * 2;
      pig.speed = Math.max(3.5, Math.min(6, pig.speed));
      pig.angle += (pig.speed / radius) * delta;
      placePig(pig.mesh, radius, pig.angle, time * 12 + index);
    });
  });
  return handle;
}

/**
 * Coloca un cerdito en la pista: `angle` en radianes (0 = la meta), corre en sentido contrario a
 * las agujas del reloj visto desde arriba, dando saltitos.
 */
export function placePig(mesh, radius, angle, hop = 0) {
  mesh.position.set(Math.sin(angle) * radius, Math.abs(Math.sin(hop)) * 0.25, Math.cos(angle) * radius);
  mesh.rotation.y = angle + Math.PI / 2;
}
