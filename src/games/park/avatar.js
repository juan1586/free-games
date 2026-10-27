/**
 * Personaje de bloques (estilo Roblox) para la jugadora y los visitantes. Mide unos 2,3 m, tiene los
 * pies en y = 0 y mira hacia +Z. La ropa sale de outfits.js.
 */
import * as THREE from 'three';
import { at } from './kit.js';

const HIP_Y = 0.8;
const SHOULDER_Y = 1.55;
const HEAD_Y = 1.95;
const HEAD_TOP = 2.26;
const FACE_Z = 0.315;

/**
 * Crea el personaje. Devuelve { root, shadow, setLook(look), update(delta, { speed, airborne, seated, cheer }) }.
 * `seated`: sentado con las manos al frente; con `cheer`, los brazos arriba (gritando en las bajadas).
 */
export function createAvatar(kit, look) {
  const root = new THREE.Group();
  const shadow = kit.disc(0.55, 0x000000, { opacity: 0.22 });
  shadow.position.y = 0.03;

  let parts = null;
  let phase = Math.random() * Math.PI * 2;

  function setLook(nextLook) {
    if (parts) root.remove(parts.body);
    parts = buildBody(kit, nextLook);
    root.add(parts.body);
  }

  function update(delta, { speed = 0, airborne = false, seated = false, cheer = false } = {}) {
    const { leftLeg, rightLeg, leftArm, rightArm, spinners, flappers } = parts;
    const amount = Math.min(1, speed / 4);
    phase += delta * (4 + speed * 1.6);
    if (seated) {
      leftLeg.rotation.x = rightLeg.rotation.x = -1.4;
      const wave = Math.sin(phase * 2) * 0.25;
      leftArm.rotation.x = cheer ? -2.9 + wave : -1.3;
      rightArm.rotation.x = cheer ? -2.9 - wave : -1.3;
    } else if (airborne) {
      leftLeg.rotation.x = 0.5;
      rightLeg.rotation.x = -0.4;
      leftArm.rotation.x = rightArm.rotation.x = -2.4;
    } else {
      const swing = Math.sin(phase) * 0.75 * amount;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.9;
      rightArm.rotation.x = swing * 0.9;
    }
    parts.body.position.y = airborne || seated ? 0 : Math.abs(Math.sin(phase)) * 0.06 * amount;
    spinners.forEach((spinner) => (spinner.rotation.y += delta * (6 + speed * 2)));
    flappers.forEach(({ object, side }) => (object.rotation.y = side * (0.5 + Math.sin(phase * 0.8) * 0.35)));
  }

  setLook(look);
  return { root, shadow, setLook, update };
}

function limb(kit, { x, y, width, length, depth, color, endColor }) {
  const pivot = at(new THREE.Group(), x, y, 0);
  pivot.add(at(kit.box(width, length, depth, color), 0, -length / 2, 0));
  if (endColor) pivot.add(at(kit.box(width * 0.98, 0.18, depth * 0.98, endColor), 0, -length + 0.09, 0));
  return pivot;
}

function buildBody(kit, look) {
  const body = new THREE.Group();
  const skin = look.skin.color;
  const spinners = [];
  const flappers = [];

  const leftLeg = limb(kit, { x: -0.22, y: HIP_Y, width: 0.38, length: 0.8, depth: 0.42, color: look.pants.color, endColor: 0x2b2140 });
  const rightLeg = limb(kit, { x: 0.22, y: HIP_Y, width: 0.38, length: 0.8, depth: 0.42, color: look.pants.color, endColor: 0x2b2140 });
  const leftArm = limb(kit, { x: -0.62, y: SHOULDER_Y, width: 0.3, length: 0.72, depth: 0.36, color: look.shirt.color, endColor: skin });
  const rightArm = limb(kit, { x: 0.62, y: SHOULDER_Y, width: 0.3, length: 0.72, depth: 0.36, color: look.shirt.color, endColor: skin });
  body.add(leftLeg, rightLeg, leftArm, rightArm);

  body.add(at(kit.box(0.92, 0.8, 0.5, look.shirt.color), 0, 1.2, 0));
  if (look.shirt.stripe) body.add(at(kit.box(0.94, 0.16, 0.52, look.shirt.stripe), 0, 1.28, 0));

  body.add(at(kit.box(0.62, 0.62, 0.62, skin), 0, HEAD_Y, 0));
  body.add(at(kit.box(0.09, 0.13, 0.02, 0x2b2140), -0.13, 2.0, FACE_Z));
  body.add(at(kit.box(0.09, 0.13, 0.02, 0x2b2140), 0.13, 2.0, FACE_Z));
  body.add(at(kit.box(0.22, 0.05, 0.02, 0x2b2140), 0, 1.84, FACE_Z));
  body.add(at(kit.box(0.1, 0.06, 0.02, 0xff9ab8), -0.22, 1.88, FACE_Z));
  body.add(at(kit.box(0.1, 0.06, 0.02, 0xff9ab8), 0.22, 1.88, FACE_Z));

  addHat(kit, body, look.hat, spinners);
  addExtra(kit, body, look.extra, flappers);
  return { body, leftLeg, rightLeg, leftArm, rightArm, spinners, flappers };
}

