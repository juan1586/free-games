/**
 * Rueda Panorámica: una vuelta completa en una cabina. Alrededor flotan globos; se gira la mirada
 * con ◀ ▶ (o arrastrando) y se les hace una foto 📸 cuando quedan en el centro.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createMateRider, mateReacts } from '../riders.js';
import { SAYINGS } from '../race.js';

const RIDE_SPEED = 0.2;
const BALLOONS = 7;
const LOOK_SPEED = 1.3;
const MAX_LOOK = 1.25;
/** Ángulo máximo (rad) entre el centro de la mirada y el globo para que salga en la foto. */
const PHOTO_ANGLE = 0.14;
/** La cámara tarda un poquito en estar lista otra vez (para no cazar globos pulsando sin parar). */
const PHOTO_COOLDOWN = 0.8;
const BALLOON_COLORS = [0xff5f5f, 0xffd93d, 0x4dd4ac, 0x5ab0ff, 0xb57bff, 0xff8ac4, 0xff9f43];

export function createRuedaRide({ kit, park, scene, random, announce, mates }) {
  const { wheel } = park;
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
  const normalSpeed = wheel.speed;
  wheel.speed = RIDE_SPEED;

  // Sube en la cabina que está más abajo ahora mismo.
  const worldPosition = new THREE.Vector3();
  const cabin = wheel.gondolas.reduce((lowest, gondola) =>
    gondola.getWorldPosition(worldPosition).y < lowest.getWorldPosition(new THREE.Vector3()).y ? gondola : lowest,
  );

  // Los que iban en esa cabina se bajan: ahora va la jugadora.
  cabin.userData.riders.forEach((rider) => (rider.root.visible = false));
  // Las amigas van en la misma cabina, sentadas enfrente (mirándote).
  const mateRiders = new Map();
  mates.slice(0, 2).forEach((mate, index) => {
    const rider = createMateRider(kit, random, mate, { scale: 0.42, seatY: -1.65, bubbleHeight: 0.35 });
    rider.root.position.set(index === 0 ? 0.6 : -0.6, rider.root.position.y, 0.6);
    rider.root.rotation.y = Math.PI;
    cabin.add(rider.root);
    mateRiders.set(mate.id, rider);
  });

  const balloons = Array.from({ length: BALLOONS }, (_, index) => {
    const balloon = new THREE.Group();
    balloon.add(kit.sphere(1.1, BALLOON_COLORS[index % BALLOON_COLORS.length], 12));
    balloon.add(at(kit.box(0.04, 2.2, 0.04, 0xffffff), 0, -2.1, 0));
    balloon.children[0].scale.set(1, 1.2, 1);
    const angle = -0.9 + (index / (BALLOONS - 1)) * 1.8 + (random() - 0.5) * 0.2;
    const distance = 18 + random() * 16;
    balloon.position.set(wheel.hub.x + Math.sin(angle) * distance, 5 + random() * 22, wheel.hub.z + Math.cos(angle) * distance);
    balloon.userData = { baseY: balloon.position.y, phase: random() * 6, caught: false };
    scene.add(balloon);
    return balloon;
  });

  let turned = 0;
  let look = 0;
  let caught = 0;
  let message = '';
  let messageTimer = 0;
  let photoCooldown = 0;
  const forward = new THREE.Vector3();
  const toBalloon = new THREE.Vector3();

  function takePhoto() {
    sounds.shutter();
    camera.getWorldDirection(forward);
    let best = null;
    let bestAngle = PHOTO_ANGLE;
    balloons.forEach((balloon) => {
      if (balloon.userData.caught) return;
      toBalloon.copy(balloon.position).sub(camera.position).normalize();
      const angle = forward.angleTo(toBalloon);
      if (angle < bestAngle) {
        best = balloon;
        bestAngle = angle;
      }
    });
    if (best) {
      best.userData.caught = true;
      best.visible = false;
      caught += 1;
      message = '📸 ¡Globo cazado!';
      announce('photo');
      sounds.pop();
    } else {
      message = '📸 ¡Uy, no salió ningún globo!';
    }
    messageTimer = 1.2;
  }

  return {
    camera,
    reticle: true,
    intro: 'Gira con ◀ ▶ y pulsa 📸 cuando un globo quede en el centro',
    controls: { action: { icon: '📸', label: 'Foto' }, steer: true },
    done: false,

    update(delta, input) {
      turned += RIDE_SPEED * delta;
      messageTimer -= delta;
      if (turned >= Math.PI * 2 || (caught === BALLOONS && messageTimer <= 0)) {
        this.done = true;
        return;
      }
      // Mirando hacia +Z, girar a la derecha es ir hacia -X.
      look += ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * LOOK_SPEED * delta - input.lookDelta;
      look = Math.max(-MAX_LOOK, Math.min(MAX_LOOK, look));
      photoCooldown -= delta;
      if (input.actionPressed && photoCooldown <= 0) {
        photoCooldown = PHOTO_COOLDOWN;
        takePhoto();
      }

      mateRiders.forEach((rider) => rider.update(delta));
      balloons.forEach((balloon) => {
        balloon.position.y = balloon.userData.baseY + Math.sin(turned * 4 + balloon.userData.phase) * 0.8;
      });

      cabin.getWorldPosition(camera.position);
      camera.position.y -= 1.05;
      camera.position.z -= 0.6;
      const height = camera.position.y;
      camera.lookAt(camera.position.x + Math.sin(look) * 20, height - 2 - height * 0.1, camera.position.z + Math.cos(look) * 20);
    },

    onMateSay(id, kind) {
      const rider = mateRiders.get(id);
      if (rider && kind === 'photo') mateReacts(rider, SAYINGS.photo.text, { cheer: true });
    },

    status: () => `🎈 Globos: ${caught}/${BALLOONS} · 🎡 ${Math.min(100, Math.round((turned / (Math.PI * 2)) * 100))} %`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      return {
        coins: 3 + caught * 2,
        emoji: '🎡',
        title: caught === BALLOONS ? '¡Todos los globos!' : '¡Qué vista!',
        stats: [{ label: 'Globos', value: `${caught}/${BALLOONS}` }],
      };
    },

    dispose() {
      balloons.forEach((balloon) => scene.remove(balloon));
      cabin.userData.riders.forEach((rider) => (rider.root.visible = true));
      mateRiders.forEach((rider) => cabin.remove(rider.root));
      wheel.speed = normalSpeed;
    },
  };
}
