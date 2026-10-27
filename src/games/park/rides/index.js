import { createKraterRide } from './krater.js';
import { createCumbreRide } from './cumbre.js';
import { createRuedaRide } from './rueda.js';
import { createJipeRide } from './jipe.js';
import { createChoconesRide } from './chocones.js';
import { createCerditosRide } from './cerditos.js';
import { createOrdenoRide } from './ordeno.js';
import { createTractorRide } from './tractor.js';

/**
 * Minijuego de cada atracción. Cada uno devuelve { camera, scene?, intro, controls, done, reticle?,
 * update(delta, input), status(), prompt(), result(), dispose() }; sin `scene` se juega en el parque.
 */
export const RIDE_FACTORIES = {
  krater: createKraterRide,
  cumbre: createCumbreRide,
  rueda: createRuedaRide,
  jipe: createJipeRide,
  chocones: createChoconesRide,
  cerditos: createCerditosRide,
  ordeno: createOrdenoRide,
  tractor: createTractorRide,
};
