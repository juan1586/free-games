/**
 * Objetos del Castillo de Dulces que salen en el parque y en sus atracciones: chupetines, bastones de
 * caramelo, gomitas, donas, cupcakes, nubes de algodón de azúcar, casitas y muñecos de jengibre, el
 * castillo, los caballitos del carrusel, las piñatas y las capas de pastel.
 */
import * as THREE from 'three';
import { at } from './kit.js';

export const CANDY_COLORS = [0xff5fa2, 0x5ab0ff, 0xffd93d, 0x4dd4ac, 0xb57bff, 0xff9f43];
export const CHOCOLATE = 0x6b3b1f;
export const GINGER = 0xc8834a;
export const FROSTING = 0xfff4fa;

/** Chupetín: palito blanco y disco de espiral (anillos de dos colores). */
export function buildLollipop(kit, { color = 0xff5fa2, height = 4, radius = 1.3 } = {}) {
  const lollipop = new THREE.Group();
  lollipop.add(at(kit.cyl(0.12, 0.12, height, 0xffffff, 6), 0, height / 2, 0));
  const candy = at(new THREE.Group(), 0, height + radius * 0.8, 0);
  candy.add(kit.cyl(radius, radius, 0.4, 0xffffff, 18));
  [0.8, 0.45].forEach((part) => candy.add(at(kit.cyl(radius * part, radius * part, 0.44, color, 18), 0, 0, 0)));
  candy.add(at(kit.cyl(radius * 0.2, radius * 0.2, 0.48, 0xffffff, 10), 0, 0, 0));
  candy.rotation.x = Math.PI / 2;
  lollipop.add(candy);
  return lollipop;
}

/** Bastón de caramelo con rayas, con la curva arriba. */
export function buildCandyCane(kit, { height = 3.5, stripe = 0xe63946 } = {}) {
  const cane = new THREE.Group();
  const segments = 7;
  for (let index = 0; index < segments; index += 1) {
    const piece = (height / segments) * 0.98;
    cane.add(at(kit.cyl(0.18, 0.18, piece, index % 2 ? stripe : 0xffffff, 8), 0, piece / 2 + (index * height) / segments, 0));
  }
  // Media rosca: la curva del bastón.
  const hookGeometry = kit.geometry('cane-hook', () => new THREE.TorusGeometry(0.5, 0.18, 8, 12, Math.PI));
  cane.add(at(new THREE.Mesh(hookGeometry, kit.mat(stripe)), 0.5, height, 0));
  return cane;
}

/** Gomita: un domo de color brillante con azúcar. */
export function buildGumdrop(kit, { color = 0x4dd4ac, radius = 1 } = {}) {
  const gumdrop = new THREE.Group();
  const dome = kit.sphere(radius, color, 12);
  dome.scale.y = 0.8;
  gumdrop.add(dome);
  return gumdrop;
}

/** Dona con glaseado y chispitas. */
export function buildDonut(kit, { radius = 1.4, glaze = 0xff8ac4 } = {}) {
  const donut = new THREE.Group();
  donut.add(kit.torus(radius, radius * 0.45, 0xd9a066));
  const top = at(kit.torus(radius, radius * 0.36, glaze), 0, 0, radius * 0.14);
  donut.add(top);
  CANDY_COLORS.forEach((color, index) => {
    const angle = (index / CANDY_COLORS.length) * Math.PI * 2;
    const sprinkle = at(kit.box(0.08, 0.3, 0.08, color), Math.cos(angle) * radius, Math.sin(angle) * radius, radius * 0.55);
    sprinkle.rotation.z = angle;
    donut.add(sprinkle);
  });
  return donut;
}

/** Cupcake: molde de rayas, crema en remolino y una cereza. */
export function buildCupcake(kit, { scale = 1, cream = 0xffc4e1, liner = 0x5ab0ff } = {}) {
  const cupcake = new THREE.Group();
  cupcake.add(at(kit.cyl(1.2, 0.9, 1.4, liner, 14), 0, 0.7, 0));
  cupcake.add(at(kit.cyl(1.3, 1.25, 0.25, 0xd9a066, 14), 0, 1.5, 0));
  [[1.25, 1.75], [0.95, 2.2], [0.6, 2.6]].forEach(([radius, y]) => {
    const swirl = at(kit.sphere(radius, cream, 12), 0, y, 0);
    swirl.scale.y = 0.55;
    cupcake.add(swirl);
  });
  cupcake.add(at(kit.sphere(0.28, 0xe63946, 10), 0, 3, 0));
  cupcake.scale.setScalar(scale);
  return cupcake;
}

