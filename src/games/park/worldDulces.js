/**
 * Construye el Castillo de Dulces en 3D: el cupcake gigante en la plaza, el castillo con su muralla
 * (se sube por la escalera hasta la torre), el lago de chocolate (se cruza saltando por las galletas),
 * el camino de gomitas hasta la nube de algodón, el pastel gigante de tres pisos, el pueblito de casitas
 * de jengibre con la pastelera, el bosque de chupetines y bastones, muñecos de jengibre que pasean y, de
 * vez en cuando, una lluvia de chispitas con arcoíris. Las atracciones: el carrusel (que también usa el
 * minijuego `rides/carrusel.js`), el patio de la piñata y la pastelería.
 * Devuelve también `isWater(x, z)`: quien pisa el chocolate vuelve a la orilla.
 */
import * as THREE from 'three';
import { at } from './kit.js';
import { addBox, addCircle, isBlocked } from './collision.js';
import { buildParkBase } from './parkBase.js';
import { createAvatar } from './avatar.js';
import { randomLook } from './outfits.js';
import { createRider, pickLine } from './riders.js';
import {
  CANDY_COLORS,
  CHOCOLATE,
  FROSTING,
  GINGER,
  addBattlements,
  buildCakeLayer,
  buildCandyCane,
  buildCandyRing,
  buildCandyTower,
  buildCarouselHorse,
  buildCottonCandyCloud,
  buildCupcake,
  buildDonut,
  buildGingerbreadHouse,
  buildGingerbreadMan,
  buildIceCream,
  buildLollipop,
  buildPinata,
} from './propsCandy.js';

const LOOK = { ground: 0xbdf0d4, path: 0xffc4e1, plaza: 0xfff0f6, hedge: 0xff8ac4, gate: 0xb57bff, sign: '#ffd93d', sky: 0xffd9ef };
const FOUNTAIN_RADIUS = 4.4;
/** Muralla del castillo (de oeste a este), con la escalera al sur y la torre en la punta este. */
const WALL = { x: 0, z: -50, width: 40, depth: 3, top: 4 };
const WALL_STAIR_X = -8;
const STAIR_STEPS = 12;
const TOWER = { x: 17, z: -50, size: 4, top: 7 };
const TOWER_STEPS = 9;
const KEEP = { x: 0, z: -54.5, width: 14, depth: 6, height: 10 };
const LAKE = { x: -40, z: 10, r: 9 };
/** Galletas para cruzar el lago hasta la isla (cajas de `half` de lado a lado). */
const COOKIES = [
  { x: -32.4, z: 10, half: 1, top: 0.25 },
  { x: -35.8, z: 10.6, half: 1, top: 0.25 },
  { x: -40, z: 10, half: 1.8, top: 0.3, island: true },
];
/** Gomitas gigantes, cada una más alta, hasta la nube de algodón. */
const GUMDROPS = [
  { x: 30, z: 30, top: 0.8, color: 0x4dd4ac },
  { x: 33.4, z: 32.4, top: 1.6, color: 0xff5fa2 },
  { x: 36.8, z: 30, top: 2.4, color: 0xffd93d },
  { x: 40.2, z: 32.4, top: 3.2, color: 0xb57bff },
];
const CLOUD = { x: 43, z: 28.6, size: 3.2, top: 4 };
/** Pastel gigante de tres pisos (se trepa saltando de piso en piso). */
const GIANT_CAKE = { x: -42, z: -34, tiers: [[6, 1.2, 0xffc4e1], [4.4, 2.4, 0xfff6c9], [3, 3.6, 0xb57bff]] };
const BAKERY = { x: -31.5, z: -24.5, width: 6, depth: 5 };
const PARTY = { x: 0, z: -38 };
export const CAROUSEL = { x: 30.4, z: -22.8, radius: 5.6, horseRadius: 4.2, horses: 8 };
/** Caballitos con visitantes (los demás quedan libres para la jugadora y sus amigas). */
const CAROUSEL_RIDER_HORSES = [2, 3, 5, 6];
/** Brazos con aros de caramelo alrededor del carrusel (ángulo desde su centro). */
const RING_ARM_ANGLES = [0.6, 2.2, 3.8];
const RING_ARM_RADIUS = 7.4;
export const RING_RADIUS = 5.9;
export const RING_HEIGHT = 2.75;
const HOUSES = [
  { x: -22, z: 36 },
  { x: -32, z: 42 },
  { x: -14, z: 48 },
];
const LOLLIPOPS = [
  [-18, 22], [16, 22], [-24, 52], [30, 50], [48, 40], [54, 10], [52, -8], [-52, -10], [-56, 22], [-14, -44],
  [12, -40], [46, -40], [-28, -48], [-8, 30], [8, 34], [-50, 34], [40, 14], [-26, 2], [24, 4], [-40, 46], [56, -24], [20, 58],
];
const GUIDE_LINES = ['¡Bienvenida al castillo! 🏰', '¡Compartir dulces es más rico! 🍬', '¡Después de los dulces, a lavarse los dientes! 🪥', '¡Busca los caramelos dorados! ✨', '¡Una fruta también es un dulce! 🍓'];
/** Lluvia de chispitas: cada cuánto, cuánto dura y cuánto se queda el arcoíris (s). */
const DRY_SECONDS = 70;
const SPRINKLE_SECONDS = 12;
const RAINBOW_SECONDS = 14;
const SPRINKLES = 1200;
const SPRINKLE_SKY = new THREE.Color(0xe7c8ff);

