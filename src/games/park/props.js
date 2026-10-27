/**
 * Objetos 3D que salen tanto en el parque como dentro de las atracciones: el Willys del Jipe,
 * los carros chocones, los vagones del Krater y las matas de café.
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { createRider } from './riders.js';

/** Willys clásico del Quindío. Mira hacia +Z; mide unos 2 × 3,4 m. */
export function buildJeep(kit, color = 0x3fae6a) {
  const jeep = new THREE.Group();
  jeep.add(at(kit.box(2, 0.8, 3.4, color), 0, 0.9, 0));
  jeep.add(at(kit.box(1.9, 0.5, 1.3, color), 0, 1.45, 1.0));
  jeep.add(at(kit.box(1.7, 0.75, 0.08, 0xbfe6ff, { opacity: 0.7 }), 0, 1.75, 0.38));
  jeep.add(at(kit.box(2.02, 0.12, 0.12, 0xeeeeee), 0, 0.62, 1.72));
  [-0.6, 0.6].forEach((x) => jeep.add(at(kit.sphere(0.16, 0xfff2a8, 8, { emissive: 0x665500 }), x, 1.05, 1.72)));
  // Techo de lona sobre las barras.
  [-0.9, 0.9].forEach((x) => {
    jeep.add(at(kit.box(0.08, 1.1, 0.08, 0x333333), x, 1.85, -0.2));
    jeep.add(at(kit.box(0.08, 1.1, 0.08, 0x333333), x, 1.85, -1.5));
  });
  jeep.add(at(kit.box(2, 0.1, 1.6, 0xf4ecd6), 0, 2.42, -0.85));
  jeep.add(at(kit.box(0.6, 0.6, 0.3, 0x8a5a2b), 0, 1.4, -1.75));
  [
    [-1.05, 1.15],
    [1.05, 1.15],
    [-1.05, -1.15],
    [1.05, -1.15],
  ].forEach(([x, z]) => {
    const wheel = at(kit.cyl(0.45, 0.45, 0.35, 0x2b2b3a, 14), x, 0.45, z);
    wheel.rotation.z = Math.PI / 2;
    jeep.add(wheel);
  });
  return jeep;
}

/** Carro chocón con su barra al techo. Mira hacia +Z. Con `driver`, lleva a alguien manejando. */
export function buildBumperCar(kit, color, { driver = null } = {}) {
  const car = new THREE.Group();
  car.add(at(kit.cyl(1.05, 1.1, 0.4, 0x2b2b3a, 16), 0, 0.3, 0));
  car.add(at(kit.box(1.5, 0.55, 2, color), 0, 0.7, 0));
  car.add(at(kit.box(1.3, 0.5, 0.5, color), 0, 1.15, -0.7));
  car.add(at(kit.box(1.2, 0.12, 0.2, 0xffd93d), 0, 1.0, 0.95));
  car.add(at(kit.cyl(0.05, 0.05, 3.6, 0x999999, 6), 0, 2.8, -0.85));
  if (driver) {
    driver.root.position.z = -0.25;
    car.add(driver.root);
  }
  return car;
}

/** Vagón del Krater (dos asientos). Mira hacia +Z. */
export function buildCoasterCar(kit, color = 0xff5f5f) {
  const car = new THREE.Group();
  car.add(at(kit.box(1.5, 0.6, 2.2, color), 0, 0.3, 0));
  car.add(at(kit.box(1.5, 0.9, 0.3, color), 0, 0.75, -1.0));
  car.add(at(kit.box(1.5, 0.5, 0.3, 0xffd93d), 0, 0.55, 1.0));
  car.add(at(kit.box(1.3, 0.1, 0.1, 0x333333), 0, 1.0, 0.2));
  return car;
}

/** Asientos de un vagón (izquierda y derecha). */
export const COASTER_SEATS = [-0.38, 0.38];
/** Distancia entre vagones del tren (m). */
export const COASTER_CAR_GAP = 2.8;

/**
 * Tren del Krater con pasajeros. `emptySeat` = { car, seat } deja un asiento libre (el de la jugadora).
 * `placed` = Map('vagón-asiento' → pasajero ya creado), p. ej. las amigas que van juntas.
 * Devuelve { group, cars: [{ mesh, riders, descending }] } (el vagón 0 va delante).
 */
