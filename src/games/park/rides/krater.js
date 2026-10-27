/**
 * Krater: montaña rusa en primera persona por la vía que se ve en el parque. Dos vueltas en el
 * vagón del medio, con más visitantes que gritan en las bajadas; cada grito tuyo (😱) en una bajada suma.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { buildCoasterTrain } from '../props.js';
import { createMateRider, mateReacts } from '../riders.js';
import { DROP_SLOPE, kraterSpeed, moveTrain } from '../world3d.js';

const LAPS = 2;
const SCREAM_COOLDOWN = 0.35;
const MAX_SCREAM_COINS = 16;
/** Vagón y asiento de la jugadora: el del medio, a la izquierda (a su lado va alguien). */
const MY_SEAT = { car: 1, seat: 0 };
/** Ojos de la jugadora dentro de su vagón. */
const EYE = new THREE.Vector3(-0.38, 1.45, 0.1);
/** El tren se coloca por el vagón de delante: así la jugadora va un vagón más atrás. */
const FRONT_OFFSET = 2.8;
/** Dónde se sientan las amigas: en el vagón de delante (para verlas gritar) y luego a tu lado. */
const MATE_SEATS = ['0-1', '0-0', '1-1'];

export function createKraterRide({ kit, park, scene, random, announce, mates }) {
  const { krater } = park;
  krater.train.visible = false;
  const mateRiders = new Map();
  const placed = new Map();
  mates.slice(0, MATE_SEATS.length).forEach((mate, index) => {
    const rider = createMateRider(kit, random, mate, { scale: 0.58, seatY: 0.6, bubbleHeight: 0.36 });
    mateRiders.set(mate.id, rider);
    placed.set(MATE_SEATS[index], rider);
  });
  const train = buildCoasterTrain(kit, random, { emptySeat: MY_SEAT, placed, colors: [0xffd93d, 0xff5fa2, 0x5ab0ff] });
  scene.add(train.group);
  const myCar = train.cars[MY_SEAT.car];

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 500);
  const lookTarget = new THREE.Vector3();
  let traveled = 0;
  let screams = 0;
  let cooldown = 0;
  let feedback = '';
  let feedbackTimer = 0;
  let descending = false;

  return {
    camera,
    intro: '¡Agárrate! Pulsa 😱 en las bajadas',
    controls: { action: { icon: '😱', label: '¡Gritar!' }, steer: false },
    done: false,

    update(delta, input) {
      const u = (traveled / krater.length) % 1;
      traveled += kraterSpeed(krater.curve.getPointAt(u).y) * delta;
      if (traveled >= LAPS * krater.length) {
        this.done = true;
        return;
      }
      const myU = (traveled / krater.length) % 1;
      moveTrain(train, krater, (myU + FRONT_OFFSET / krater.length) % 1, delta, random);

      camera.position.copy(EYE);
      myCar.mesh.localToWorld(camera.position);
      lookTarget.copy(krater.curve.getPointAt((myU + 10 / krater.length) % 1));
      lookTarget.y += 1.2;
      camera.lookAt(lookTarget);

      descending = krater.curve.getTangentAt(myU).y < DROP_SLOPE;
      cooldown -= delta;
      feedbackTimer -= delta;
      if (input.actionPressed) {
        if (descending && cooldown <= 0) {
          screams += 1;
          cooldown = SCREAM_COOLDOWN;
          feedback = '😱 ¡AAAAH!';
          sounds.scream();
          announce('scream');
        } else if (!descending) {
          feedback = '🤫 Espera la bajada…';
        }
        feedbackTimer = 0.8;
      }
    },

    onMateSay(id, kind) {
      const rider = mateRiders.get(id);
      if (rider && kind === 'scream') mateReacts(rider, '😱 ¡AAAAH!', { cheer: true });
    },

    status: () => `😱 Gritos: ${screams} · 🔁 Vuelta ${Math.min(LAPS, Math.floor(traveled / krater.length) + 1)}/${LAPS}`,
    prompt: () => (feedbackTimer > 0 ? feedback : descending ? '¡Grita! 😱' : ''),

    result() {
      const coins = 4 + Math.min(MAX_SCREAM_COINS, screams);
      return {
        coins,
        emoji: '🎢',
        title: screams >= 8 ? '¡Qué valiente!' : '¡Qué viaje!',
        stats: [{ label: 'Gritos', value: screams }],
      };
    },

    dispose() {
      scene.remove(train.group);
      krater.train.visible = true;
    },
  };
}
