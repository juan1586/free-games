/**
 * Paseo en Tractor (Granja Panaca): por el maizal recogiendo huevos y esquivando el barro.
 */
import * as THREE from 'three';
import { buildCornField, buildTractor } from '../props.js';
import { createDriveRide } from './drive.js';

const TRACTOR_THEME = {
  vehicle: (kit) => buildTractor(kit),
  // La jugadora maneja; la copiloto y quien vaya atrás van en el remolque.
  seats: {
    driver: { x: 0, z: -0.55, seatY: 1.5, scale: 0.75 },
    copilot: { x: 0.45, z: -2.6, seatY: 1.15, scale: 0.7 },
    back: { x: -0.45, z: -2.6, seatY: 1.15, scale: 0.7 },
  },
  ground: 0x9ad66b,
  road: 0xb07a40,
  line: 0xd9b98a,
  scenery: buildCornField,
  pickup: {
    build: (kit) => {
      const group = new THREE.Group();
      const egg = kit.sphere(0.4, 0xfffaf0, 12, { emissive: 0x222222 });
      egg.scale.set(0.8, 1.05, 0.8);
      group.add(egg);
      return group;
    },
    stat: 'Huevos',
    icon: '🥚',
    lines: ['¡Un huevo! 🥚', '¡Para el desayuno! 🍳', '¡Eso! 🙌'],
    saying: 'egg',
  },
  puddle: { color: 0x6b4423, text: '🟤 ¡Barro!', stat: 'Barro', lines: ['¡Me embarré! 😆', '¡Uyyy, barro! 🐷'] },
  intro: 'Gira con ◀ ▶, recoge huevos 🥚 y pita 📯 a las gallinas',
  emoji: '🚜',
  titles: { clean: '¡Granjera experta!', normal: '¡Qué paseo!' },
};

export const createTractorRide = (ctx) => createDriveRide(ctx, TRACTOR_THEME);