/** Helado de cucurucho. */
export function buildIceCream(kit, { flavor = 0xffc4e1 } = {}) {
  const iceCream = new THREE.Group();
  const cone = at(kit.cone(0.6, 1.8, 0xe0a85a, 10), 0, 0.9, 0);
  cone.rotation.x = Math.PI;
  iceCream.add(cone, at(kit.sphere(0.7, flavor, 12), 0, 2, 0), at(kit.sphere(0.18, 0xe63946, 8), 0, 2.75, 0));
  return iceCream;
}

/** Nube de algodón de azúcar. */
export function buildCottonCandyCloud(kit, color = 0xffc4e1) {
  const cloud = new THREE.Group();
  [[0, 0, 0, 1.6], [1.4, -0.2, 0.3, 1.2], [-1.4, -0.2, -0.2, 1.2], [0.4, 0.6, -0.6, 1]].forEach(([x, y, z, r]) =>
    cloud.add(at(kit.sphere(r, color, 10), x, y, z)),
  );
  return cloud;
}

/** Casita de jengibre: paredes de galleta, techo de chocolate con nieve de azúcar y puerta de caramelo. */
export function buildGingerbreadHouse(kit, { width = 5, depth = 4, height = 3.2, roof = CHOCOLATE } = {}) {
  const house = new THREE.Group();
  house.add(at(kit.box(width, height, depth, GINGER), 0, height / 2, 0));
  // Techo a dos aguas: dos tablas inclinadas.
  [-1, 1].forEach((side) => {
    const slab = at(kit.box(width + 0.6, 0.3, depth * 0.62, roof), 0, height + 0.85, side * depth * 0.24);
    slab.rotation.x = side * 0.7;
    house.add(slab);
    const icing = at(kit.box(width + 0.7, 0.12, 0.3, FROSTING), 0, height + 0.25, side * (depth / 2 + 0.05));
    house.add(icing);
  });
  house.add(at(kit.box(1.1, 1.7, 0.1, 0xff5fa2), 0, 0.85, depth / 2 + 0.03));
  house.add(at(kit.sphere(0.1, 0xffd93d, 6), 0.35, 0.85, depth / 2 + 0.1));
  [-1, 1].forEach((side) => {
    house.add(at(kit.box(0.9, 0.9, 0.1, 0xfff6c9), side * (width / 2 - 1.1), height * 0.6, depth / 2 + 0.03));
    house.add(at(kit.box(1.1, 0.12, 0.12, FROSTING), side * (width / 2 - 1.1), height * 0.6 + 0.5, depth / 2 + 0.08));
  });
  // Gomitas en la esquina del techo.
  CANDY_COLORS.slice(0, 4).forEach((color, index) => house.add(at(kit.sphere(0.2, color, 8), -width / 2 + 0.6 + index * ((width - 1.2) / 3), height + 0.15, depth / 2 + 0.15)));
  return house;
}

/** Muñeco de jengibre (anda balanceándose: se mueven `userData.legs`). */
export function buildGingerbreadMan(kit) {
  const man = new THREE.Group();
  man.add(at(kit.box(0.8, 0.9, 0.3, GINGER), 0, 1, 0));
  man.add(at(kit.cyl(0.42, 0.42, 0.3, GINGER, 14), 0, 1.75, 0));
  man.children[1].rotation.x = Math.PI / 2;
  [-0.15, 0.15].forEach((x) => man.add(at(kit.box(0.08, 0.08, 0.05, 0x2b2140), x, 1.82, 0.17)));
  man.add(at(kit.box(0.3, 0.06, 0.05, 0xffffff), 0, 1.62, 0.17));
  [0xe63946, 0x4dd4ac, 0xffd93d].forEach((color, index) => man.add(at(kit.sphere(0.07, color, 6), 0, 1.25 - index * 0.25, 0.17)));
  [-1, 1].forEach((side) => {
    const arm = at(kit.box(0.6, 0.25, 0.28, GINGER), side * 0.6, 1.2, 0);
    arm.rotation.z = side * -0.5;
    man.add(arm);
  });
  const legs = [-1, 1].map((side) => {
    const pivot = at(new THREE.Group(), side * 0.22, 0.6, 0);
    pivot.add(at(kit.box(0.3, 0.6, 0.28, GINGER), 0, -0.3, 0));
    man.add(pivot);
    return pivot;
  });
  man.userData.legs = legs;
  return man;
}

