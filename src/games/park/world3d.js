/**
 * Construye el Parque del Café en 3D: plaza con la taza gigante, casitas de colores, cafetal,
 * palmas de cera, guaduas y las 5 atracciones (que también usan los minijuegos de rides/).
 * Devuelve los choques, las animaciones del decorado y las piezas de cada atracción.
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { SCREAMS, createRider, pickLine } from './riders.js';
import { addBox, addCircle } from './collision.js';
import { COASTER_CAR_GAP, buildBumperCar, buildCoasterTrain, buildCoffeeBushes, buildJeep } from './props.js';
import { PARK_RADIUS, buildParkBase } from './parkBase.js';

const KRATER_CENTER = { x: 42, z: -32 };
const CUMBRE = { x: -40, z: -30, height: 32 };
const WHEEL = { x: 0, z: -48, hubY: 15, radius: 12, gondolas: 10 };
const BUMPER = { x: 44, z: 10, radius: 9 };
const KIOSK = { x: 15, z: 12 };

/** Recorrido del Krater (relativo a su centro). La estación es el primer punto. */
const KRATER_POINTS = [
  [-12, 2, 8],
  [-6, 2, 11],
  [2, 6, 12],
  [8, 14, 10],
  [12, 16, 4],
  [13, 8, -4],
  [10, 3, -10],
  [3, 6, -13],
  [-4, 11, -12],
  [-10, 5, -9],
  [-14, 2, -3],
  [-15, 4, 3],
];
const KRATER_TOP = 16;
/** Pendiente a partir de la cual un vagón «está bajando» (y su gente grita). */
export const DROP_SLOPE = -0.2;
/** Silla de La Cumbre que queda libre para la jugadora (la que mira hacia la plaza). */
export const CUMBRE_PLAYER_CHAIR = 1;
const CUMBRE_CHAIRS = 8;
/** Cabinas de la rueda con gente (las demás van vacías). */
const WHEEL_RIDER_CABINS = [0, 2, 3, 5, 7, 8];
const WAVES = ['¡Holaaa! 👋', '¡Qué alto! 😮', '¡Mira el cafetal! 🌿', '¡Allá está mi casa! 🏠'];

/** Velocidad del vagón según la altura: lento arriba, rapidísimo abajo (m/s). */
export const kraterSpeed = (y) => 4 + Math.sqrt(2 * 9.8 * Math.max(0, KRATER_TOP + 1 - y)) * 0.85;

const upAxis = new THREE.Vector3(0, 1, 0);
const lookTarget = new THREE.Vector3();

/**
 * Coloca el tren con el vagón delantero en `u` (0..1 del recorrido). Quien va en un vagón que baja
 * levanta los brazos y, a veces, grita.
 */
export function moveTrain(train, { curve, length }, u, delta, random) {
  train.cars.forEach((car, index) => {
    const carU = (((u - (index * COASTER_CAR_GAP) / length) % 1) + 1) % 1;
    car.mesh.position.copy(curve.getPointAt(carU));
    car.mesh.position.y += 0.35;
    lookTarget.copy(curve.getPointAt((carU + 0.004) % 1));
    lookTarget.y += 0.35;
    car.mesh.up.copy(upAxis);
    car.mesh.lookAt(lookTarget);
    const descending = curve.getTangentAt(carU).y < DROP_SLOPE;
    if (descending !== car.descending) {
      car.descending = descending;
      car.riders.forEach((rider) => {
        rider.setCheer(descending);
        if (descending && random() < 0.6) rider.say(pickLine(SCREAMS, random));
      });
    }
    car.riders.forEach((rider) => rider.update(delta));
  });
}

/** Altura de la silla de La Cumbre en un ciclo de 16 s (para el decorado). */
function cumbreIdleHeight(time) {
  const t = time % 16;
  if (t < 8) return 1.5 + (t / 8) * 26.5;
  if (t < 10) return 28;
  if (t < 11.2) return 28 - ((t - 10) / 1.2) ** 2 * 26.5;
  return 1.5;
}

