/**
 * La Cumbre: torre de caída libre. Tres subidas; arriba hay que esperar sin tocar y, cuando
 * la silla cae, tocar lo más rápido posible. Cuanto más rápido, más estrellas.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';

const ROUNDS = 3;
const BOTTOM = 1.5;
const TOP = 28;
const RISE_SECONDS = 5;
const DROP_SECONDS = 1.2;
const LAND_SECONDS = 1.6;
/** Tiempos de reacción (s) para 3, 2 y 1 estrellas. */
const STAR_TIMES = [0.4, 0.7, 1.2];
const TOP_LINES = ['¡Qué alto! 😨', '¿Ya va a caer? 😬', '¡No mires abajo! 🙈', '¡Se ve todo el parque! 😮'];

export function createCumbreRide({ park, random }) {
  const { cumbre } = park;
  cumbre.idle = false;
  const camera = new THREE.PerspectiveCamera(80, 1, 0.1, 500);
  // La silla libre de la torre mira hacia la plaza.
  const out = cumbre.playerDir;
  const lookTarget = new THREE.Vector3();

  let round = 0;
  let phase = 'rise';
  let timer = 0;
  let waitFor = 0;
  let stars = 0;
  let roundStars = [];
  let reacted = false;
  let message = '';
  let messageTimer = 0;

  function setMessage(text, seconds = 1.4) {
    message = text;
    messageTimer = seconds;
  }

  function seatHeight() {
    if (phase === 'rise') return BOTTOM + (TOP - BOTTOM) * Math.min(1, timer / RISE_SECONDS);
    if (phase === 'wait') return TOP;
    if (phase === 'drop') return TOP - (TOP - BOTTOM) * Math.min(1, (timer / DROP_SECONDS) ** 2);
    return BOTTOM;
  }

  function endRound(earned, text) {
    roundStars.push(earned);
    stars += earned;
    setMessage(text);
  }

  return {
    camera,
    intro: 'Espera arriba sin tocar… ¡y toca justo cuando caigas!',
    controls: { action: { icon: '⚡', label: '¡Ahora!' }, steer: false },
    done: false,

    update(delta, input) {
      timer += delta;
      messageTimer -= delta;
      const pressed = input.actionPressed;

      if (phase === 'rise' && timer >= RISE_SECONDS) {
        phase = 'wait';
        timer = 0;
        waitFor = 1.2 + random() * 2.4;
        reacted = false;
        cumbre.chat(TOP_LINES);
      } else if (phase === 'wait') {
        if (pressed && !reacted) {
          reacted = true;
          endRound(0, '🙈 ¡Uy, muy pronto!');
        }
        if (timer >= waitFor) {
          phase = 'drop';
          timer = 0;
          sounds.whoosh();
          cumbre.scream(true);
        }
      } else if (phase === 'drop') {
        if (pressed && !reacted) {
          reacted = true;
          const earned = STAR_TIMES.filter((limit) => timer <= limit).length;
          endRound(earned, earned ? `${'⭐'.repeat(earned)} ¡Valiente!` : '😅 ¡Casi!');
          if (earned) sounds.coin();
        }
        if (timer >= DROP_SECONDS) {
          if (!reacted) endRound(0, '😵 ¡Se te pasó!');
          phase = 'land';
          timer = 0;
          cumbre.scream(false);
        }
      } else if (phase === 'land' && timer >= LAND_SECONDS) {
        round += 1;
        if (round >= ROUNDS) {
          this.done = true;
          return;
        }
        phase = 'rise';
        timer = 0;
      }

      const height = seatHeight();
      cumbre.seat.position.y = height;
      // Un poco hacia el centro del anillo: así se ve a quienes van en las sillas de al lado.
      camera.position.set(cumbre.x + out.x * 1.0, height + 1.6, cumbre.z + out.z * 1.0);
      const lookDown = phase === 'drop' ? 14 : 4;
      lookTarget.set(cumbre.x + out.x * 40, height - lookDown, cumbre.z + out.z * 40);
      camera.lookAt(lookTarget);
      if (phase === 'drop') camera.position.x += (random() - 0.5) * 0.08;
    },

    status: () => `🗼 Subida ${Math.min(round + 1, ROUNDS)}/${ROUNDS} · ⭐ ${stars}`,
    prompt() {
      if (messageTimer > 0) return message;
      if (phase === 'wait') return reacted ? '' : 'Prepárate… 👀';
      if (phase === 'drop' && !reacted) return '¡AHORA! ⚡';
      if (phase === 'rise') return 'Subiendo… ⬆️';
      return '';
    },

    result() {
      return {
        coins: 4 + stars * 2,
        emoji: '🗼',
        title: stars >= 7 ? '¡Reflejos de rayo!' : '¡Qué caída!',
        stats: [
          { label: 'Estrellas', value: `${stars}/${ROUNDS * 3}` },
          { label: 'Subidas', value: roundStars.map((earned) => (earned ? '⭐'.repeat(earned) : '—')).join(' · ') },
        ],
      };
    },

    dispose() {
      cumbre.scream(false);
      cumbre.idle = true;
    },
  };
}