export function buildCoasterTrain(kit, random, { emptySeat = null, placed = new Map(), colors = [0xffd93d, 0xff5f5f, 0x5ab0ff] } = {}) {
  const group = new THREE.Group();
  const cars = colors.map((color, carIndex) => {
    const mesh = buildCoasterCar(kit, color);
    const riders = [];
    COASTER_SEATS.forEach((x, seatIndex) => {
      if (emptySeat && emptySeat.car === carIndex && emptySeat.seat === seatIndex) return;
      const rider = placed.get(`${carIndex}-${seatIndex}`) ?? createRider(kit, random, { scale: 0.58, seatY: 0.6, bubbleHeight: 0.36 });
      rider.root.position.x = x;
      rider.root.position.z = -0.2;
      mesh.add(rider.root);
      riders.push(rider);
    });
    group.add(mesh);
    return { mesh, riders, descending: false };
  });
  return { group, cars };
}

/** Matas de café con granos rojos, todas en dos InstancedMesh (pocas llamadas de dibujo). */
export function buildCoffeeBushes(kit, positions) {
  const bushGeometry = kit.geometry('coffee-bush', () => new THREE.ConeGeometry(0.95, 1.9, 7));
  const berryGeometry = kit.geometry('coffee-berry', () => new THREE.SphereGeometry(0.11, 6, 4));
  const bushes = new THREE.InstancedMesh(bushGeometry, kit.mat(0x2f8f46), positions.length);
  const berries = new THREE.InstancedMesh(berryGeometry, kit.mat(0xd8283a), positions.length * 4);
  const matrix = new THREE.Matrix4();
  positions.forEach(({ x, z, scale = 1 }, index) => {
    matrix.makeScale(scale, scale, scale).setPosition(x, 0.95 * scale, z);
    bushes.setMatrixAt(index, matrix);
    for (let berry = 0; berry < 4; berry += 1) {
      const angle = berry * 1.7 + index;
      matrix.makeTranslation(x + Math.cos(angle) * 0.62 * scale, (0.5 + (berry % 2) * 0.45) * scale, z + Math.sin(angle) * 0.62 * scale);
      berries.setMatrixAt(index * 4 + berry, matrix);
    }
  });
  const group = new THREE.Group();
  group.add(bushes, berries);
  return group;
}

/** Montañas verdes alrededor (decorado lejano). */
export function buildMountains(kit, random, { count = 18, minDistance = 120, maxDistance = 170 } = {}) {
  const group = new THREE.Group();
  const greens = [0x5fb35a, 0x4c9f55, 0x6cc070, 0x3f8f4f];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + random() * 0.2;
    const distance = minDistance + random() * (maxDistance - minDistance);
    const height = 30 + random() * 35;
    const mountain = kit.cone(22 + random() * 18, height, greens[index % greens.length], 7);
    mountain.position.set(Math.cos(angle) * distance, height / 2 - 1, Math.sin(angle) * distance);
    mountain.rotation.y = random() * Math.PI;
    group.add(mountain);
  }
  return group;
}

/** Nubes de bolitas blancas. Devuelve el grupo; su `userData.drift` las mueve poco a poco. */
export function buildClouds(kit, random, count = 10) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(random() * 3);
    for (let puff = 0; puff < puffs; puff += 1) {
      cloud.add(at(kit.sphere(2.5 + random() * 2, 0xffffff, 10), puff * 3 - puffs * 1.5, random() * 1.5, random() * 2));
    }
    cloud.position.set((random() - 0.5) * 240, 42 + random() * 18, (random() - 0.5) * 240);
    group.add(cloud);
  }
  return group;
}

/** Fondo común de cielo, luces y niebla. */
export function addSkyAndLights(scene, { sky = 0x9fdcff, fogNear = 70, fogFar = 200 } = {}) {
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, fogNear, fogFar);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7fb86a, 1.9));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(40, 80, 30);
  scene.add(sun);
}

// ---------- Granja ----------

