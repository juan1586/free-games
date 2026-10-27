/**
 * Ordeñar a Lola (Granja Panaca): juego de ritmo dentro del establo. Un aro se cierra sobre la ubre;
 * cuando coincide con el aro blanco, se pulsa 🥛. A tiempo = leche en el balde; a destiempo, Lola muge.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { createRider, mateReacts, pickLine } from '../riders.js';
import { addSkyAndLights, buildCow } from '../props.js';
import { SAYINGS } from '../race.js';

const DURATION = 24;
const FIRST_BEAT = 1.6;
const START_INTERVAL = 1.15;
const END_INTERVAL = 0.75;
/** Margen (s) alrededor del compás para que cuente, y para que sea «perfecto». */
const HIT_WINDOW = 0.2;
const PERFECT_WINDOW = 0.08;
const MAX_COINS = 18;
/** Tras un fallo, Lola se enoja un momento y no deja ordeñar (para que no valga pulsar sin parar). */
const UPSET_SECONDS = 0.6;
const FARMER_LINES = ['¡Eso es! 👏', '¡Muy bien, mija! 🤠', '¡Qué buena ordeñadora! 🥛', '¡Lola está feliz! 🐄'];
const UDDER = new THREE.Vector3(-0.55, 0.75, 0.75);

/** Establo por dentro: piso de heno, paredes de madera y una ventana con el campo. */
function buildBarnInside(kit, scene) {
  scene.add(at(kit.plane(16, 12, 0xe8c66a), 0, 0, 0));
  scene.add(at(kit.box(16, 6, 0.3, 0xa0522d), 0, 3, -4));
  scene.add(at(kit.box(0.3, 6, 12, 0x8b4513), -8, 3, 2));
  scene.add(at(kit.box(0.3, 6, 12, 0x8b4513), 8, 3, 2));
  scene.add(at(kit.box(3, 1.8, 0.1, 0x9fdcff), 3.5, 3.4, -3.82));
  scene.add(at(kit.box(3.2, 0.15, 0.2, 0xffffff), 3.5, 2.45, -3.8));
  [-5, 6].forEach((x) => scene.add(at(kit.box(1.6, 1, 1.2, 0xe8c66a), x, 0.5, -2.8)));
  scene.add(at(kit.box(16, 0.4, 0.4, 0x6b3b1f), 0, 5.6, -1));
}