/** Parque del Café: lo común (cielo, caminos, portada, filas) y lo propio de este parque. */
export function buildCafePark(kit, scene, random, world) {
  const { colliders, animations } = buildParkBase(kit, scene, random, world);
  buildFountain(kit, scene, colliders, animations);
  buildKiosk(kit, scene, colliders);
  buildBenchesAndLamps(kit, scene, colliders);
  buildHouses(kit, scene, colliders);
  buildCafetal(kit, scene, colliders, random);
  buildPalms(kit, scene, colliders, random);
  buildGuaduas(kit, scene, colliders, random);

  const krater = buildKrater(kit, scene, colliders, animations, random);
  const cumbre = buildCumbre(kit, scene, colliders, animations, random);
  const wheel = buildWheel(kit, scene, colliders, animations, random);
  const jipe = buildJipeArea(kit, scene, colliders);
  const bumper = buildBumperArena(kit, scene, colliders, animations, random);

  let time = 0;
  return {
    colliders,
    krater,
    cumbre,
    wheel,
    jipe,
    bumper,
    update(delta) {
      time += delta;
      animations.forEach((animate) => animate(delta, time));
    },
  };
}

function buildFountain(kit, scene, colliders, animations) {
  scene.add(at(kit.cyl(4.4, 4.4, 0.3, 0xffffff, 28), 0, 0.15, 0));
  scene.add(at(kit.cyl(3.2, 2.4, 2.6, 0xffffff, 28), 0, 1.6, 0));
  scene.add(at(kit.cyl(3.2, 3.2, 0.3, 0xff5fa2, 28), 0, 2.3, 0));
  scene.add(at(kit.cyl(2.95, 2.95, 0.12, 0x6b3b1f, 28), 0, 2.86, 0));
  const handle = at(kit.torus(1.0, 0.28, 0xffffff), 3.2, 1.7, 0);
  handle.rotation.y = Math.PI / 2;
  scene.add(handle);
  addCircle(colliders, { x: 0, z: 0, r: 4.4 });

  const steam = Array.from({ length: 5 }, (_, index) => {
    const puff = kit.sphere(0.6, 0xffffff, 8, { opacity: 0.55 });
    puff.userData.offset = index / 5;
    scene.add(puff);
    return puff;
  });
  animations.push((delta, time) => {
    steam.forEach((puff) => {
      const t = (time * 0.25 + puff.userData.offset) % 1;
      puff.position.set(Math.sin(t * 9 + puff.userData.offset * 6) * 0.8, 3 + t * 5, Math.cos(t * 7) * 0.6);
      puff.scale.setScalar(0.6 + t * 1.4);
    });
  });
}

function buildKiosk(kit, scene, colliders) {
  const { x, z } = KIOSK;
  scene.add(at(kit.box(6, 3, 4, 0xfff1d6), x, 1.5, z));
  scene.add(at(kit.box(7, 0.3, 5, 0x8a5a2b), x, 3.15, z));
  // Toldo de rayas y mostrador.
  [0, 1, 2, 3, 4, 5].forEach((index) =>
    scene.add(at(kit.box(1, 0.12, 1.3, index % 2 ? 0xffffff : 0xff5fa2), x - 2.5 + index, 2.6, z + 2.6)),
  );
  scene.add(at(kit.box(5, 1.1, 0.5, 0x7a4a2a), x, 0.55, z + 2.2));
  const sign = kit.label('☕ Tienda de café', { background: '#7a4a2a', color: '#fff4d6', height: 0.9 });
  scene.add(at(sign.sprite, x, 4.2, z + 2.6));
  addBox(colliders, { x, z, width: 7, depth: 5, top: 3.3 });
  // Cajas de café para subir al techo (hay un grano dorado arriba).
  scene.add(at(kit.box(1.4, 1.2, 1.4, 0xc58b4e), 19.4, 0.6, 14.5));
  scene.add(at(kit.box(1.4, 2.3, 1.4, 0xb07a40), 19.4, 1.15, 13));
  addBox(colliders, { x: 19.4, z: 14.5, width: 1.4, depth: 1.4, top: 1.2 });
  addBox(colliders, { x: 19.4, z: 13, width: 1.4, depth: 1.4, top: 2.3 });
}

function buildBenchesAndLamps(kit, scene, colliders) {
  [
    { x: -17, z: 2, along: 'z' },
    { x: 17, z: 2, along: 'z' },
    { x: -9, z: 16, along: 'x' },
    { x: 9, z: 16, along: 'x' },
  ].forEach(({ x, z, along }) => {
    const width = along === 'x' ? 2.6 : 0.9;
    const depth = along === 'x' ? 0.9 : 2.6;
    scene.add(at(kit.box(width, 0.2, depth, 0xb5651d), x, 0.55, z));
    scene.add(at(kit.box(width * 0.9, 0.45, depth * 0.9, 0x6b4426), x, 0.22, z));
    addBox(colliders, { x, z, width, depth, top: 0.65 });
  });
  [20, 30, 40, 50].forEach((z) => {
    [-3.8, 3.8].forEach((x) => {
      scene.add(at(kit.cyl(0.12, 0.15, 4, 0x2b2140, 8), x, 2, z));
      scene.add(at(kit.sphere(0.4, 0xfff2a8, 10, { emissive: 0x806a00 }), x, 4.2, z));
      addCircle(colliders, { x, z, r: 0.3 });
    });
  });
}