/** Torre redonda del castillo con techo de cucurucho y bandera. */
export function buildCandyTower(kit, { height = 9, radius = 1.8, color = 0xffc4e1, roof = 0xb57bff } = {}) {
  const tower = new THREE.Group();
  tower.add(at(kit.cyl(radius, radius, height, color, 14), 0, height / 2, 0));
  for (let ring = 1; ring < height; ring += 2.2) tower.add(at(kit.cyl(radius + 0.06, radius + 0.06, 0.3, FROSTING, 14), 0, ring, 0));
  tower.add(at(kit.cone(radius + 0.5, radius * 2, roof, 14), 0, height + radius, 0));
  tower.add(at(kit.sphere(0.3, 0xffd93d, 8), 0, height + radius * 2 + 0.2, 0));
  tower.add(at(kit.box(0.06, 1.4, 0.06, 0xffffff), 0, height + radius * 2 + 0.9, 0));
  tower.add(at(kit.box(0.8, 0.5, 0.05, 0xff5fa2), 0.42, height + radius * 2 + 1.3, 0));
  return tower;
}

/** Almenas de chocolate encima de un muro de `width` de largo (en X). */
export function addBattlements(kit, group, { width, y, z }) {
  for (let x = -width / 2 + 0.5; x <= width / 2 - 0.4; x += 1.6) group.add(at(kit.box(0.8, 0.7, 0.5, CHOCOLATE), x, y + 0.35, z));
}

/** Caballito del carrusel (unicornio si `horn`), mirando a +Z. */
export function buildCarouselHorse(kit, { color = 0xffffff, mane = 0xff8ac4, horn = false } = {}) {
  const horse = new THREE.Group();
  horse.add(at(kit.box(0.55, 0.6, 1.4, color), 0, 0, 0));
  const neck = at(kit.box(0.4, 0.8, 0.4, color), 0, 0.45, 0.6);
  neck.rotation.x = 0.4;
  horse.add(neck);
  horse.add(at(kit.box(0.42, 0.42, 0.75, color), 0, 0.85, 0.95));
  horse.add(at(kit.box(0.14, 0.7, 0.5, mane), 0, 0.7, 0.45));
  horse.add(at(kit.box(0.12, 0.6, 0.12, mane), 0, -0.1, -0.75));
  [-0.18, 0.18].forEach((x) => horse.add(at(kit.box(0.08, 0.08, 0.08, 0x2b2140), x + Math.sign(x) * 0.04, 0.95, 1.2)));
  [[-0.18, 0.5], [0.18, 0.5], [-0.18, -0.5], [0.18, -0.5]].forEach(([x, z], index) => {
    const leg = at(kit.box(0.14, 0.6, 0.14, color), x, -0.5, z);
    leg.rotation.x = index < 2 ? -0.6 : 0.6;
    horse.add(leg);
  });
  // Silla de montar.
  horse.add(at(kit.box(0.6, 0.12, 0.55, 0xffd93d), 0, 0.33, 0));
  if (horn) {
    const hornMesh = at(kit.cone(0.08, 0.45, 0xffd93d, 6), 0, 1.25, 1.15);
    hornMesh.rotation.x = 0.5;
    horse.add(hornMesh);
  }
  return horse;
}

/** Aro de caramelo (de rayas) o dorado. */
export function buildCandyRing(kit, { golden = false } = {}) {
  const ring = new THREE.Group();
  if (golden) {
    ring.add(kit.torus(0.35, 0.09, 0xffd21f, { emissive: 0x6a4a00 }));
  } else {
    ring.add(kit.torus(0.35, 0.09, 0xff5fa2));
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      ring.add(at(kit.box(0.08, 0.2, 0.2, 0xffffff), Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0));
    }
  }
  return ring;
}

