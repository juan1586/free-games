/**
 * Torre de Pasteles (Castillo de Dulces): una grúa lleva una capa de pastel de lado a lado y se pulsa
 * ⬇️ para soltarla encima de la torta. Si cae encima se apila (si queda corrida, un poco ladeada; si
 * queda justo en el centro, es «¡perfecta!»). Si cae por fuera solo hace «¡uy!» y llega otra capa.
 * Cada capa va un poco más rápido. Al final se pone una cereza. Con amigas, todas tienen las mismas
 * velocidades (semilla común).
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { createStandingMate } from '../riders.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights } from '../props.js';
import { CANDY_COLORS, buildCakeLayer, buildCupcake, buildLollipop } from '../propsCandy.js';

const LAYERS = 10;
const TIME_LIMIT = 70;
const FINALE_SECONDS = 3;
const TABLE_TOP = 1;
const PLATE = { width: 3, height: 0.1 };
const LAYER_HEIGHT = 0.55;
const FIRST_WIDTH = 2.6;
const WIDTH_STEP = 0.12;
const MIN_WIDTH = 1.4;
/** Hasta dónde llega la grúa a cada lado (m) y a qué altura sobre la torta va la capa. */
const SWING_RANGE = 2;
const HOOK_GAP = 2.4;
const FIRST_SPEED = 1.5;
const SPEED_STEP = 0.14;
const GRAVITY = 14;
/** Si queda a menos de esto del centro, es perfecta (y se acomoda sola). */
const PERFECT = 0.18;
const SETTLE_SECONDS = 0.35;
const MISS_SECONDS = 0.9;
const LAYER_COLORS = [0xffc4e1, 0xfff6c9, 0xb57bff, 0x9fe0ff, 0xff9f43, 0x4dd4ac, 0xff5fa2];
const CHEERS = ['🎂 ¡Bien!', '🍰 ¡Muy bien!', '😋 ¡Qué rico!'];

const layerWidth = (index) => Math.max(MIN_WIDTH, FIRST_WIDTH - index * WIDTH_STEP);

