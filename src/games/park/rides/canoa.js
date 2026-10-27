/**
 * Canoa por el Amazonas (Selva Amazónica): se rema por el río entre la selva recogiendo frutas y
 * esquivando troncos. Con el tambor 🥁 las guacamayas de la orilla salen volando.
 */
import { buildCanoe, buildMacaw, buildPinkDolphin, buildRiverbank, MACAW_COLORS, RIVER_COLOR } from '../propsJungle.js';
import { at } from '../kit.js';
import { createDriveRide } from './drive.js';

const FRUITS = [0xffd93d, 0xff9f43, 0x8e44ad, 0xe63946];
let fruitIndex = 0;
let macawIndex = 0;

/** Racimo de fruta de la selva (plátano, mango, açaí, pitahaya: según toque). */
function buildFruit(kit) {
  const color = FRUITS[fruitIndex % FRUITS.length];
  fruitIndex += 1;
  const fruit = kit.sphere(0.45, color, 10, { emissive: 0x332200 });
  fruit.add(at(kit.box(0.08, 0.3, 0.08, 0x3fae4a), 0, 0.5, 0));
  fruit.add(at(kit.box(0.3, 0.05, 0.16, 0x3fae4a), 0.15, 0.6, 0));
  return fruit;
}

/** Tronco que flota atravesado en el río. */
function buildLog(kit) {
  const log = kit.cyl(0.45, 0.45, 2.8, 0x6b4423, 10);
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.15;
  log.add(at(kit.cyl(0.38, 0.38, 2.82, 0xc58b4e, 10), 0, 0, 0));
  return log;
}

const CANOA_THEME = {
  vehicle: (kit) => {
    const canoe = buildCanoe(kit);
    canoe.scale.set(1.3, 1, 1.1);
    return canoe;
  },
  seats: {
    driver: { x: -0.32, z: 0.6, seatY: 0.5, scale: 0.55 },
    copilot: { x: 0.32, z: 0.6, seatY: 0.5, scale: 0.55 },
    back: { x: 0, z: -1.1, seatY: 0.5, scale: 0.55 },
  },
  sky: 0xa8e6c8,
  ground: 0x2f7a3a,
  road: RIVER_COLOR,
  line: 0x79b9a8,
  bob: 0.08,
  scenery: buildRiverbank,
  pickup: {
    build: buildFruit,
    stat: 'Frutas',
    icon: '🍌',
    lines: ['¡Qué rica! 😋', '¡Fruta de la selva! 🍌', '¡Eso! 🙌'],
    saying: 'fruit',
  },
  puddle: {
    build: buildLog,
    text: '🪵 ¡Uy, un tronco!',
    stat: 'Troncos',
    lines: ['¡Pum! 😝', '¡Cuidado con los troncos! 😆'],
  },
  critter: {
    build: (kit) => buildMacaw(kit, MACAW_COLORS[macawIndex++ % MACAW_COLORS.length]),
    icon: '🦜',
    stat: 'Guacamayas',
    fled: '🦜 ¡A volar, guacamaya! +1',
    bumped: '🦜 ¡Uy! ¡Toca el tambor!',
    flies: true,
  },
  // Delfín rosado que nada delante de la canoa (enseñando el camino) y salta de vez en cuando.
  companion: {
    build: (kit) => buildPinkDolphin(kit),
    place(dolphin, { x, z, time }) {
      const jump = Math.max(0, Math.sin(time * 1.6));
      dolphin.position.set(x * 0.5 + Math.sin(time * 0.8) * 2, -0.3 + jump * 1.6, z - 8);
      dolphin.rotation.set(-Math.cos(time * 1.6) * 0.6 * (jump > 0 ? 1 : 0), Math.PI, 0);
    },
  },
  horn: { icon: '🥁', label: 'Tambor' },
  intro: 'Rema con ◀ ▶, recoge frutas 🍌 y toca el tambor 🥁 a las guacamayas',
  emoji: '🛶',
  titles: { clean: '¡Remera experta del Amazonas! 🛶', normal: '¡Qué paseo por el río!' },
};

export const createCanoaRide = (ctx) => createDriveRide(ctx, CANOA_THEME);