/** Casitas de colores al estilo de Salento, junto a la entrada. */
function buildHouses(kit, scene, colliders) {
  const trims = [0xff5fa2, 0x5ab0ff, 0x4dd4ac, 0xffd93d, 0xb57bff, 0xff9f43];
  [-28, -19, -10, 10, 19, 28].forEach((x, index) => {
    const z = 44;
    const trim = trims[index];
    scene.add(at(kit.box(7, 5, 6, 0xfffaf0), x, 2.5, z));
    scene.add(at(kit.box(1.6, 2.6, 0.1, trim), x, 1.3, z + 3.02));
    [-2.3, 2.3].forEach((offset) => {
      scene.add(at(kit.box(1.3, 1.2, 0.1, 0x9fdcff), x + offset, 3.2, z + 3.02));
      scene.add(at(kit.box(1.6, 0.18, 0.12, trim), x + offset, 2.55, z + 3.05));
    });
    scene.add(at(kit.box(6, 0.15, 0.9, trim), x, 2.55, z + 3.4));
    const roof = at(kit.cone(5.3, 2.6, 0xc2553a, 4), x, 6.3, z);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof);
    addBox(colliders, { x, z, width: 7, depth: 6, top: 99 });
  });
}

function buildCafetal(kit, scene, colliders, random) {
  const positions = [];
  for (let z = 20; z <= 36; z += 4) {
    for (let x = -56; x <= -24; x += 2.6) {
      if (Math.hypot(x, z) > PARK_RADIUS - 2) continue;
      const bush = { x: x + (random() - 0.5) * 0.5, z, scale: 0.85 + random() * 0.3 };
      positions.push(bush);
      addCircle(colliders, { x: bush.x, z: bush.z, r: 0.75 * bush.scale });
    }
  }
  scene.add(buildCoffeeBushes(kit, positions));
}

/** Palmas de cera: el árbol nacional, altísimo y delgado. */
function buildPalms(kit, scene, colliders, random) {
  let placed = 0;
  let tries = 0;
  while (placed < 14 && tries < 200) {
    tries += 1;
    const x = 30 + random() * 28;
    const z = 26 + random() * 24;
    if (Math.hypot(x, z) > PARK_RADIUS - 3 || Math.hypot(x - 44, z - 40) < 3) continue;
    const height = 12 + random() * 6;
    scene.add(at(kit.cyl(0.22, 0.32, height, 0xd9d2c0, 8), x, height / 2, z));
    for (let leaf = 0; leaf < 6; leaf += 1) {
      const pivot = at(new THREE.Group(), x, height, z);
      pivot.rotation.y = (leaf / 6) * Math.PI * 2;
      const frond = at(kit.box(0.5, 0.08, 3, 0x3f9a4f), 0, -0.4, 1.4);
      frond.rotation.x = 0.45;
      pivot.add(frond);
      scene.add(pivot);
    }
    addCircle(colliders, { x, z, r: 0.45 });
    placed += 1;
  }
}

function buildGuaduas(kit, scene, colliders, random) {
  [
    { x: -58, z: -8 },
    { x: 58, z: -10 },
    { x: -16, z: -60 },
    { x: 16, z: -60 },
  ].forEach(({ x, z }) => {
    for (let stalk = 0; stalk < 7; stalk += 1) {
      const height = 7 + random() * 4;
      const cane = at(kit.cyl(0.12, 0.14, height, stalk % 2 ? 0x7fbf3f : 0x5fa832, 6), x + (random() - 0.5) * 1.6, height / 2, z + (random() - 0.5) * 1.6);
      cane.rotation.z = (random() - 0.5) * 0.2;
      scene.add(cane);
    }
    addCircle(colliders, { x, z, r: 1.3 });
  });
}

// ---------- Atracciones ----------