function addHat(kit, body, hat, spinners) {
  const top = HEAD_TOP;
  switch (hat.kind) {
    case 'cap':
      body.add(at(kit.cyl(0.34, 0.34, 0.2, hat.color, 14), 0, top + 0.06, 0));
      body.add(at(kit.box(0.5, 0.05, 0.36, hat.color), 0, top - 0.02, 0.36));
      break;
    case 'brim': {
      body.add(at(kit.cyl(0.72, 0.72, 0.05, hat.color, 20), 0, top + 0.01, 0));
      body.add(at(kit.cyl(0.32, 0.36, 0.36, hat.color, 16), 0, top + 0.2, 0));
      body.add(at(kit.cyl(0.37, 0.37, 0.08, hat.band, 16), 0, top + 0.08, 0));
      if (hat.stripes) {
        body.add(at(kit.cyl(0.62, 0.62, 0.055, hat.band, 20), 0, top + 0.015, 0));
        body.add(at(kit.cyl(0.54, 0.54, 0.06, hat.color, 20), 0, top + 0.02, 0));
        body.add(at(kit.cyl(0.33, 0.33, 0.05, hat.band, 16), 0, top + 0.3, 0));
      }
      break;
    }
    case 'flower':
      [0, 1, 2, 3, 4].forEach((index) => {
        const angle = (index / 5) * Math.PI * 2;
        body.add(at(kit.sphere(0.09, hat.color, 8), 0.34, top - 0.02 + Math.sin(angle) * 0.1, 0.05 + Math.cos(angle) * 0.1));
      });
      body.add(at(kit.sphere(0.07, 0xffd93d, 8), 0.38, top - 0.02, 0.05));
      break;
    case 'bunny':
      [-1, 1].forEach((side) => {
        const ear = at(kit.box(0.14, 0.55, 0.08, hat.color), side * 0.16, top + 0.27, 0);
        ear.rotation.z = -side * 0.15;
        ear.add(at(kit.box(0.07, 0.4, 0.02, 0xffb3d1), 0, 0, 0.05));
        body.add(ear);
      });
      break;
    case 'propeller': {
      body.add(at(kit.cyl(0.3, 0.33, 0.14, hat.color, 14), 0, top + 0.05, 0));
      body.add(at(kit.cyl(0.03, 0.03, 0.22, 0xffd93d, 6), 0, top + 0.22, 0));
      const blades = at(new THREE.Group(), 0, top + 0.33, 0);
      blades.add(kit.box(0.8, 0.03, 0.1, 0xff5fa2));
      blades.add(kit.box(0.1, 0.03, 0.8, 0x4dd4ac));
      spinners.push(blades);
      body.add(blades);
      break;
    }
    case 'crown':
      body.add(at(kit.cyl(0.33, 0.33, 0.18, hat.color, 8), 0, top + 0.08, 0));
      [0, 1, 2, 3, 4].forEach((index) => {
        const angle = (index / 5) * Math.PI * 2;
        body.add(at(kit.cone(0.07, 0.16, hat.color, 6), Math.sin(angle) * 0.27, top + 0.24, Math.cos(angle) * 0.27));
      });
      body.add(at(kit.sphere(0.06, 0xff5fa2, 8), 0, top + 0.1, 0.33));
      break;
    default:
      break;
  }
}

function addExtra(kit, body, extra, flappers) {
  switch (extra.kind) {
    case 'glasses':
      body.add(at(kit.box(0.2, 0.13, 0.03, extra.color), -0.14, 2.0, FACE_Z + 0.01));
      body.add(at(kit.box(0.2, 0.13, 0.03, extra.color), 0.14, 2.0, FACE_Z + 0.01));
      body.add(at(kit.box(0.6, 0.03, 0.03, extra.color), 0, 2.04, FACE_Z + 0.01));
      break;
    case 'mustache':
      body.add(at(kit.box(0.38, 0.08, 0.04, extra.color), 0, 1.9, FACE_Z + 0.01));
      break;
    case 'carriel': {
      const strap = at(kit.box(0.08, 1.05, 0.54, 0x5c3a1a), 0, 1.25, 0);
      strap.rotation.z = 0.75;
      body.add(strap);
      body.add(at(kit.box(0.34, 0.3, 0.14, extra.color), 0.56, 0.92, 0.12));
      body.add(at(kit.box(0.34, 0.08, 0.15, 0x3b2414), 0.56, 1.03, 0.12));
      break;
    }
    case 'ruana':
      body.add(at(kit.box(1.5, 0.5, 0.62, extra.color), 0, 1.38, 0));
      body.add(at(kit.box(1.52, 0.06, 0.64, 0x2b2140), 0, 1.2, 0));
      body.add(at(kit.box(1.52, 0.06, 0.64, 0xffd93d), 0, 1.3, 0));
      break;
    case 'backpack':
      body.add(at(kit.box(0.72, 0.7, 0.3, extra.color), 0, 1.22, -0.38));
      body.add(at(kit.box(0.5, 0.24, 0.1, 0xffd93d), 0, 1.1, -0.56));
      break;
    case 'cape': {
      const cape = at(kit.box(0.88, 1.15, 0.06, extra.color), 0, 1.0, -0.3);
      cape.rotation.x = 0.12;
      body.add(cape);
      break;
    }
    case 'wings':
      [-1, 1].forEach((side) => {
        const pivot = at(new THREE.Group(), side * 0.12, 1.35, -0.3);
        pivot.add(at(kit.box(0.75, 0.9, 0.04, extra.color, { opacity: 0.85 }), side * 0.4, 0.1, 0));
        pivot.add(at(kit.box(0.5, 0.55, 0.05, 0xb57bff, { opacity: 0.85 }), side * 0.32, -0.45, 0));
        flappers.push({ object: pivot, side });
        body.add(pivot);
      });
      break;
    default:
      break;
  }
}