export function createOrdenoRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: 0xf4d9a6, fogNear: 30, fogFar: 80 });
  buildBarnInside(kit, scene);

  const lola = buildCow(kit, { spots: 0x8a5a2b });
  lola.rotation.y = Math.PI / 2;
  scene.add(lola);
  const lolaLabel = kit.label('🐄 Lola', { height: 0.5 });
  lolaLabel.sprite.position.set(0.8, 3, 0);
  scene.add(lolaLabel.sprite);
  const moo = kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
  moo.sprite.position.set(1.6, 3.6, 0);
  moo.sprite.visible = false;
  scene.add(moo.sprite);

  // Balde con la leche que va subiendo.
  scene.add(at(kit.cyl(0.38, 0.3, 0.6, 0xb0bec5, 14), UDDER.x, 0.3, UDDER.z));
  const milk = at(kit.cyl(0.34, 0.34, 1, 0xffffff, 14), UDDER.x, 0.05, UDDER.z);
  milk.scale.y = 0.02;
  scene.add(milk);
  const drops = Array.from({ length: 4 }, () => {
    const drop = kit.sphere(0.06, 0xffffff, 6);
    drop.visible = false;
    scene.add(drop);
    return drop;
  });

  // Aro que se cierra (de color) y aro objetivo (blanco).
  const target = at(kit.torus(0.42, 0.05, 0xffffff, { emissive: 0x666666 }), UDDER.x, UDDER.y, UDDER.z + 0.4);
  const ring = at(kit.torus(0.42, 0.06, 0xff5fa2, { emissive: 0x662244 }), UDDER.x, UDDER.y, UDDER.z + 0.4);
  scene.add(target, ring);

  // La jugadora en su banquito, Don Pacho mirando y las amigas al lado.
  scene.add(at(kit.cyl(0.35, 0.35, 0.5, 0x8a5a2b, 10), UDDER.x - 0.1, 0.25, UDDER.z + 1.2));
  const me = createRider(kit, random, { scale: 0.75, seatY: 0.55, look });
  me.root.position.set(UDDER.x - 0.1, me.root.position.y, UDDER.z + 1.1);
  me.root.rotation.y = Math.PI;
  scene.add(me.root);
  const farmer = createAvatar(kit, { ...look, shirt: { color: '#3f8f4f' }, pants: { color: '#3d5fa8' }, hat: { kind: 'brim', color: '#f4ecd6', band: '#2b2140' }, extra: { kind: 'mustache', color: '#3b2414' } });
  farmer.root.position.set(3.4, 0, -0.6);
  farmer.root.rotation.y = -0.9;
  scene.add(farmer.root);
  const farmerTalk = kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
  farmerTalk.sprite.position.set(3.4, 3.4, -0.6);
  farmerTalk.sprite.visible = false;
  scene.add(farmerTalk.sprite);
  const farmerName = kit.label('🤠 Don Pacho', { height: 0.42 });
  farmerName.sprite.position.set(3.4, 2.75, -0.6);
  scene.add(farmerName.sprite);

  const mateRiders = new Map();
  mates.slice(0, 3).forEach((mate, index) => {
    const rider = createRider(kit, random, { scale: 0.75, seatY: 0.55, look: mate.look, name: `${mate.emoji} ${mate.name}` });
    rider.root.position.set(-2.4 - index * 1.2, rider.root.position.y, 1.6 - index * 0.5);
    rider.root.rotation.y = 2.4;
    scene.add(rider.root);
    scene.add(at(kit.cyl(0.35, 0.35, 0.5, 0x8a5a2b, 10), -2.4 - index * 1.2, 0.25, 1.6 - index * 0.5));
    mateRiders.set(mate.id, rider);
  });

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  camera.position.set(2.4, 3.2, 7.2);
  camera.lookAt(-0.4, 1.0, 0.4);

  let time = 0;
  let nextBeat = FIRST_BEAT;
  let beatInterval = START_INTERVAL;
  let hits = 0;
  let perfects = 0;
  let misses = 0;
  let combo = 0;
  let message = '';
  let messageTimer = 0;
  let mooTimer = 0;
  let talkTimer = 0;
  let squirt = 0;
  let upset = 0;

  function say(text, seconds = 0.7) {
    message = text;
    messageTimer = seconds;
  }

  function farmerSays(text) {
    farmerTalk.setText(text);
    farmerTalk.sprite.visible = true;
    talkTimer = 1.6;
  }

  return {
    scene,
    camera,
    intro: 'Pulsa 🥛 cuando el aro rosado llegue al aro blanco',
    controls: { action: { icon: '🥛', label: '¡Ordeñar!' }, steer: false },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      if (time >= DURATION) {
        this.done = true;
        return;
      }
      // Compás: cada vez un poco más rápido. Si se deja pasar, se va al siguiente.
      const advanceBeat = () => {
        beatInterval = START_INTERVAL + (END_INTERVAL - START_INTERVAL) * Math.min(1, time / DURATION);
        nextBeat += beatInterval;
      };
      if (time >= nextBeat + HIT_WINDOW) advanceBeat();
      const untilBeat = nextBeat - time;
      const shrink = Math.max(0, Math.min(1, untilBeat / beatInterval));
      ring.scale.setScalar(1 + shrink * 2.2);
      ring.visible = untilBeat > -HIT_WINDOW;

      upset -= delta;
      if (input.actionPressed && upset > 0) say('🐄 ¡Espera, Lola está enojada!');
      if (input.actionPressed && upset <= 0) {
        const offset = Math.abs(time - nextBeat);
        if (offset <= HIT_WINDOW) {
          // Cada compás cuenta una sola vez.
          advanceBeat();
          const perfect = offset <= PERFECT_WINDOW;
          hits += 1;
          combo += 1;
          if (perfect) perfects += 1;
          squirt = 0.5;
          sounds.coin();
          say(perfect ? '✨ ¡Perfecto!' : '🥛 ¡Muy bien!');
          if (combo % 5 === 0) farmerSays(pickLine(FARMER_LINES, random));
          if (hits % 3 === 0) announce('milk');
        } else {
          misses += 1;
          combo = 0;
          upset = UPSET_SECONDS;
          sounds.moo();
          moo.setText('🐄 ¡Muuuu!');
          moo.sprite.visible = true;
          mooTimer = 1;
          say('😅 ¡Uy, a destiempo!');
        }
      }

      milk.scale.y = Math.min(0.5, 0.02 + (hits + perfects) * 0.016);
      milk.position.y = 0.05 + milk.scale.y / 2;
      squirt -= delta;
      drops.forEach((drop, index) => {
        drop.visible = squirt > 0;
        const fall = ((0.5 - squirt) * 3 + index * 0.25) % 1;
        drop.position.set(UDDER.x + (index % 2 ? 0.08 : -0.08), UDDER.y - 0.15 - fall * 0.45, UDDER.z);
      });
      mooTimer -= delta;
      if (mooTimer <= 0) moo.sprite.visible = false;
      talkTimer -= delta;
      if (talkTimer <= 0) farmerTalk.sprite.visible = false;
      lola.position.y = Math.sin(time * 2) * 0.02;
      me.update(delta);
      farmer.update(delta, { speed: 0 });
      mateRiders.forEach((rider) => rider.update(delta));
    },

    onMateSay(id, kind) {
      const rider = mateRiders.get(id);
      if (rider && kind === 'milk') mateReacts(rider, SAYINGS.milk.text, { cheer: true });
    },

    status: () => `🥛 Leche: ${hits} · ✨ ${perfects} · ⏱️ ${Math.max(0, Math.ceil(DURATION - time))} s`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      return {
        coins: Math.max(3, Math.min(MAX_COINS, 3 + Math.floor((hits + perfects) / 2) - Math.floor(misses / 3))),
        emoji: '🐄',
        title: misses === 0 && hits > 10 ? '¡Lola te adora! 💕' : '¡Qué rica leche!',
        stats: [
          { label: 'Chorritos de leche', value: hits },
          { label: 'Perfectos', value: perfects },
          { label: 'Muuus', value: misses },
        ],
      };
    },

    dispose() {},
  };
}