/** Gallina de bloques. Mira hacia +Z. */
export function buildChicken(kit, color = 0xffffff) {
  const chicken = new THREE.Group();
  chicken.add(at(kit.box(0.7, 0.6, 0.9, color), 0, 0.6, 0));
  chicken.add(at(kit.box(0.4, 0.45, 0.4, color), 0, 1.1, 0.4));
  chicken.add(at(kit.box(0.12, 0.2, 0.12, 0xff5f5f), 0, 1.42, 0.4));
  chicken.add(at(kit.box(0.14, 0.1, 0.2, 0xffb000), 0, 1.1, 0.68));
  chicken.add(at(kit.box(0.08, 0.3, 0.08, 0xffb000), -0.15, 0.15, 0));
  chicken.add(at(kit.box(0.08, 0.3, 0.08, 0xffb000), 0.15, 0.15, 0));
  return chicken;
}

/** Vaca de manchas. Mira hacia +Z; mide unos 2,6 m de largo. */
export function buildCow(kit, { spots = 0x2b2140, body = 0xffffff } = {}) {
  const cow = new THREE.Group();
  cow.add(at(kit.box(1.3, 1.1, 2.4, body), 0, 1.35, 0));
  cow.add(at(kit.box(1.32, 0.6, 0.7, spots), 0, 1.5, 0.3));
  cow.add(at(kit.box(1.32, 0.5, 0.5, spots), 0, 1.2, -0.7));
  cow.add(at(kit.box(0.8, 0.8, 0.8, body), 0, 1.75, 1.45));
  cow.add(at(kit.box(0.82, 0.35, 0.3, 0xffb3c7), 0, 1.5, 1.85));
  [-0.25, 0.25].forEach((x) => cow.add(at(kit.box(0.1, 0.12, 0.05, 0x2b2140), x, 1.95, 1.86)));
  [-0.45, 0.45].forEach((x) => cow.add(at(kit.cone(0.08, 0.3, 0xf4ecd6, 6), x, 2.25, 1.4)));
  [
    [-0.45, 0.8],
    [0.45, 0.8],
    [-0.45, -0.8],
    [0.45, -0.8],
  ].forEach(([x, z]) => cow.add(at(kit.box(0.3, 0.8, 0.3, body), x, 0.4, z)));
  cow.add(at(kit.box(0.5, 0.25, 0.4, 0xffb3c7), 0, 0.72, -0.55));
  return cow;
}

/** Cerdito rosado (`color` para los de la carrera). Mira hacia +Z. */
export function buildPig(kit, color = 0xffa3c4) {
  const pig = new THREE.Group();
  pig.add(at(kit.box(0.9, 0.75, 1.4, color), 0, 0.65, 0));
  pig.add(at(kit.box(0.7, 0.65, 0.6, color), 0, 0.8, 0.85));
  pig.add(at(kit.box(0.4, 0.3, 0.15, 0xff7aa8), 0, 0.72, 1.2));
  [-0.18, 0.18].forEach((x) => pig.add(at(kit.box(0.08, 0.1, 0.05, 0x2b2140), x, 0.98, 1.16)));
  [-0.25, 0.25].forEach((x) => pig.add(at(kit.box(0.15, 0.2, 0.1, 0xff7aa8), x, 1.2, 0.7)));
  [
    [-0.3, 0.45],
    [0.3, 0.45],
    [-0.3, -0.45],
    [0.3, -0.45],
  ].forEach(([x, z]) => pig.add(at(kit.box(0.2, 0.35, 0.2, color), x, 0.18, z)));
  return pig;
}

/** Oveja lanuda. Mira hacia +Z. */
export function buildSheep(kit) {
  const sheep = new THREE.Group();
  sheep.add(at(kit.box(1.1, 0.9, 1.4, 0xf8f5ee), 0, 0.95, 0));
  sheep.add(at(kit.box(0.5, 0.55, 0.5, 0x3b2f2f), 0, 1.15, 0.85));
  [-0.3, 0.3].forEach((x) => sheep.add(at(kit.box(0.25, 0.1, 0.12, 0x3b2f2f), x, 1.3, 0.75)));
  [
    [-0.3, 0.45],
    [0.3, 0.45],
    [-0.3, -0.45],
    [0.3, -0.45],
  ].forEach(([x, z]) => sheep.add(at(kit.box(0.18, 0.5, 0.18, 0x3b2f2f), x, 0.25, z)));
  return sheep;
}

