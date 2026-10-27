/**
 * Visitantes sentados en las atracciones (vagones, sillas de La Cumbre, cabinas de la rueda,
 * carritos): levantan los brazos y gritan en las bajadas, saludan o se quejan cuando los chocan.
 */
import { createAvatar } from './avatar.js';
import { randomLook } from './outfits.js';

export const SCREAMS = ['¡AAAAH! 😱', '¡Uiiii! 🤩', '¡Mamááá! 😨', '¡Yujuuu! 🙌', '¡Qué miedo! 🙀'];
export const pickLine = (lines, random) => lines[Math.floor(random() * lines.length)];

/** Altura de la cadera del personaje (sin escalar): para sentarlo, se baja eso desde el asiento. */
const HIP_HEIGHT = 0.8;

/**
 * Crea un visitante sentado. `seatY` es la altura del asiento en el objeto donde se monte.
 * Devuelve { root, say(text, seconds), setCheer(on), update(delta) }.
 */
export function createRider(kit, random, { scale = 0.6, seatY = 0.6, look = randomLook(random), name, bubbleHeight = 0.6 } = {}) {
  const avatar = createAvatar(kit, look);
  const { root } = avatar;
  root.scale.setScalar(scale);
  root.position.y = seatY - HIP_HEIGHT * scale;
  // Los carteles van dentro del personaje escalado: se agrandan para que se lean igual.
  const bubble = kit.label(' ', { bubble: true, height: bubbleHeight / scale, background: '#fff6c9' });
  bubble.sprite.position.y = 2.6 + 0.5 / scale;
  bubble.sprite.visible = false;
  root.add(bubble.sprite);
  if (name) {
    const label = kit.label(name, { height: 0.4 / scale });
    label.sprite.position.y = 2.6 + 0.05 / scale;
    root.add(label.sprite);
    bubble.sprite.position.y += 0.4 / scale;
  }
  let bubbleTimer = 0;
  let cheer = false;
  avatar.update(0, { seated: true });

  return {
    root,
    say(text, seconds = 1.4) {
      bubble.setText(text);
      bubble.sprite.visible = true;
      bubbleTimer = seconds;
    },
    setCheer(on) {
      cheer = on;
    },
    update(delta) {
      avatar.update(delta, { seated: true, cheer });
      if (bubbleTimer > 0) {
        bubbleTimer -= delta;
        if (bubbleTimer <= 0) bubble.sprite.visible = false;
      }
    },
  };
}
