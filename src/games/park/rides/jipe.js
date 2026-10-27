/**
 * El Jipe: manejar un Willys por un camino entre cafetales, recogiendo granos de café.
 */
import * as THREE from 'three';
import { at } from '../kit.js';
import { buildCoffeeBushes, buildJeep } from '../props.js';
import { createDriveRide } from './drive.js';

const JIPE_THEME = {
  vehicle: (kit) => buildJeep(kit, 0x3fae6a),
  seats: {
    driver: { x: -0.45, z: -0.45, seatY: 1.35, scale: 0.75 },
    copilot: { x: 0.45, z: -0.45, seatY: 1.35, scale: 0.75 },
    back: { x: 0, z: -1.35, seatY: 1.5, scale: 0.75 },
  },
  ground: 0x86cf6a,
  road: 0xc9a26b,
  line: 0xf6e4bd,
  scenery: buildCoffeeBushes,
  pickup: {
    build: (kit) => {
      const group = new THREE.Group();
      const bean = kit.sphere(0.45, 0xb5371f, 10, { emissive: 0x301000 });
      bean.scale.set(0.8, 1, 0.6);
      group.add(bean, at(kit.box(0.06, 0.6, 0.02, 0x5a1a0a), 0, 0, 0.27));
      return group;
    },
    stat: 'Granos de café',
    icon: '☕',
    lines: ['¡Bien! ☕', '¡Otro grano! 🤩', '¡Eso! 🙌'],
  },
  puddle: { color: 0x5ab0ff, text: '💦 ¡Splash!', stat: 'Charcos', lines: ['¡Me mojé! 💦', '¡Uyyy, charco! 😆'] },
  intro: 'Gira con ◀ ▶, recoge granos ☕ y pita 📯 a las gallinas',
  emoji: '🚙',
  titles: { clean: '¡Manejas como una experta!', normal: '¡Qué paseo!' },
};

export const createJipeRide = (ctx) => createDriveRide(ctx, JIPE_THEME);