function buildKrater(kit, scene, colliders, animations, random) {
  const points = KRATER_POINTS.map(([x, y, z]) => new THREE.Vector3(KRATER_CENTER.x + x, y, KRATER_CENTER.z + z));
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.4);
  const tube = kit.track(new THREE.TubeGeometry(curve, 360, 0.35, 6, true));
  scene.add(new THREE.Mesh(tube, kit.mat(0xff5f5f)));
  const lowerRail = kit.track(new THREE.TubeGeometry(curve, 360, 0.18, 5, true));
  const lower = new THREE.Mesh(lowerRail, kit.mat(0xffd93d));
  lower.position.y = -0.45;
  scene.add(lower);
  for (let index = 0; index < 40; index += 1) {
    const point = curve.getPointAt(index / 40);
    if (point.y < 1.2) continue;
    scene.add(at(kit.cyl(0.16, 0.2, point.y, 0xffffff, 6), point.x, point.y / 2, point.z));
  }
  // Estación.
  const station = points[0];
  scene.add(at(kit.box(4, 1.6, 5, 0x7b5cff), station.x - 2.6, 0.8, station.z));
  scene.add(at(kit.box(5, 0.3, 6, 0xff5fa2), station.x - 1.4, 4.2, station.z));
  [-1, 1].forEach((side) => scene.add(at(kit.box(0.3, 4, 0.3, 0xffffff), station.x - 1.4 + side * 2.2, 2.1, station.z + 2.6)));
  addCircle(colliders, { x: KRATER_CENTER.x, z: KRATER_CENTER.z, r: 16.5 });

  // Tren con visitantes que da vueltas (se esconde cuando la jugadora monta en el suyo).
  const train = buildCoasterTrain(kit, random);
  scene.add(train.group);
  const handle = { curve, length: curve.getLength(), train: train.group };
  let u = 0;
  animations.push((delta) => {
    if (!train.group.visible) return;
    u = (u + (kraterSpeed(curve.getPointAt(u).y) * delta) / handle.length) % 1;
    moveTrain(train, handle, u, delta, random);
  });
  return handle;
}

function buildCumbre(kit, scene, colliders, animations, random) {
  const { x, z, height } = CUMBRE;
  scene.add(at(kit.cyl(4.2, 4.6, 1, 0x9a8fb5, 20), x, 0.5, z));
  const stripes = [0x7b5cff, 0xffffff, 0xff5fa2, 0xffffff];
  for (let index = 0; index < 8; index += 1) {
    scene.add(at(kit.cyl(0.9, 0.9, height / 8, stripes[index % 4], 12), x, 1 + (index + 0.5) * (height / 8), z));
  }
  scene.add(at(kit.cone(1.4, 3, 0xffd93d, 12), x, height + 2.5, z));
  scene.add(at(kit.sphere(0.5, 0xff5f5f, 10, { emissive: 0x660000 }), x, height + 4.2, z));

  const seat = at(new THREE.Group(), x, 1.5, z);
  seat.add(kit.torus(2.1, 0.32, 0xffd93d));
  seat.children[0].rotation.x = Math.PI / 2;
  const riders = [];
  const bench = [];
  for (let index = 0; index < CUMBRE_CHAIRS; index += 1) {
    const angle = (index / CUMBRE_CHAIRS) * Math.PI * 2;
    const chair = at(new THREE.Group(), Math.sin(angle) * 2.1, 0, Math.cos(angle) * 2.1);
    chair.rotation.y = angle;
    // El puesto de la jugadora es una banca baja sin respaldo, con alguien a cada lado (para verlos gritar).
    const isPlayerBench = index === CUMBRE_PLAYER_CHAIR;
    const places = isPlayerBench ? [-0.62, 0.62] : [0];
    if (isPlayerBench) chair.add(at(kit.box(2.1, 0.25, 0.7, 0xffd93d), 0, -0.3, 0.2));
    else chair.add(kit.box(0.9, 1, 0.5, index % 2 ? 0xff5fa2 : 0x5ab0ff));
    places.forEach((side) => {
      const rider = createRider(kit, random, { scale: 0.55, seatY: -0.1, bubbleHeight: 0.4 });
      rider.root.position.set(side, rider.root.position.y, 0.32);
      chair.add(rider.root);
      riders.push(rider);
      if (isPlayerBench) bench.push({ chair, side, rider });
    });
    seat.add(chair);
  }
  scene.add(seat);
  addCircle(colliders, { x, z, r: 4.6 });

  const playerAngle = (CUMBRE_PLAYER_CHAIR / CUMBRE_CHAIRS) * Math.PI * 2;
  const handle = {
    x,
    z,
    height,
    seat,
    idle: true,
    /** Puestos a los lados de la jugadora: { chair, side, rider }. Ahí se sientan las amigas. */
    bench,
    /** Dirección hacia fuera de la silla de la jugadora. */
    playerDir: { x: Math.sin(playerAngle), z: Math.cos(playerAngle) },
    /** Todos gritan (al caer) o se callan. */
    scream(on) {
      riders.forEach((rider) => {
        rider.setCheer(on);
        if (on && random() < 0.7) rider.say(pickLine(SCREAMS, random), 1.2);
      });
    },
    /** Alguien comenta algo (arriba, esperando la caída). */
    chat(lines) {
      riders[Math.floor(random() * riders.length)].say(pickLine(lines, random), 1.6);
    },
  };
  let wasDropping = false;
  animations.push((delta, time) => {
    riders.forEach((rider) => rider.update(delta));
    if (!handle.idle) return;
    seat.position.y = cumbreIdleHeight(time);
    const dropping = time % 16 >= 10 && time % 16 < 11.6;
    if (dropping !== wasDropping) handle.scream(dropping);
    wasDropping = dropping;
  });
  return handle;
}