export function buildDulcesPark(kit, scene, random, world) {
  const { colliders, animations } = buildParkBase(kit, scene, random, { ...world, look: LOOK });

  buildFountain(kit, scene, colliders, animations);
  buildCastle(kit, scene, colliders, animations);
  buildChocolateLake(kit, scene, colliders, animations);
  buildGumdropHop(kit, scene, colliders, animations);
  buildGiantCake(kit, scene, colliders);
  buildBakery(kit, scene, colliders, animations);
  buildPartyPatio(kit, scene, colliders, animations);
  const carousel = buildCarousel(kit, scene, colliders, animations, random);
  buildVillage(kit, scene, colliders, animations, random);
  buildSweetForest(kit, scene, colliders, animations);
  buildSmallGumdrops(kit, scene, colliders, random);
  buildGingerbreadWalkers(kit, scene, animations);
  buildCottonClouds(kit, scene, animations, random);
  buildSprinkles(kit, scene, animations, random);

  let time = 0;
  return {
    colliders,
    carousel,
    isWater: (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r,
    update(delta) {
      time += delta;
      animations.forEach((animate) => animate(delta, time));
    },
  };
}

const sign = (kit, scene, text, x, y, z, background = '#ffffff') => scene.add(at(kit.label(text, { background, height: 0.8 }).sprite, x, y, z));

/** El cupcake gigante de la plaza, con un charco de chocolate que da vueltas. */
function buildFountain(kit, scene, colliders, animations) {
  scene.add(buildCupcake(kit, { scale: 2.4 }));
  scene.add(at(kit.disc(FOUNTAIN_RADIUS, CHOCOLATE), 0, 0.05, 0));
  const rim = at(kit.torus(FOUNTAIN_RADIUS, 0.3, 0xffc4e1), 0, 0.2, 0);
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);
  addCircle(colliders, { x: 0, z: 0, r: FOUNTAIN_RADIUS });
  sign(kit, scene, '🧁 Cupcake gigante', 0, 9.6, 0);
  // Chorritos de chocolate que caen alrededor.
  const drops = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const drop = kit.sphere(0.22, CHOCOLATE, 8);
    scene.add(drop);
    return { drop, angle };
  });
  animations.push((delta, time) => {
    drops.forEach(({ drop, angle }, index) => {
      const fall = (time * 0.8 + index / 8) % 1;
      const radius = 3.1 + fall * 0.9;
      drop.position.set(Math.cos(angle + time * 0.3) * radius, 3.6 - fall * 3.5, Math.sin(angle + time * 0.3) * radius);
    });
  });
}

/** Escalones de `count` cajas que suben de `from` a `to` de alto (cada uno menos que lo que se sube sin saltar). */
function addStairs(kit, scene, colliders, { count, from, to, place, width, depth, colors }) {
  for (let step = 0; step < count; step += 1) {
    const height = from + ((to - from) / count) * (step + 1);
    const { x, z, w, d } = place(step, width, depth);
    scene.add(at(kit.box(w, height, d, colors[step % 2]), x, height / 2, z));
    addBox(colliders, { x, z, width: w, depth: d, top: height });
  }
}

