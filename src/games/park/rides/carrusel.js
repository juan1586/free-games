/**
 * Carrusel de Caramelo (Castillo de Dulces): se monta en un caballito o unicornio que sube y baja
 * mientras el carrusel gira. Alrededor hay brazos con aros de caramelo: al pasar al lado se pulsa 🍭
 * para atraparlo (los dorados valen más). En la vuelta siguiente el brazo tiene otro aro. Se gira la
 * mirada con ◀ ▶ (o arrastrando). Las amigas van en los caballitos de al lado.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { createMateRider, mateReacts } from '../riders.js';
import { SAYINGS } from '../race.js';

const LAPS = 3;
const RIDE_SPEED = 0.55;
/**
 * Un aro queda al alcance un poco antes de llegar a él (así se ve delante, a la derecha):
 * cuando le faltan REACH_AHEAD ± REACH_ANGLE rad (desde el centro del carrusel).
 */
const REACH_AHEAD = 0.4;
const REACH_ANGLE = 0.25;
const GOLDEN_CHANCE = 0.3;
const LOOK_SPEED = 1.3;
const LOOK_MIN = -1.2;
const LOOK_MAX = 1.4;
/** Al empezar, la mirada va un poco hacia afuera (donde están los aros). */
const START_LOOK = 0.7;
const EYE_HEIGHT = 1.6;
/** La cámara va un poco atrás en el caballito, para que su cabeza no tape la vista. */
const EYE_BACK = 0.5;
/** Caballito de la jugadora y de sus amigas (al lado). */
const MY_HORSE = 0;
const MATE_HORSES = [1, 7];

function angleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function createCarruselRide({ kit, park, random, announce, mates }) {
  const { carousel } = park;
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
  const normalSpeed = carousel.speed;
  carousel.speed = RIDE_SPEED;
  const startRotation = carousel.platform.rotation.y;
  const horse = carousel.horses[MY_HORSE];
  // Su propio poste, tan cerca, taparía la vista.
  horse.pole.visible = false;

  const mateRiders = new Map();
  mates.slice(0, MATE_HORSES.length).forEach((mate, index) => {
    const rider = createMateRider(kit, random, mate, { scale: 0.5, seatY: 0.4, bubbleHeight: 0.4 });
    carousel.horses[MATE_HORSES[index]].group.add(rider.root);
    mateRiders.set(mate.id, { rider, horse: carousel.horses[MATE_HORSES[index]] });
  });

  // Cada brazo: si tiene aro, si es dorado y si ya pasó de largo en esta vuelta.
  const arms = carousel.arms.map((arm) => ({ ...arm, loaded: true, isGolden: false, wasNear: false }));
  function load(arm, golden) {
    arm.loaded = true;
    arm.isGolden = golden;
    arm.ring.visible = !golden;
    arm.golden.visible = golden;
  }
  // El primer aro de cada brazo es normal; luego, a veces dorado.
  arms.forEach((arm) => load(arm, false));

  let look = START_LOOK;
  let caught = 0;
  let goldens = 0;
  let missed = 0;
  let message = '';
  let messageTimer = 0;
  let cooldown = 0;
  let cheerTimer = 0;
  const seat = new THREE.Vector3();

  function say(text, seconds = 1.2) {
    message = text;
    messageTimer = seconds;
  }

  const myAngle = () => horse.angle + carousel.platform.rotation.y;
  const inReach = (arm, angle) => Math.abs(angleDiff(arm.angle, angle) - REACH_AHEAD) < REACH_ANGLE;

  function grab() {
    const angle = myAngle();
    const arm = arms.find((candidate) => candidate.loaded && inReach(candidate, angle));
    if (!arm) {
      sounds.click();
      say('🍭 ¡Espera a que llegue un aro!', 0.9);
      return;
    }
    arm.loaded = false;
    arm.ring.visible = false;
    arm.golden.visible = false;
    caught += 1;
    if (arm.isGolden) goldens += 1;
    sounds.chime();
    if (arm.isGolden) sounds.coin();
    cheerTimer = 1;
    say(arm.isGolden ? '🌟 ¡Un aro dorado!' : '🍭 ¡Lo atrapaste!', 1.2);
    announce('ring');
  }

  return {
    camera,
    intro: 'Pulsa 🍭 cuando pases junto a un aro de caramelo. Mira con ◀ ▶',
    controls: { action: { icon: '🍭', label: 'Atrapar' }, steer: true },
    done: false,

    update(delta, input) {
      const turned = carousel.platform.rotation.y - startRotation;
      messageTimer -= delta;
      cooldown -= delta;
      cheerTimer -= delta;
      if (turned >= LAPS * Math.PI * 2) {
        this.done = true;
        return;
      }
      // Mirando hacia donde gira, la derecha es hacia afuera.
      look += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * LOOK_SPEED * delta + input.lookDelta;
      look = Math.max(LOOK_MIN, Math.min(LOOK_MAX, look));
      if (input.actionPressed && cooldown <= 0) {
        cooldown = 0.35;
        grab();
      }

      const angle = myAngle();
      arms.forEach((arm) => {
        const diff = angleDiff(arm.angle, angle);
        const near = inReach(arm, angle);
        // El aro brilla cuando está al alcance.
        const pulse = arm.loaded && near ? 1.35 + Math.sin(turned * 40) * 0.1 : 1;
        arm.ring.scale.setScalar(pulse);
        arm.golden.scale.setScalar(pulse);
        if (arm.wasNear && !near && arm.loaded && diff < REACH_AHEAD) {
          missed += 1;
          say('🙈 ¡Se fue! Ya viene otro', 1);
        }
        arm.wasNear = near;
        // Del otro lado del carrusel, el brazo vuelve a tener aro.
        if (!arm.loaded && Math.abs(diff) > Math.PI - 0.4) load(arm, random() < GOLDEN_CHANCE);
      });

      mateRiders.forEach(({ rider }) => rider.update(delta));

      horse.group.getWorldPosition(seat);
      // Hacia donde gira: (cos a, -sin a); hacia afuera: (sin a, cos a).
      const forwardX = Math.cos(angle);
      const forwardZ = -Math.sin(angle);
      camera.position.set(seat.x - forwardX * EYE_BACK, seat.y + EYE_HEIGHT, seat.z - forwardZ * EYE_BACK);
      const outX = Math.sin(angle);
      const outZ = Math.cos(angle);
      camera.lookAt(
        camera.position.x + (forwardX * Math.cos(look) + outX * Math.sin(look)) * 10,
        camera.position.y - 1.6,
        camera.position.z + (forwardZ * Math.cos(look) + outZ * Math.sin(look)) * 10,
      );
      camera.position.y += cheerTimer > 0 ? Math.sin(cheerTimer * 12) * 0.05 : 0;
    },

    onMateSay(id, kind) {
      const mate = mateRiders.get(id);
      if (mate && kind === 'ring') mateReacts(mate.rider, SAYINGS.ring.text, { cheer: true });
    },

    status() {
      const turned = carousel.platform.rotation.y - startRotation;
      const lap = Math.min(LAPS, Math.floor(turned / (Math.PI * 2)) + 1);
      return `🍭 Aros: ${caught} · 🌟 ${goldens} · 🎠 Vuelta ${lap} de ${LAPS}`;
    },
    prompt() {
      if (messageTimer > 0) return message;
      const angle = myAngle();
      return arms.some((arm) => arm.loaded && inReach(arm, angle)) ? '🍭 ¡Ahora!' : '';
    },

    result() {
      return {
        coins: Math.min(24, 3 + caught * 2 + goldens * 2),
        emoji: '🎠',
        title: missed === 0 && caught > 0 ? '¡Todos los aros! 🦄' : '¡Qué paseo tan dulce!',
        stats: [
          { label: 'Aros', value: caught },
          { label: 'Dorados', value: goldens },
        ],
      };
    },

    dispose() {
      carousel.speed = normalSpeed;
      horse.pole.visible = true;
      mateRiders.forEach(({ rider, horse: mateHorse }) => mateHorse.group.remove(rider.root));
      arms.forEach((arm) => load(arm, false));
    },
  };
}