function buildWheel(kit, scene, colliders, animations, random) {
  const { x, z, hubY, radius, gondolas: count } = WHEEL;
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((leg) => {
      const beam = at(kit.box(0.5, hubY + 1.5, 0.5, 0xffffff), x + leg * 3.6, hubY / 2, z + side * 1.4);
      beam.rotation.z = leg * 0.24;
      scene.add(beam);
    });
  });
  scene.add(at(kit.box(10, 0.6, 3.6, 0x9a8fb5), x, 0.3, z));
  addBox(colliders, { x, z, width: 10, depth: 3.6, top: 99 });

  const wheel = at(new THREE.Group(), x, hubY, z);
  const rim = kit.torus(radius, 0.25, 0xff5fa2);
  const innerRim = kit.torus(radius * 0.6, 0.18, 0xffd93d);
  wheel.add(rim, innerRim, at(kit.cyl(0.8, 0.8, 3.4, 0x7b5cff, 14), 0, 0, 0));
  wheel.children[2].rotation.x = Math.PI / 2;
  const colors = [0xff5f5f, 0xffd93d, 0x4dd4ac, 0x5ab0ff, 0xb57bff];
  const gondolas = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const spoke = kit.box(0.15, radius, 0.15, 0xffffff);
    spoke.position.set(Math.sin(angle) * radius * 0.5, Math.cos(angle) * radius * 0.5, 0);
    spoke.rotation.z = -angle;
    wheel.add(spoke);
    const gondola = at(new THREE.Group(), Math.sin(angle) * radius, Math.cos(angle) * radius, 0);
    // Cabina abierta (piso, barandas bajas y techo) para ver a la gente que va dentro.
    const color = colors[index % colors.length];
    gondola.add(at(kit.box(1.8, 0.15, 1.8, color), 0, -2.0, 0));
    gondola.add(at(kit.box(1.8, 0.5, 0.1, color), 0, -1.7, 0.85));
    gondola.add(at(kit.box(1.8, 0.5, 0.1, color), 0, -1.7, -0.85));
    gondola.add(at(kit.box(0.1, 0.5, 1.8, color), 0.85, -1.7, 0));
    gondola.add(at(kit.box(0.1, 0.5, 1.8, color), -0.85, -1.7, 0));
    // Postes del techo solo atrás, para no tapar la vista.
    [-0.8, 0.8].forEach((post) => gondola.add(at(kit.box(0.08, 1.4, 0.08, 0xffffff), post, -1.1, -0.8)));
    gondola.add(at(kit.cone(1.4, 0.8, 0xffffff, 4), 0, -0.3, 0));
    gondola.add(at(kit.box(0.1, 0.8, 0.1, 0x999999), 0, -0.4, 0));
    gondola.userData.riders = [];
    if (WHEEL_RIDER_CABINS.includes(index)) {
      [-0.4, 0.4].forEach((seatX) => {
        const rider = createRider(kit, random, { scale: 0.5, seatY: -1.6 });
        rider.root.position.x = seatX;
        rider.root.position.z = -0.3;
        gondola.add(rider.root);
        gondola.userData.riders.push(rider);
      });
    }
    wheel.add(gondola);
    gondolas.push(gondola);
  }
  scene.add(wheel);

  const riders = gondolas.flatMap((gondola) => gondola.userData.riders);
  const handle = { wheel, gondolas, hub: new THREE.Vector3(x, hubY, z), radius, speed: 0.12 };
  let waveTimer = 2;
  let waving = null;
  animations.push((delta) => {
    wheel.rotation.z += delta * handle.speed;
    gondolas.forEach((gondola) => (gondola.rotation.z = -wheel.rotation.z));
    riders.forEach((rider) => rider.update(delta));
    // De vez en cuando alguien saluda desde su cabina.
    waveTimer -= delta;
    if (waveTimer <= 0 && riders.length) {
      waving?.setCheer(false);
      waveTimer = 2.5 + random() * 2;
      waving = riders[Math.floor(random() * riders.length)];
      waving.setCheer(true);
      waving.say(pickLine(WAVES, random), 2);
    }
  });
  return handle;
}