/** Tractor rojo con remolque. Mira hacia +Z. */
export function buildTractor(kit, { trailer = true } = {}) {
  const tractor = new THREE.Group();
  tractor.add(at(kit.box(1.4, 0.9, 2.2, 0xe63946), 0, 1.0, 0.5));
  // Cabina abierta: asiento, cuatro postes y techo.
  tractor.add(at(kit.box(1.0, 0.8, 0.15, 0x2b2140), 0, 1.85, -1.0));
  [-0.7, 0.7].forEach((x) => [-1.05, 0.05].forEach((z) => tractor.add(at(kit.box(0.08, 1.3, 0.08, 0x333333), x, 2.1, z))));
  tractor.add(at(kit.box(1.6, 0.12, 1.3, 0xe63946), 0, 2.8, -0.5));
  tractor.add(at(kit.cyl(0.08, 0.08, 1, 0x555555, 6), 0.45, 1.9, 1.2));
  [-0.85, 0.85].forEach((x) => {
    const back = at(kit.cyl(0.85, 0.85, 0.45, 0x2b2b3a, 16), x, 0.85, -0.6);
    back.rotation.z = Math.PI / 2;
    const front = at(kit.cyl(0.5, 0.5, 0.35, 0x2b2b3a, 14), x, 0.5, 1.2);
    front.rotation.z = Math.PI / 2;
    tractor.add(back, front);
  });
  if (trailer) {
    tractor.add(at(kit.box(1.8, 0.6, 2.2, 0xc58b4e), 0, 0.85, -2.6));
    tractor.add(at(kit.box(0.2, 0.2, 0.8, 0x555555), 0, 0.6, -1.5));
    [-0.95, 0.95].forEach((x) => {
      const wheel = at(kit.cyl(0.4, 0.4, 0.3, 0x2b2b3a, 12), x, 0.4, -2.6);
      wheel.rotation.z = Math.PI / 2;
      tractor.add(wheel);
    });
  }
  return tractor;
}

/** Maizal: matas altas con mazorcas, en dos InstancedMesh. */
export function buildCornField(kit, positions) {
  const stalkGeometry = kit.geometry('corn-stalk', () => new THREE.CylinderGeometry(0.12, 0.18, 2.6, 6));
  const cobGeometry = kit.geometry('corn-cob', () => new THREE.CylinderGeometry(0.16, 0.12, 0.6, 6));
  const leafGeometry = kit.geometry('corn-leaves', () => new THREE.ConeGeometry(0.55, 1.6, 5));
  const stalks = new THREE.InstancedMesh(stalkGeometry, kit.mat(0x7fbf3f), positions.length);
  const cobs = new THREE.InstancedMesh(cobGeometry, kit.mat(0xffd21f), positions.length);
  const leaves = new THREE.InstancedMesh(leafGeometry, kit.mat(0x5fa832), positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(({ x, z, scale = 1 }, index) => {
    matrix.makeScale(scale, scale, scale).setPosition(x, 1.3 * scale, z);
    stalks.setMatrixAt(index, matrix);
    matrix.makeScale(scale, scale, scale).setPosition(x + 0.2, 1.6 * scale, z);
    cobs.setMatrixAt(index, matrix);
    matrix.makeScale(scale, scale, scale).setPosition(x, 2.5 * scale, z);
    leaves.setMatrixAt(index, matrix);
  });
  const group = new THREE.Group();
  group.add(stalks, cobs, leaves);
  return group;
}

/** Árbol redondo. */
export function buildTree(kit, scale = 1) {
  const tree = new THREE.Group();
  tree.add(at(kit.cyl(0.3, 0.4, 2.4, 0x8a5a2b, 8), 0, 1.2, 0));
  tree.add(at(kit.sphere(1.8, 0x4caf50, 10), 0, 3.4, 0));
  tree.add(at(kit.sphere(1.2, 0x66bb6a, 10), 0.9, 3.0, 0.6));
  tree.scale.setScalar(scale);
  return tree;
}

/** Paca de heno (se puede subir encima). */
export const buildHayBale = (kit, height = 1) => at(kit.box(1.6, height, 1.2, 0xe8c66a), 0, height / 2, 0);