/** El castillo: torreón con torres, muralla con almenas (se sube por la escalera) y una torre alta en la punta. */
function buildCastle(kit, scene, colliders, animations) {
  const keep = KEEP;
  scene.add(at(kit.box(keep.width, keep.height, keep.depth, 0xffd6ea), keep.x, keep.height / 2, keep.z));
  scene.add(at(kit.box(keep.width + 0.4, 0.5, keep.depth + 0.4, FROSTING), keep.x, keep.height, keep.z));
  addBattlements(kit, scene, { width: keep.width, y: keep.height + 0.25, z: keep.z + keep.depth / 2 - 0.25 });
  [-1, 1].forEach((side) => {
    scene.add(at(buildCandyTower(kit, { height: 13, radius: 2 }), keep.x + side * (keep.width / 2), 0, keep.z - 1));
    addCircle(colliders, { x: keep.x + side * (keep.width / 2), z: keep.z - 1, r: 2 });
  });
  scene.add(at(buildCandyTower(kit, { height: 16, radius: 2.4, color: 0xfff6c9, roof: 0xff5fa2 }), keep.x, 0, keep.z - 1.5));
  // Ventanas de caramelo.
  [-4, 0, 4].forEach((x) => scene.add(at(kit.box(1.2, 1.6, 0.1, 0x9fe0ff), keep.x + x, 7.5, keep.z + keep.depth / 2 + 0.05)));
  addBox(colliders, { x: keep.x, z: keep.z, width: keep.width, depth: keep.depth, top: 99 });
  sign(kit, scene, '🏰 Castillo de Dulces', keep.x, 18.5, keep.z + 3, '#ffd93d');

  // Muralla de galleta: se camina por arriba.
  const wall = WALL;
  scene.add(at(kit.box(wall.width, wall.top - 0.3, wall.depth, GINGER), wall.x, (wall.top - 0.3) / 2, wall.z));
  scene.add(at(kit.box(wall.width + 0.2, 0.3, wall.depth + 0.2, 0xffc4e1), wall.x, wall.top - 0.15, wall.z));
  addBox(colliders, { x: wall.x, z: wall.z, width: wall.width, depth: wall.depth, top: wall.top });
  // Almenas a cada lado de la escalera (por ahí se pasa); por lo demás no se cae una por delante.
  const stairGap = 1.3;
  [[wall.x - wall.width / 2, WALL_STAIR_X - stairGap], [WALL_STAIR_X + stairGap, wall.x + wall.width / 2]].forEach(([from, to]) => {
    const merlons = at(new THREE.Group(), (from + to) / 2, 0, 0);
    addBattlements(kit, merlons, { width: to - from, y: wall.top, z: wall.z + wall.depth / 2 - 0.25 });
    scene.add(merlons);
    addBox(colliders, { x: (from + to) / 2, z: wall.z + wall.depth / 2 - 0.25, width: to - from, depth: 0.5, top: wall.top + 0.7 });
  });
  // Puente levadizo de chocolate (de adorno) en el centro.
  const bridge = at(kit.box(4, 0.25, 5, CHOCOLATE), 0, 0.12, wall.z + wall.depth / 2 + 2.5);
  scene.add(bridge, at(kit.box(4, 3.2, 0.2, 0x3b2414), 0, 1.6, wall.z + wall.depth / 2 + 0.05));

  // Escalera hasta lo alto de la muralla (al sur de ella).
  const front = wall.z + wall.depth / 2;
  addStairs(kit, scene, colliders, {
    count: STAIR_STEPS,
    from: 0,
    to: wall.top,
    width: 2.4,
    depth: 0.6,
    colors: [0xffc4e1, 0xffffff],
    place: (step, width, depth) => ({ x: WALL_STAIR_X, z: front + (STAIR_STEPS - step - 0.5) * depth, w: width, d: depth }),
  });
  sign(kit, scene, '🍪 Muralla de galleta', WALL_STAIR_X, wall.top + 2.6, front + 2);

  // Torre alta en la punta este: escalones sobre la muralla.
  const tower = TOWER;
  addStairs(kit, scene, colliders, {
    count: TOWER_STEPS,
    from: wall.top,
    to: tower.top,
    width: 0.6,
    depth: 2,
    colors: [0xb57bff, 0xffffff],
    place: (step, width, depth) => ({ x: tower.x - tower.size / 2 - (TOWER_STEPS - step - 0.5) * width, z: wall.z - 0.3, w: width, d: depth }),
  });
  scene.add(at(kit.box(tower.size, tower.top, tower.size, 0xffd6ea), tower.x, tower.top / 2, tower.z));
  scene.add(at(kit.box(tower.size + 0.3, 0.3, tower.size + 0.3, FROSTING), tower.x, tower.top - 0.15, tower.z));
  addBox(colliders, { x: tower.x, z: tower.z, width: tower.size, depth: tower.size, top: tower.top });
  [-1, 1].forEach((dx) => [-1, 1].forEach((dz) => scene.add(at(kit.cyl(0.12, 0.12, 3, 0xffffff, 6), tower.x + dx * 1.8, tower.top + 1.5, tower.z + dz * 1.8))));
  const roof = at(kit.cone(3.2, 2.2, 0xff5fa2, 4), tower.x, tower.top + 4, tower.z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
  sign(kit, scene, '🗼 Torre', tower.x, tower.top + 6, tower.z + 2);

  // Banderines que ondean en el torreón.
  const flags = [-5, -1.5, 1.5, 5].map((x, index) => {
    const flag = at(kit.box(0.9, 0.6, 0.05, CANDY_COLORS[index]), keep.x + x, keep.height + 2.2, keep.z + keep.depth / 2);
    scene.add(flag, at(kit.box(0.06, 2, 0.06, 0xffffff), keep.x + x - 0.45, keep.height + 1.5, keep.z + keep.depth / 2));
    return flag;
  });
  animations.push((delta, time) => flags.forEach((flag, index) => (flag.rotation.y = Math.sin(time * 3 + index) * 0.4)));
}

/** Lago de chocolate: se cruza saltando por las galletas hasta la isla; si se cae, vuelve a la orilla. */
function buildChocolateLake(kit, scene, colliders, animations) {
  const { x, z, r } = LAKE;
  scene.add(at(kit.disc(r + 1.2, 0xffc4e1), x, 0.03, z));
  scene.add(at(kit.disc(r, CHOCOLATE), x, 0.05, z));
  COOKIES.forEach((cookie) => {
    const radius = cookie.half * 1.25;
    scene.add(at(kit.cyl(radius, radius, cookie.top, cookie.island ? 0xd9a066 : 0xe0a85a, 16), cookie.x, cookie.top / 2, cookie.z));
    // Chispas de chocolate encima.
    [[0.4, 0.3], [-0.5, 0.2], [0.1, -0.5]].forEach(([dx, dz]) => scene.add(at(kit.sphere(0.12, 0x3b2414, 6), cookie.x + dx * cookie.half, cookie.top, cookie.z + dz * cookie.half)));
    addBox(colliders, { x: cookie.x, z: cookie.z, width: cookie.half * 2, depth: cookie.half * 2, top: cookie.top });
  });
  sign(kit, scene, '🍫 Lago de chocolate', x + 3, 3, z - r - 1);
  // Burbujas de chocolate que salen y revientan.
  const bubbles = Array.from({ length: 6 }, (_, index) => {
    const bubble = kit.sphere(0.35, 0x8a5a2b, 8);
    scene.add(bubble);
    return { bubble, angle: index * 1.1, distance: 2.5 + (index % 3) * 2 };
  });
  animations.push((delta, time) => {
    bubbles.forEach(({ bubble, angle, distance }, index) => {
      const grow = (time * 0.6 + index * 0.37) % 1;
      bubble.position.set(x + Math.cos(angle) * distance, 0.05, z + Math.sin(angle) * distance);
      bubble.scale.setScalar(grow < 0.9 ? grow : 0.01);
    });
  });
}

/** Gomitas gigantes, cada una más alta, hasta la nube de algodón. */
function buildGumdropHop(kit, scene, colliders, animations) {
  GUMDROPS.forEach(({ x, z, top, color }) => {
    scene.add(at(kit.cyl(1.1, 1.25, top, color, 14), x, top / 2, z));
    const dome = at(kit.sphere(1.1, color, 12), x, top, z);
    dome.scale.y = 0.25;
    scene.add(dome);
    addBox(colliders, { x, z, width: 2.2, depth: 2.2, top });
  });
  const { x, z, size, top } = CLOUD;
  const cloud = at(buildCottonCandyCloud(kit, 0xc9e8ff), x, top - 0.6, z);
  cloud.scale.set(1.2, 0.5, 1.2);
  scene.add(cloud);
  scene.add(at(kit.box(size, 0.2, size, 0xe9f6ff), x, top - 0.1, z));
  addBox(colliders, { x, z, width: size, depth: size, top });
  // Palito de algodón de azúcar (los círculos tapan hasta arriba: este no choca, para poder pisar la nube).
  scene.add(at(kit.cyl(0.25, 0.25, top - 0.4, 0xffffff, 8), x, (top - 0.4) / 2, z));
  sign(kit, scene, '🍬 Gomitas saltarinas', 34, 4.6, 36);
  animations.push((delta, time) => (cloud.position.y = top - 0.6 + Math.sin(time * 1.2) * 0.08));
}

/** Pastel gigante de tres pisos: se trepa saltando de un piso al otro. */
function buildGiantCake(kit, scene, colliders) {
  const { x, z, tiers } = GIANT_CAKE;
  let below = 0;
  tiers.forEach(([size, top, color]) => {
    const height = top - below;
    scene.add(at(kit.box(size, height, size, color), x, below + height / 2, z));
    scene.add(at(kit.box(size + 0.1, 0.15, size + 0.1, FROSTING), x, top - 0.07, z));
    for (let drip = -size / 2 + 0.4; drip < size / 2; drip += 0.8) {
      scene.add(at(kit.box(0.2, 0.35, 0.1, FROSTING), x + drip, top - 0.25, z + size / 2 + 0.02));
    }
    addBox(colliders, { x, z, width: size, depth: size, top });
    below = top;
  });
  // Velas y cereza (a un lado, para que quede sitio arriba).
  [[-1, -1], [1, -1]].forEach(([dx, dz], index) => {
    scene.add(at(kit.cyl(0.1, 0.1, 0.8, index ? 0x5ab0ff : 0xff5fa2, 6), x + dx, below + 0.4, z + dz));
    scene.add(at(kit.sphere(0.13, 0xffd93d, 6, { emissive: 0xff9f43 }), x + dx, below + 0.9, z + dz));
  });
  scene.add(at(kit.sphere(0.35, 0xe63946, 10), x - 1.1, below + 0.3, z + 1.1));
  sign(kit, scene, '🎂 Pastel gigante', x + 4, 5.5, z + 3);
}

/** La pastelería (entrada de la Torre de Pasteles), con un cupcake en el techo y la grúa de capas. */
function buildBakery(kit, scene, colliders, animations) {
  const { x, z, width, depth } = BAKERY;
  scene.add(at(kit.box(width, 3.6, depth, 0xfff6c9), x, 1.8, z));
  // Toldo de rayas.
  for (let stripe = 0; stripe < 6; stripe += 1) {
    const piece = at(kit.box(width / 6, 0.12, 1.6, stripe % 2 ? 0xffffff : 0xff5fa2), x - width / 2 + width / 12 + (stripe * width) / 6, 3, z + depth / 2 + 0.6);
    piece.rotation.x = 0.35;
    scene.add(piece);
  }
  scene.add(at(kit.box(2, 2.2, 0.1, 0x9fe0ff), x - 1.2, 1.4, z + depth / 2 + 0.05));
  scene.add(at(kit.box(1, 2, 0.1, 0xff8ac4), x + 1.6, 1, z + depth / 2 + 0.05));
  scene.add(at(buildCupcake(kit, { scale: 0.9, cream: 0xfff6c9, liner: 0xff5fa2 }), x, 3.6, z));
  addBox(colliders, { x, z, width, depth, top: 99 });
  sign(kit, scene, '🎂 Pastelería', x, 7.4, z + depth / 2);
  // Una tortica que da vueltas en la vitrina.
  const cake = at(new THREE.Group(), x - 1.2, 0.6, z + depth / 2 + 0.4);
  [[0.9, 0xffc4e1], [0.7, 0xb57bff], [0.5, 0xfff6c9]].forEach(([size, color], index) => cake.add(at(buildCakeLayer(kit, { width: size, height: 0.3, color }), 0, index * 0.3, 0)));
  scene.add(cake);
  animations.push((delta) => (cake.rotation.y += delta * 0.8));
}

/** El patio de la piñata: postes con banderines y una piñata que se mece. */
function buildPartyPatio(kit, scene, colliders, animations) {
  const { x, z } = PARTY;
  [-3.5, 3.5].forEach((dx) => {
    scene.add(at(kit.cyl(0.2, 0.2, 5.6, 0xffffff, 8), x + dx, 2.8, z));
    addCircle(colliders, { x: x + dx, z, r: 0.3 });
  });
  scene.add(at(kit.box(7.4, 0.25, 0.25, 0xb57bff), x, 5.6, z));
  // Banderines entre los postes y hacia la muralla.
  for (let flag = 0; flag < 9; flag += 1) {
    const cone = at(kit.cone(0.3, 0.6, CANDY_COLORS[flag % CANDY_COLORS.length], 3), x - 3.2 + flag * 0.8, 5.15, z);
    cone.rotation.x = Math.PI;
    scene.add(cone);
  }
  const pinata = at(buildPinata(kit, 'donkey'), x, 5.5, z);
  scene.add(pinata);
  scene.add(at(kit.disc(3, 0xfff6c9), x, 0.04, z + 0.5));
  sign(kit, scene, '🪅 ¡Piñata!', x, 7.4, z);
  animations.push((delta, time) => {
    pinata.rotation.z = Math.sin(time * 1.4) * 0.35;
    pinata.rotation.y = Math.sin(time * 0.6) * 0.5;
  });
}

/**
 * El carrusel: plataforma que gira con caballitos (algunos con visitantes) que suben y bajan, y brazos
 * con aros de caramelo alrededor. Devuelve lo que necesita el minijuego.
 */
function buildCarousel(kit, scene, colliders, animations, random) {
  const { x, z, radius, horseRadius, horses: count } = CAROUSEL;
  scene.add(at(kit.cyl(radius, radius + 0.2, 0.5, 0xb57bff, 24), x, 0.25, z));
  addCircle(colliders, { x, z, r: radius + 0.1 });
  const platform = at(new THREE.Group(), x, 0.5, z);
  platform.add(at(kit.cyl(radius - 0.2, radius - 0.2, 0.12, 0xfff0f6, 24), 0, 0.06, 0));
  platform.add(at(kit.cyl(0.8, 0.8, 4.5, 0xffd93d, 12), 0, 2.25, 0));
  platform.add(at(kit.cyl(radius + 0.3, radius + 0.3, 0.6, 0xffffff, 24), 0, 4.8, 0));
  platform.add(at(kit.cone(radius + 0.6, 2.4, 0xff5fa2, 12), 0, 6.3, 0));
  platform.add(at(kit.sphere(0.4, 0xffd93d, 8), 0, 7.6, 0));
  for (let bulb = 0; bulb < 16; bulb += 1) {
    const angle = (bulb / 16) * Math.PI * 2;
    platform.add(at(kit.sphere(0.16, bulb % 2 ? 0xffd93d : 0x9fe0ff, 6, { emissive: 0x554400 }), Math.sin(angle) * (radius + 0.35), 4.5, Math.cos(angle) * (radius + 0.35)));
  }
  const horseColors = [0xffffff, 0xffc4e1, 0xc9e8ff, 0xfff6c9];
  const horses = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const group = buildCarouselHorse(kit, { color: horseColors[index % horseColors.length], mane: CANDY_COLORS[index % CANDY_COLORS.length], horn: index % 2 === 0 });
    group.position.set(Math.sin(angle) * horseRadius, 1.5, Math.cos(angle) * horseRadius);
    // Mirando hacia donde gira la plataforma.
    group.rotation.y = angle + Math.PI / 2;
    platform.add(group);
    const pole = at(kit.cyl(0.05, 0.05, 4.6, 0xffd93d, 6), Math.sin(angle) * horseRadius, 2.3, Math.cos(angle) * horseRadius);
    platform.add(pole);
    const riders = [];
    if (CAROUSEL_RIDER_HORSES.includes(index)) {
      const rider = createRider(kit, random, { scale: 0.5, seatY: 0.4 });
      group.add(rider.root);
      riders.push(rider);
    }
    return { group, pole, angle, riders };
  });
  scene.add(platform);
  sign(kit, scene, '🎠 Carrusel', x, 9.2, z);

  const arms = RING_ARM_ANGLES.map((angle) => {
    const arm = at(new THREE.Group(), x + Math.sin(angle) * RING_ARM_RADIUS, 0, z + Math.cos(angle) * RING_ARM_RADIUS);
    arm.rotation.y = angle;
    const reach = RING_ARM_RADIUS - RING_RADIUS;
    arm.add(at(kit.cyl(0.15, 0.2, 3.9, 0xff5fa2, 8), 0, 1.95, 0));
    arm.add(at(kit.box(0.14, 0.14, reach + 0.2, 0xffffff), 0, 3.85, -reach / 2));
    arm.add(at(kit.box(0.03, 3.85 - RING_HEIGHT - 0.35, 0.03, 0xffffff), 0, (3.85 + RING_HEIGHT + 0.35) / 2, -reach));
    const ring = at(buildCandyRing(kit), 0, RING_HEIGHT, -reach);
    const golden = at(buildCandyRing(kit, { golden: true }), 0, RING_HEIGHT, -reach);
    // De canto hacia donde pasan los caballitos.
    ring.rotation.y = Math.PI / 2;
    golden.rotation.y = Math.PI / 2;
    golden.visible = false;
    arm.add(ring, golden);
    scene.add(arm);
    addCircle(colliders, { x: arm.position.x, z: arm.position.z, r: 0.3 });
    return { angle, ring, golden };
  });

  const riders = horses.flatMap((horse) => horse.riders);
  const handle = { platform, horses, arms, center: new THREE.Vector3(x, 0, z), speed: 0.35 };
  let waveTimer = 2;
  let waving = null;
  animations.push((delta, time) => {
    platform.rotation.y += delta * handle.speed;
    horses.forEach(({ group }, index) => (group.position.y = 1.5 + Math.sin(platform.rotation.y * 4 + index * 1.6) * 0.35));
    riders.forEach((rider) => rider.update(delta));
    arms.forEach(({ ring, golden }, index) => {
      ring.position.y = RING_HEIGHT + Math.sin(time * 2 + index) * 0.04;
      golden.position.y = ring.position.y;
      golden.rotation.x += delta * 2;
    });
    waveTimer -= delta;
    if (waveTimer <= 0 && riders.length) {
      waving?.setCheer(false);
      waveTimer = 2.5 + random() * 2;
      waving = riders[Math.floor(random() * riders.length)];
      waving.setCheer(true);
      waving.say(pickLine(['¡Arre, caballito! 🎠', '¡Wiii! 🤩', '¡Mira, un unicornio! 🦄'], random), 2);
    }
  });
  return handle;
}

