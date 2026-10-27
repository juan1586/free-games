/**
 * Lancha a las Islas (Playa de Cartagena): por el mar entre islitas, recogiendo estrellas de mar y
 * esquivando medusas. Con la bocina 📯 los pelícanos salen volando.
 */
import { SEA_COLOR, buildIslands, buildJellyfish, buildPelican, buildSpeedboat, buildStarfish } from '../propsBeach.js';
import { createDriveRide } from './drive.js';

const LANCHA_THEME = {
  vehicle: (kit) => buildSpeedboat(kit),
  seats: {
    driver: { x: -0.4, z: 0.1, seatY: 1.0, scale: 0.62 },
    copilot: { x: 0.4, z: 0.1, seatY: 1.0, scale: 0.62 },
    back: { x: 0, z: -1.2, seatY: 1.0, scale: 0.62 },
  },
  sky: 0x8fd8ff,
  ground: SEA_COLOR,
  road: 0x4cb8f0,
  line: 0xbfe6ff,
  bob: 0.12,
  scenery: buildIslands,
  pickup: {
    build: (kit) => buildStarfish(kit),
    stat: 'Estrellas de mar',
    icon: '⭐',
    lines: ['¡Una estrella! ⭐', '¡Qué bonita! 😍', '¡Eso! 🙌'],
    saying: 'star',
  },
  puddle: {
    build: (kit) => buildJellyfish(kit),
    text: '💗 ¡Uy, una medusa!',
    stat: 'Medusas',
    lines: ['¡Uy, pica! 😝', '¡Cuidado con las medusas! 😆'],
  },
  critter: {
    build: (kit) => buildPelican(kit),
    icon: '🐦',
    stat: 'Pelícanos',
    fled: '🐦 ¡A volar, pelícano! +1',
    bumped: '🐦 ¡Uy! ¡Toca la bocina!',
    flies: true,
  },
  horn: { icon: '📯', label: 'Bocina' },
  intro: 'Gira con ◀ ▶, recoge estrellas de mar ⭐ y toca la bocina 📯 a los pelícanos',
  emoji: '🚤',
  titles: { clean: '¡Capitana experta! ⚓', normal: '¡Qué paseo por el mar!' },
};

export const createLanchaRide = (ctx) => createDriveRide(ctx, LANCHA_THEME);