function buildJipeArea(kit, scene, colliders) {
  scene.add(at(kit.box(8, 4, 6, 0xc58b4e), -50, 2, 10));
  const roof = at(kit.cone(6, 2.4, 0x7a4a2a, 4), -50, 5.2, 10);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
  scene.add(at(kit.box(3, 2.6, 0.1, 0x3b2414), -50, 1.3, 13.05));
  addBox(colliders, { x: -50, z: 10, width: 8, depth: 6, top: 99 });

  const jeep = buildJeep(kit, 0x3fae6a);
  jeep.position.set(-40, 0, 11);
  jeep.rotation.y = 0.6;
  scene.add(jeep);
  addCircle(colliders, { x: -40, z: 11, r: 1.9 });
  // Cajas de café para trepar (hay un grano dorado arriba).
  scene.add(at(kit.box(1.4, 1.2, 1.4, 0xc58b4e), -30, 0.6, 17));
  scene.add(at(kit.box(1.4, 2.3, 1.4, 0xb07a40), -31.6, 1.15, 17));
  addBox(colliders, { x: -30, z: 17, width: 1.4, depth: 1.4, top: 1.2 });
  addBox(colliders, { x: -31.6, z: 17, width: 1.4, depth: 1.4, top: 2.3 });
  return { jeep };
}

function buildBumperArena(kit, scene, colliders, animations, random) {
  const { x, z, radius } = BUMPER;
  scene.add(at(kit.cyl(radius + 0.6, radius + 0.6, 0.25, 0x5b5470, 32), x, 0.12, z));
  const fence = at(kit.torus(radius + 0.3, 0.22, 0xffd93d), x, 0.6, z);
  fence.rotation.x = Math.PI / 2;
  scene.add(fence);
  [0, 1, 2, 3].forEach((index) => {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    scene.add(at(kit.cyl(0.2, 0.2, 6, 0xffffff, 8), x + Math.cos(angle) * (radius + 0.4), 3, z + Math.sin(angle) * (radius + 0.4)));
  });
  scene.add(at(kit.cyl(radius + 1.2, radius + 1.2, 0.3, 0x7b5cff, 8, { emissive: 0x3a2a80 }), x, 6.1, z));
  scene.add(at(kit.cone(radius + 1.4, 2.2, 0xff5fa2, 8), x, 7.4, z));
  addCircle(colliders, { x, z, r: radius + 0.6 });

  const center = new THREE.Vector3(x, 0.25, z);
  const group = at(new THREE.Group(), x, 0.25, z);
  const colors = [0xff5f5f, 0x5ab0ff, 0x4dd4ac, 0xffd93d, 0xb57bff];
  const cars = colors.map((color, index) => {
    const mesh = buildBumperCar(kit, color, { driver: createRider(kit, random, { scale: 0.55, seatY: 0.95 }) });
    const angle = (index / colors.length) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 4, 0, Math.sin(angle) * 4);
    const car = { mesh, heading: random() * Math.PI * 2, turn: 0 };
    group.add(mesh);
    return car;
  });
  scene.add(group);

  const handle = { center, radius, group, idle: true };
  animations.push((delta) => {
    if (!handle.idle) return;
    cars.forEach((car) => {
      car.turn += (random() - 0.5) * delta * 3;
      car.turn = Math.max(-1.2, Math.min(1.2, car.turn));
      const { position } = car.mesh;
      const distance = Math.hypot(position.x, position.z);
      if (distance > radius - 1.6) car.heading = Math.atan2(-position.x, -position.z) + (random() - 0.5);
      car.heading += car.turn * delta;
      position.x += Math.sin(car.heading) * delta * 3;
      position.z += Math.cos(car.heading) * delta * 3;
      car.mesh.rotation.y = car.heading;
    });
  });
  return handle;
}

