/**
 * Lo común a todos los parques: cielo, montañas, nubes, seto, plaza, caminos hasta cada fila,
 * portada con el nombre y las barandas de las filas. Cada parque añade encima lo suyo.
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { addBox, createColliders } from './collision.js';
import { MAX_QUEUE, QUEUE_SPACING } from './queue.js';
import { addSkyAndLights, buildClouds, buildMountains } from './props.js';

/** Radio del parque por el que se puede caminar. */
export const PARK_RADIUS = 66;
export const SPAWN = { x: 0, z: 52 };
/** Estación del tren (junto a la entrada): desde ahí se viaja a otro parque. */
export const STATION = { x: -9.5, z: 54.5, width: 4, depth: 3 };
export const STATION_PROMPT_DISTANCE = 3.2;

/**
 * Prepara la escena con lo común. `world.look` cambia colores (suelo, caminos, seto, cielo).
 * Devuelve { colliders, animations } para que cada parque siga añadiendo.
 */
export function buildParkBase(kit, scene, random, world) {
  const look = { ground: 0x86cf6a, path: 0xf1d9a8, plaza: 0xf6e4bd, hedge: 0x3f9a4f, gate: 0x7b5cff, sign: '#ffd93d', ...world.look };
  const colliders = createColliders();
  const animations = [];

  addSkyAndLights(scene, { sky: look.sky });
  scene.add(at(kit.disc(260, look.ground), 0, 0, 0));
  scene.add(buildMountains(kit, random));
  const clouds = buildClouds(kit, random);
  scene.add(clouds);
  animations.push((delta) => {
    clouds.children.forEach((cloud) => {
      cloud.position.x += delta * 1.2;
      if (cloud.position.x > 130) cloud.position.x = -130;
    });
  });

  // Seto alrededor del parque.
  const hedgeGeometry = kit.geometry('hedge', () => new THREE.CylinderGeometry(PARK_RADIUS + 3, PARK_RADIUS + 3, 1.6, 72, 1, true));
  scene.add(at(new THREE.Mesh(hedgeGeometry, kit.mat(look.hedge, { side: THREE.DoubleSide })), 0, 0.8, 0));

  buildPaths(kit, scene, world.rides, look);
  buildGate(kit, scene, colliders, `${world.emoji} ${world.name}`, look);
  animations.push(buildStation(kit, scene, colliders));
  world.rides.forEach((ride) => buildQueueArea(kit, scene, ride));
  return { colliders, animations };
}

// ---------- Suelo y caminos ----------

export function pathStrip(kit, from, to, width, color = 0xf1d9a8) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const group = at(new THREE.Group(), (from.x + to.x) / 2, 0.02, (from.z + to.z) / 2);
  group.rotation.y = Math.atan2(dx, dz);
  group.add(kit.plane(width, length, color));
  return group;
}

function buildPaths(kit, scene, rides, look) {
  scene.add(at(kit.disc(13.5, look.path), 0, 0.025, 0));
  scene.add(at(kit.disc(10, look.plaza), 0, 0.03, 0));
  scene.add(pathStrip(kit, { x: 0, z: 10 }, { x: 0, z: 64 }, 6, look.path));
  rides.forEach((ride) => {
    const end = { x: ride.entrance.x - ride.queueDir.x * 3, z: ride.entrance.z - ride.queueDir.z * 3 };
    scene.add(pathStrip(kit, { x: 0, z: 0 }, end, 5, look.path));
  });
}

function buildGate(kit, scene, colliders, title, look) {
  const z = 60;
  [-5.5, 5.5].forEach((x) => {
    scene.add(at(kit.box(2, 7, 2, 0xff9f43), x, 3.5, z));
    scene.add(at(kit.cone(1.5, 1.6, 0xff5fa2, 4), x, 7.8, z));
    addBox(colliders, { x, z, width: 2, depth: 2, top: 99 });
  });
  scene.add(at(kit.box(13, 1.4, 1.2, look.gate), 0, 6.6, z));
  const sign = kit.label(title, { background: look.sign, height: 1.8 });
  scene.add(at(sign.sprite, 0, 8.6, z));
}

