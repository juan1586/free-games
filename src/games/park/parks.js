import { buildCafePark } from './world3d.js';
import { buildPanacaPark } from './worldPanaca.js';
import { buildPlayaPark } from './worldPlaya.js';
import { buildSelvaPark } from './worldSelva.js';
import { buildDulcesPark } from './worldDulces.js';

const BUILDERS = { cafe: buildCafePark, panaca: buildPanacaPark, playa: buildPlayaPark, selva: buildSelvaPark, dulces: buildDulcesPark };

/** Construye el parque `world` (de PARK_WORLDS) en la escena. */
export const buildPark = (kit, scene, random, world) => BUILDERS[world.id](kit, scene, random, world);