/** Pueblito de casitas de jengibre y la pastelera, que da consejos. */
function buildVillage(kit, scene, colliders, animations, random) {
  HOUSES.forEach(({ x, z }, index) => {
    scene.add(at(buildGingerbreadHouse(kit, { roof: index === 1 ? 0xff8ac4 : CHOCOLATE }), x, 0, z));
    addBox(colliders, { x, z, width: 5, depth: 4, top: 99 });
  });
  sign(kit, scene, '🍪 Pueblo de jengibre', -24, 5.5, 40);

  const spot = { x: -9, z: 15 };
  const avatar = createAvatar(kit, {
    ...randomLook(random),
    shirt: { color: '#ffffff', stripe: '#ff8ac4' },
    pants: { color: '#ff8ac4', skirt: true },
    hat: { kind: 'cap', color: '#ffffff' },
    extra: { kind: 'none' },
  });
  avatar.root.position.set(spot.x, 0, spot.z);
  avatar.root.rotation.y = 2.4;
  avatar.shadow.position.set(spot.x, 0.03, spot.z);
  scene.add(avatar.root, avatar.shadow);
  addCircle(colliders, { x: spot.x, z: spot.z, r: 0.6 });
  // Su bandeja de cupcakes.
  scene.add(at(kit.cyl(0.9, 0.9, 0.9, 0xffc4e1, 12), spot.x - 1.3, 0.45, spot.z + 0.6));
  [0, 1, 2].forEach((index) => scene.add(at(buildCupcake(kit, { scale: 0.15, cream: [0xffc4e1, 0xfff6c9, 0xb57bff][index] }), spot.x - 1.6 + index * 0.3, 0.9, spot.z + 0.6)));
  addCircle(colliders, { x: spot.x - 1.3, z: spot.z + 0.6, r: 0.9 });
  const name = kit.label('🧁 Pastelera Dulcinea', { height: 0.45 });
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

/** Chupetines, bastones de caramelo, donas que giran y helados por todo el parque. */
function buildSweetForest(kit, scene, colliders, animations) {
  LOLLIPOPS.forEach(([x, z], index) => {
    scene.add(at(buildLollipop(kit, { color: CANDY_COLORS[index % CANDY_COLORS.length], height: 3.5 + (index % 3) * 1.2, radius: 1.1 + (index % 2) * 0.4 }), x, 0, z));
    addCircle(colliders, { x, z, r: 0.3 });
  });
  // Bastones en arco a los lados del camino de la entrada.
  [20, 30, 40].forEach((z) => {
    [-1, 1].forEach((side) => {
      const cane = at(buildCandyCane(kit, { height: 4 }), side * 3.8, 0, z);
      // La curva mira hacia el camino.
      cane.rotation.y = side < 0 ? 0 : Math.PI;
      scene.add(cane);
      addCircle(colliders, { x: side * 3.8, z, r: 0.25 });
    });
  });
  const donuts = [[12, 42, 0xff8ac4], [-48, -26, 0xb57bff], [50, -12, 0x5ab0ff]].map(([x, z, glaze]) => {
    const donut = at(buildDonut(kit, { radius: 1.5, glaze }), x, 2.6, z);
    scene.add(donut, at(kit.cyl(0.15, 0.15, 1, 0xffffff, 6), x, 0.5, z));
    addCircle(colliders, { x, z, r: 0.9 });
    return donut;
  });
  [[12, 4, 0xffc4e1], [-12, 4, 0xc9e8ff], [10, 12, 0xfff6c9]].forEach(([x, z, flavor]) => {
    scene.add(at(buildIceCream(kit, { flavor }), x, 0, z));
    addCircle(colliders, { x, z, r: 0.6 });
  });
  animations.push((delta) => donuts.forEach((donut) => (donut.rotation.y += delta * 0.6)));
}

/** Gomitas pequeñas por el suelo (InstancedMesh: muchas sin pesar). */
function buildSmallGumdrops(kit, scene, colliders, random) {
  const spots = [];
  while (spots.length < 80) {
    const angle = random() * Math.PI * 2;
    const radius = 16 + random() * 48;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2 || Math.abs(x) < 5 || isBlocked(colliders, x, z, 1)) continue;
    spots.push({ x, z, scale: 0.3 + random() * 0.35, color: CANDY_COLORS[Math.floor(random() * CANDY_COLORS.length)] });
  }
  const gumdrops = new THREE.InstancedMesh(kit.geometry('gumdrop-small', () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), kit.mat(0xffffff), spots.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  spots.forEach(({ x, z, scale, color: hex }, index) => {
    matrix.makeScale(scale, scale * 0.9, scale).setPosition(x, 0, z);
    gumdrops.setMatrixAt(index, matrix);
    gumdrops.setColorAt(index, color.setHex(hex));
  });
  scene.add(gumdrops);
}

/** Muñecos de jengibre que pasean de un lado a otro. */
function buildGingerbreadWalkers(kit, scene, animations) {
  const routes = [
    { from: new THREE.Vector3(-10, 0, 22), to: new THREE.Vector3(-26, 0, 28) },
    { from: new THREE.Vector3(10, 0, 24), to: new THREE.Vector3(22, 0, 16) },
    { from: new THREE.Vector3(40, 0, -4), to: new THREE.Vector3(50, 0, 4) },
    { from: new THREE.Vector3(-18, 0, -36), to: new THREE.Vector3(-8, 0, -44) },
  ];
  const walkers = routes.map((route) => {
    const man = buildGingerbreadMan(kit);
    scene.add(man);
    return { man, ...route, length: route.from.distanceTo(route.to) };
  });
  animations.push((delta, time) => {
    walkers.forEach(({ man, from, to, length }, index) => {
      // Ida y vuelta a paso de muñeco.
      const cycle = ((time * 1.2) / length + index * 0.37) % 2;
      const t = cycle < 1 ? cycle : 2 - cycle;
      man.position.lerpVectors(from, to, t);
      man.position.y = Math.abs(Math.sin(time * 6 + index)) * 0.12;
      man.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + (cycle < 1 ? 0 : Math.PI);
      man.rotation.z = Math.sin(time * 6 + index) * 0.08;
      man.userData.legs.forEach((leg, side) => (leg.rotation.x = Math.sin(time * 6 + index + side * Math.PI) * 0.5));
    });
  });
}

/** Nubes de algodón de azúcar que flotan por encima del parque. */
function buildCottonClouds(kit, scene, animations, random) {
  const clouds = Array.from({ length: 7 }, (_, index) => {
    const cloud = buildCottonCandyCloud(kit, [0xffc4e1, 0xc9e8ff, 0xe7c8ff][index % 3]);
    const angle = random() * Math.PI * 2;
    const radius = 20 + random() * 40;
    cloud.scale.setScalar(1.4 + random());
    scene.add(cloud);
    return { cloud, x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, height: 16 + random() * 8, phase: random() * 6 };
  });
  animations.push((delta, time) => {
    clouds.forEach(({ cloud, x, z, height, phase }) => cloud.position.set(x + Math.sin(time * 0.1 + phase) * 6, height + Math.sin(time * 0.5 + phase), z));
  });
}

/** Lluvia de chispitas de colores: el cielo se pone lila, caen chispitas y luego sale el arcoíris. */
function buildSprinkles(kit, scene, animations, random) {
  const positions = new Float32Array(SPRINKLES * 3);
  const colors = new Float32Array(SPRINKLES * 3);
  const color = new THREE.Color();
  for (let index = 0; index < SPRINKLES; index += 1) {
    positions[index * 3] = (random() - 0.5) * 130;
    positions[index * 3 + 1] = random() * 30;
    positions[index * 3 + 2] = (random() - 0.5) * 130;
    color.setHex(CANDY_COLORS[index % CANDY_COLORS.length]);
    colors.set([color.r, color.g, color.b], index * 3);
  }
  const geometry = kit.track(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = kit.track(new THREE.PointsMaterial({ size: 0.45, vertexColors: true }));
  const sprinkles = new THREE.Points(geometry, material);
  sprinkles.visible = false;
  scene.add(sprinkles);

  const rainbow = at(new THREE.Group(), 0, 0, -90);
  [0xff5f5f, 0xff9f43, 0xffd93d, 0x4caf50, 0x2f8fff, 0x8e44ad].forEach((hex, index) => {
    const radius = 46 - index * 1.4;
    rainbow.add(new THREE.Mesh(kit.geometry(`rainbow-${index}`, () => new THREE.TorusGeometry(radius, 0.7, 6, 48, Math.PI)), kit.mat(hex, { opacity: 0.75 })));
  });
  rainbow.visible = false;
  scene.add(rainbow);

  const sky = scene.background.clone();
  const cycle = DRY_SECONDS + SPRINKLE_SECONDS + RAINBOW_SECONDS;
  // La primera lluvia llega pronto, para que se vea.
  const offset = DRY_SECONDS - 30;
  animations.push((delta, time) => {
    const moment = (time + offset) % cycle;
    const falling = moment >= DRY_SECONDS && moment < DRY_SECONDS + SPRINKLE_SECONDS;
    const progress = falling ? (moment - DRY_SECONDS) / SPRINKLE_SECONDS : 0;
    const tint = falling ? Math.min(1, progress * 5, (1 - progress) * 5) : 0;
    scene.background.lerpColors(sky, SPRINKLE_SKY, tint);
    scene.fog.color.copy(scene.background);
    sprinkles.visible = falling;
    if (falling) {
      const attribute = geometry.getAttribute('position');
      for (let index = 0; index < SPRINKLES; index += 1) {
        let y = attribute.array[index * 3 + 1] - delta * 9;
        if (y < 0) y += 30;
        attribute.array[index * 3 + 1] = y;
      }
      attribute.needsUpdate = true;
    }
    const rainbowTime = moment - DRY_SECONDS - SPRINKLE_SECONDS;
    rainbow.visible = rainbowTime > 0;
    if (rainbow.visible) rainbow.scale.set(1, Math.min(1, rainbowTime / 2, (RAINBOW_SECONDS - rainbowTime) / 2), 1);
  });
}
