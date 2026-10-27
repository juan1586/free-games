import { buildCafePark } from './world3d.js';
import { buildPanacaPark } from './worldPanaca.js';

const BUILDERS = { cafe: buildCafePark, panaca: buildPanacaPark };

/** Construye el parque `world` (de PARK_WORLDS) en la escena. */
export const buildPark = (kit, scene, random, world) => BUILDERS[world.id](kit, scene, random, world);