/** Flecos de colores de la piñata alrededor de una forma (cajitas pequeñas). */
function addFringe(kit, group, { radius, y, count = 10 }) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    group.add(at(kit.box(0.12, 0.35, 0.12, CANDY_COLORS[index % CANDY_COLORS.length]), Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
}

/** Piñatas: `star` (estrella de puntas), `donkey` (burrito) o `candy` (caramelo envuelto). Cuelgan de su punto (0, 0, 0). */
export function buildPinata(kit, kind = 'star') {
  const pinata = new THREE.Group();
  const body = at(new THREE.Group(), 0, -1, 0);
  pinata.add(body);
  if (kind === 'donkey') {
    body.add(at(kit.box(1.4, 0.8, 0.7, 0x5ab0ff), 0, 0, 0));
    body.add(at(kit.box(0.5, 0.9, 0.5, 0xff5fa2), 0.75, 0.45, 0));
    body.add(at(kit.box(0.7, 0.4, 0.45, 0xffd93d), 1.05, 0.85, 0));
    [-0.15, 0.15].forEach((z) => body.add(at(kit.box(0.12, 0.45, 0.1, 0xff9f43), 0.75, 1.25, z)));
    [[-0.5, -0.2], [-0.5, 0.2], [0.45, -0.2], [0.45, 0.2]].forEach(([x, z]) => body.add(at(kit.box(0.18, 0.6, 0.18, 0x4dd4ac), x, -0.65, z)));
    body.add(at(kit.box(0.3, 0.12, 0.12, 0xb57bff), -0.85, 0.2, 0));
    [-0.4, 0, 0.4].forEach((x, index) => body.add(at(kit.box(0.3, 0.82, 0.72, CANDY_COLORS[index + 2]), x, 0, 0)));
  } else if (kind === 'candy') {
    const middle = kit.cyl(0.6, 0.6, 1.3, 0xff5fa2, 14);
    middle.rotation.z = Math.PI / 2;
    body.add(middle);
    [-1, 1].forEach((side) => {
      const wrap = at(kit.cone(0.55, 0.8, 0xffd93d, 10), side * 1.0, 0, 0);
      wrap.rotation.z = side * Math.PI / 2;
      body.add(wrap);
    });
    [-0.3, 0.3].forEach((x) => {
      const stripe = at(kit.cyl(0.62, 0.62, 0.16, 0xffffff, 14), x, 0, 0);
      stripe.rotation.z = Math.PI / 2;
      body.add(stripe);
    });
  } else {
    body.add(kit.sphere(0.75, 0xffd93d, 12));
    for (let point = 0; point < 6; point += 1) {
      const angle = (point / 6) * Math.PI * 2;
      const cone = at(kit.cone(0.3, 0.9, CANDY_COLORS[point % CANDY_COLORS.length], 8), Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, 0);
      cone.rotation.z = angle - Math.PI / 2;
      body.add(cone);
    }
    addFringe(kit, body, { radius: 0.6, y: -0.7 });
  }
  pinata.add(at(kit.box(0.04, 0.6, 0.04, 0xf3e1b5), 0, -0.3, 0));
  pinata.userData.body = body;
  return pinata;
}

/** Capa de pastel: bizcocho de color, crema arriba y gotitas que caen por el borde. */
export function buildCakeLayer(kit, { width = 2.4, height = 0.6, color = 0xffc4e1, frosting = FROSTING } = {}) {
  const layer = new THREE.Group();
  const radius = width / 2;
  layer.add(at(kit.cyl(radius, radius, height, color, 20), 0, height / 2, 0));
  layer.add(at(kit.cyl(radius + 0.03, radius + 0.03, 0.12, frosting, 20), 0, height - 0.04, 0));
  for (let drip = 0; drip < 8; drip += 1) {
    const angle = (drip / 8) * Math.PI * 2;
    layer.add(at(kit.box(0.14, 0.18 + (drip % 3) * 0.06, 0.08, frosting), Math.cos(angle) * radius, height - 0.16, Math.sin(angle) * radius));
  }
  return layer;
}