/** Estación con un trencito que echa humo (se viaja con él a los otros parques). */
function buildStation(kit, scene, colliders) {
  const { x, z, width, depth } = STATION;
  scene.add(at(kit.box(width + 1, 0.3, depth + 1, 0xc9b28a), x, 0.15, z));
  [-1, 1].forEach((side) => scene.add(at(kit.box(0.2, 2.6, 0.2, 0xffffff), x + side * (width / 2), 1.6, z + depth / 2)));
  const roof = at(kit.box(width + 1.2, 0.3, depth + 1.4, 0xff5f5f), x, 3, z + 0.2);
  roof.rotation.x = 0.12;
  scene.add(roof);
  // Trencito: caldera, cabina, chimenea y ruedas.
  const train = at(new THREE.Group(), x, 0.3, z - 0.3);
  train.add(at(kit.box(1.4, 1.4, 1.2, 0x7b5cff), -0.9, 0.9, 0));
  const boiler = at(kit.cyl(0.55, 0.55, 1.6, 0xff5fa2, 12), 0.6, 0.75, 0);
  boiler.rotation.z = Math.PI / 2;
  train.add(boiler, at(kit.cyl(0.18, 0.25, 0.7, 0x2b2140, 8), 1.1, 1.5, 0));
  [-1.1, -0.3, 0.6, 1.2].forEach((wx) => [-0.62, 0.62].forEach((wz) => {
    const wheel = at(kit.cyl(0.25, 0.25, 0.12, 0xffd93d, 10), wx, 0.25, wz);
    wheel.rotation.x = Math.PI / 2;
    train.add(wheel);
  }));
  scene.add(train);
  const puffs = [0, 1, 2].map(() => {
    const puff = kit.sphere(0.3, 0xffffff, 8, { opacity: 0.8 });
    scene.add(puff);
    return puff;
  });
  scene.add(at(kit.label('🚂 Estación: viajar a otro parque', { background: '#ffd93d', height: 0.7 }).sprite, x, 4, z + 0.5));
  addBox(colliders, { x, z: z - 0.3, width: 3.2, depth: 1.4, top: 99 });
  return (delta, time) => {
    puffs.forEach((puff, index) => {
      const rise = (time * 0.6 + index / 3) % 1;
      puff.position.set(x + 1.1 + rise * 0.6, 2.3 + rise * 1.8, z - 0.3);
      puff.scale.setScalar(0.6 + rise);
    });
  };
}

// ---------- Filas ----------

/** Barandas de la fila y arco con el nombre de la atracción. */
export function buildQueueArea(kit, scene, ride) {
  const { entrance, queueDir } = ride;
  const yaw = Math.atan2(queueDir.x, queueDir.z);
  const length = (MAX_QUEUE - 0.5) * QUEUE_SPACING;
  const area = at(new THREE.Group(), entrance.x, 0, entrance.z);
  area.rotation.y = yaw;
  [-0.95, 0.95].forEach((side) => {
    for (let post = 0; post <= MAX_QUEUE; post += 2) {
      area.add(at(kit.cyl(0.07, 0.07, 1, 0xd4af37, 6), side, 0.5, post * QUEUE_SPACING));
    }
    area.add(at(kit.box(0.05, 0.06, length, 0xff5f5f), side, 0.9, length / 2));
  });
  area.add(at(kit.plane(1.9, length + 1, 0xe9d3a0), 0, 0.035, length / 2 - 0.5));
  // Arco de entrada.
  [-1.4, 1.4].forEach((side) => area.add(at(kit.box(0.3, 3.4, 0.3, 0x7b5cff), side, 1.7, -1)));
  area.add(at(kit.box(3.2, 0.4, 0.4, 0xff5fa2), 0, 3.5, -1));
  scene.add(area);

  const sign = kit.label(`${ride.emoji} ${ride.name}`, { background: '#ffffff', height: 1 });
  scene.add(at(sign.sprite, entrance.x - queueDir.x, 4.4, entrance.z - queueDir.z));
}