export function createPastelesRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: 0xfff0f6, fogNear: 30, fogFar: 90 });
  // Pastelería: piso de cuadros, pared de atrás con repisas y la mesa con el plato.
  for (let row = -4; row <= 4; row += 1) {
    for (let column = -5; column <= 5; column += 1) {
      scene.add(at(kit.plane(2, 2, (row + column) % 2 ? 0xffffff : 0xffc4e1), column * 2, 0.01, row * 2));
    }
  }
  scene.add(at(kit.box(24, 40, 0.4, 0xffd6ea), 0, 20, -6));
  [3.2, 6].forEach((y, shelf) => {
    scene.add(at(kit.box(16, 0.2, 0.8, 0xd9a066), 0, y, -5.5));
    for (let index = 0; index < 6; index += 1) {
      scene.add(at(buildCupcake(kit, { scale: 0.3, cream: CANDY_COLORS[(index + shelf) % CANDY_COLORS.length] }), -6.5 + index * 2.6, y + 0.1, -5.5));
    }
  });
  [-9, 9].forEach((x) => scene.add(at(buildLollipop(kit, { color: x < 0 ? 0xff5fa2 : 0x5ab0ff, height: 4 }), x, 0, -3.5)));
  scene.add(at(kit.box(5, TABLE_TOP, 2.6, 0xff8ac4), 0, TABLE_TOP / 2, 0));
  scene.add(at(kit.box(5.2, 0.12, 2.8, 0xffffff), 0, TABLE_TOP, 0));
  scene.add(at(kit.cyl(PLATE.width / 2, PLATE.width / 2 - 0.2, PLATE.height, 0xffffff, 24), 0, TABLE_TOP + PLATE.height / 2 + 0.06, 0));

  // La grúa: poste, viga muy alta y el gancho que lleva la capa.
  scene.add(at(kit.box(0.4, 40, 0.4, 0xb57bff), 5.6, 20, -2));
  const hook = new THREE.Group();
  hook.add(at(kit.box(0.05, 1.4, 0.05, 0x666666), 0, 0.7, 0));
  hook.add(at(kit.torus(0.18, 0.05, 0xffd93d), 0, 0, 0));
  scene.add(hook);
  const beam = at(kit.box(11.4, 0.3, 0.3, 0xb57bff), 0, 0, 0);
  scene.add(beam);

  const tower = new THREE.Group();
  scene.add(tower);

  const me = createAvatar(kit, look);
  me.root.position.set(-3.1, 0, 1.2);
  me.root.rotation.y = Math.PI - 0.5;
  scene.add(me.root, me.shadow);
  me.shadow.position.set(-3.1, 0.03, 1.2);
  const friends = mates.slice(0, 3).map((mate, index) => {
    const friend = createStandingMate(kit, mate);
    friend.root.position.set([3.1, -4.5, 4.5][index], 0, 1.2);
    friend.root.rotation.y = Math.PI + (index === 0 ? 0.5 : 0);
    scene.add(friend.root);
    return friend;
  });

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  let cameraY = TABLE_TOP + 1.5;

  // Arriba de todo: { x, width, top }.
  const top = { x: 0, width: PLATE.width, y: TABLE_TOP + PLATE.height + 0.06 };
  const speeds = Array.from({ length: LAYERS }, (_, index) => FIRST_SPEED + index * SPEED_STEP + random() * 0.3);
  let state = 'swing';
  let stateTimer = 0;
  let stacked = 0;
  let perfects = 0;
  let misses = 0;
  let time = 0;
  let phase = random() * Math.PI * 2;
  let wobble = 0;
  let cheerTimer = 0;
  let message = '';
  let messageTimer = 0;
  let layer = null;
  let fallSpeed = 0;
  let cherry = null;

  function say(text, seconds = 1.2) {
    message = text;
    messageTimer = seconds;
  }

  function newLayer() {
    layer = buildCakeLayer(kit, { width: layerWidth(stacked), height: LAYER_HEIGHT, color: LAYER_COLORS[stacked % LAYER_COLORS.length] });
    scene.add(layer);
    state = 'swing';
  }

  function finish(complete) {
    state = 'finale';
    stateTimer = FINALE_SECONDS;
    if (layer) scene.remove(layer);
    layer = null;
    sounds.achievement();
    cheerTimer = FINALE_SECONDS;
    announce('cake');
    say(complete ? '🍒 ¡Una torta de 10 pisos!' : `🎂 ¡Una torta de ${stacked} pisos!`, FINALE_SECONDS);
    // La cereza cae encima.
    cherry = new THREE.Group();
    cherry.add(kit.sphere(0.32, 0xe63946, 12), at(kit.box(0.04, 0.4, 0.04, 0x3f8f3f), 0.05, 0.4, 0));
    cherry.position.set(top.x, top.y + 3, 0);
    scene.add(cherry);
  }

  function land() {
    const offset = layer.position.x - top.x;
    const width = layerWidth(stacked);
    if (Math.abs(offset) > top.width / 2) {
      // No tocó la torta: sigue cayendo hasta el piso.
      misses += 1;
      sounds.bump();
      say('🙈 ¡Uy! Se cayó. Ahí viene otra', 1.2);
      state = 'miss';
      stateTimer = MISS_SECONDS;
      return;
    }
    const perfect = Math.abs(offset) < PERFECT;
    if (perfect) {
      layer.position.x = top.x;
      perfects += 1;
      announce('cake');
      say('⭐ ¡Perfecta!', 1);
    } else {
      // Corrida: se queda ladeada hacia donde cayó.
      layer.rotation.z = -Math.sign(offset) * Math.min(0.12, Math.abs(offset) * 0.12);
      wobble = Math.min(0.06, wobble + Math.abs(offset) * 0.01);
      say(CHEERS[stacked % CHEERS.length], 0.8);
    }
    sounds.stack();
    layer.position.y = top.y;
    scene.remove(layer);
    tower.add(layer);
    Object.assign(top, { x: layer.position.x, width, y: top.y + LAYER_HEIGHT });
    stacked += 1;
    layer = null;
    cheerTimer = perfect ? 1 : 0.4;
    state = 'settle';
    stateTimer = SETTLE_SECONDS;
  }

  newLayer();

  return {
    scene,
    camera,
    intro: 'Pulsa ⬇️ para soltar la capa justo encima de la torta',
    controls: { action: { icon: '⬇️', label: 'Soltar' }, steer: false },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      stateTimer -= delta;
      cheerTimer -= delta;
      if (state !== 'finale' && time >= TIME_LIMIT) finish(false);

      const hookY = top.y + HOOK_GAP;
      if (state === 'swing') {
        phase += delta * speeds[Math.min(stacked, LAYERS - 1)];
        layer.position.set(Math.sin(phase) * SWING_RANGE, hookY - LAYER_HEIGHT - 0.2, 0);
        if (input.actionPressed) {
          state = 'fall';
          fallSpeed = 0;
          sounds.drop();
        }
      } else if (state === 'fall' || state === 'miss') {
        fallSpeed += GRAVITY * delta;
        layer.position.y -= fallSpeed * delta;
        if (state === 'fall' && layer.position.y <= top.y) land();
        else if (state === 'miss') {
          layer.rotation.z += delta * 3;
          if (stateTimer <= 0 || layer.position.y < -1) {
            scene.remove(layer);
            newLayer();
          }
        }
      } else if (state === 'settle' && stateTimer <= 0) {
        if (stacked >= LAYERS) finish(true);
        else newLayer();
      } else if (state === 'finale') {
        if (cherry.position.y > top.y + 0.3) cherry.position.y = Math.max(top.y + 0.3, cherry.position.y - delta * 6);
        if (stateTimer <= 0) {
          this.done = true;
          return;
        }
      }

      // El gancho sigue a la capa (o se queda donde la soltó).
      const hookX = state === 'swing' ? layer.position.x : hook.position.x;
      hook.position.set(hookX, hookY, 0);
      beam.position.set(0, hookY + 1.5, -0.1);
      tower.rotation.z = Math.sin(time * 2) * wobble;

      // La cámara sube con la torta.
      cameraY += (top.y + 1.2 - cameraY) * Math.min(1, delta * 2.5);
      camera.position.set(0, cameraY + 1.4, 7.6);
      camera.lookAt(0, cameraY, 0);

      me.update(delta, { airborne: cheerTimer > 0 });
      me.root.position.y = cheerTimer > 0 ? Math.abs(Math.sin(time * 10)) * 0.3 : 0;
      friends.forEach((friend) => friend.update(delta, { airborne: state === 'finale' }));
    },

    onMateSay(id, kind) {
      const friend = friends.find((other) => other.id === id);
      if (friend && kind === 'cake') friend.say(SAYINGS.cake.text);
    },

    status: () => `🎂 Pisos: ${stacked}/${LAYERS} · ⭐ ${perfects} · ⏱️ ${Math.max(0, Math.ceil(TIME_LIMIT - time))} s`,
    prompt() {
      if (messageTimer > 0) return message;
      return state === 'swing' ? '⬇️ ¡Suéltala encima!' : '';
    },

    result() {
      return {
        coins: Math.min(24, 3 + stacked * 2 + perfects),
        emoji: '🎂',
        title: stacked >= LAYERS ? '¡La torta más alta del castillo! 🏰' : '¡Qué torta tan rica!',
        stats: [
          { label: 'Pisos', value: stacked },
          { label: 'Perfectas', value: perfects },
          { label: 'Se cayeron', value: misses },
        ],
      };
    },

    dispose() {},
  };
}

