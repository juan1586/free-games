/**
 * Carrera de Cerditos (Granja Panaca): cada quien anima a su cerdito pulsando rápido (💪).
 * Dos vueltas a la pista del parque. Si van amigas, cada una tiene su cerdito en la carrera.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { buildPig } from '../props.js';
import { PIG_COLORS, PIG_LANES, placePig } from '../worldPanaca.js';

const LAPS = 2;
const FULL = LAPS * Math.PI * 2;
const COUNTDOWN = 2.4;
const TAP_ENERGY = 0.18;
const MAX_ENERGY = 1.6;
const ENERGY_DECAY = 0.9;
const BASE_SPEED = 3.2;
const ENERGY_SPEED = 3.2;
/** Tras llegar, se mira un momento cómo llegan los demás. */
const AFTER_FINISH = 2.2;
const MAX_TIME = 40;
const PLACE_COINS = [14, 10, 7, 5];
const PIG_NAMES = ['Pepa', 'Tocinito', 'Rosita', 'Chancho'];
const MATE_FOLLOW_RATE = 8;

export function createCerditosRide({ kit, park, scene, random, announce, mates, myId }) {
  const track = park.pigTrack;
  track.idle = false;
  track.group.visible = false;
  const group = at(new THREE.Group(), track.center.x, track.center.y, track.center.z);
  scene.add(group);

  // Carriles: las jugadoras por orden de id (igual en todas las tablets); el resto, cerditos del parque.
  const order = [myId, ...mates.map((mate) => mate.id)].sort();
  const makeRacer = (lane, kind, label, id = null) => {
    const mesh = buildPig(kit, PIG_COLORS[lane]);
    const tag = kit.label(label, { background: kind === 'me' ? '#ff5fa2' : kind === 'mate' ? '#7b5cff' : '#ffffff', color: kind === 'npc' ? '#2b2140' : '#ffffff', height: 0.42 });
    tag.sprite.position.y = 1.9;
    const bubble = kit.label(' ', { bubble: true, height: 0.5, background: '#fff6c9' });
    bubble.sprite.position.y = 2.5;
    bubble.sprite.visible = false;
    mesh.add(tag.sprite, bubble.sprite);
    group.add(mesh);
    return { id, kind, lane, mesh, bubble, bubbleTimer: 0, progress: 0, shown: 0, speed: 4 + random(), finishedAt: null };
  };
  const me = makeRacer(order.indexOf(myId) % PIG_LANES.length, 'me', '⭐ Tu cerdito');
  const racers = [me];
  mates.slice(0, PIG_LANES.length - 1).forEach((mate) => {
    racers.push(makeRacer(order.indexOf(mate.id) % PIG_LANES.length, 'mate', `${mate.emoji} ${mate.name}`, mate.id));
  });
  const used = new Set(racers.map((racer) => racer.lane));
  PIG_LANES.forEach((_, lane) => {
    if (!used.has(lane)) racers.push(makeRacer(lane, 'npc', `🐷 ${PIG_NAMES[lane]}`));
  });

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  const pigWorld = new THREE.Vector3();
  let time = -COUNTDOWN;
  let energy = 0;
  let taps = 0;
  let finishedCount = 0;
  let place = 0;
  let message = '';
  let messageTimer = 0;

  function pigSays(racer, text) {
    racer.bubble.setText(text);
    racer.bubble.sprite.visible = true;
    racer.bubbleTimer = 1.2;
  }

  function finish(racer) {
    if (racer.finishedAt !== null) return;
    racer.finishedAt = time;
    finishedCount += 1;
    if (racer === me) {
      place = finishedCount;
      sounds.win();
      message = place === 1 ? '🏆 ¡Tu cerdito ganó!' : `🎉 ¡Llegaste de ${place}º!`;
      messageTimer = AFTER_FINISH;
      if (place === 1) announce('win');
    } else if (racer.kind === 'npc') {
      pigSays(racer, '🐷 ¡Oinc!');
    }
  }

  return {
    camera,
    intro: '¡Pulsa 💪 muy rápido para animar a tu cerdito!',
    controls: { action: { icon: '💪', label: '¡Ánimo!' }, steer: false },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      if ((me.finishedAt !== null && time - me.finishedAt > AFTER_FINISH) || time > MAX_TIME) {
        this.done = true;
        return;
      }
      if (time < 0) {
        message = time < -1.6 ? '3…' : time < -0.8 ? '2…' : '1…';
        messageTimer = 0.2;
      } else {
        if (input.actionPressed && me.finishedAt === null) {
          taps += 1;
          energy = Math.min(MAX_ENERGY, energy + TAP_ENERGY);
          if (taps % 4 === 0) sounds.oink();
          if (taps % 10 === 0) announce('oink');
        }
        energy = Math.max(0, energy - ENERGY_DECAY * delta);
        me.speed = BASE_SPEED + energy * ENERGY_SPEED;
        racers.forEach((racer) => {
          if (racer.kind === 'npc') {
            // Los cerditos del parque van a su ritmo, con algún arranque.
            racer.speed += (random() - 0.5) * delta * 3;
            racer.speed = Math.max(4, Math.min(6.2, racer.speed));
          }
          if (racer.kind !== 'mate' && racer.finishedAt === null) racer.progress += (racer.speed / PIG_LANES[racer.lane]) * delta;
          if (racer.progress >= FULL) finish(racer);
        });
      }

      const follow = Math.min(1, delta * MATE_FOLLOW_RATE);
      racers.forEach((racer, index) => {
        // Las amigas se mueven con lo que manda su tablet (se suaviza).
        racer.shown = racer.kind === 'mate' ? racer.shown + (racer.progress - racer.shown) * follow : racer.progress;
        const running = time >= 0 && racer.finishedAt === null;
        placePig(racer.mesh, PIG_LANES[racer.lane], Math.min(racer.shown, FULL), running ? time * 14 + index : 0);
        if (racer.bubbleTimer > 0) {
          racer.bubbleTimer -= delta;
          if (racer.bubbleTimer <= 0) racer.bubble.sprite.visible = false;
        }
      });

      // Cámara por fuera de la pista, un poco por detrás de tu cerdito.
      const angle = Math.min(me.shown, FULL) - 0.45;
      const distance = PIG_LANES[PIG_LANES.length - 1] + 7;
      me.mesh.getWorldPosition(pigWorld);
      camera.position.set(track.center.x + Math.sin(angle) * distance, 4.8, track.center.z + Math.cos(angle) * distance);
      camera.lookAt(pigWorld.x, 0.8, pigWorld.z);
    },

    mateState: () => ({ x: me.progress / (Math.PI * 2), z: 0, heading: 0 }),

    onMateState(id, { x }) {
      const racer = racers.find((other) => other.id === id);
      if (!racer) return;
      racer.progress = Math.max(racer.progress, Math.min(LAPS, x) * Math.PI * 2);
      if (racer.progress >= FULL) finish(racer);
    },

    onMateSay(id, kind) {
      const racer = racers.find((other) => other.id === id);
      if (racer && kind === 'oink') pigSays(racer, '🐷 ¡Corre, cerdito!');
      if (racer && kind === 'win') pigSays(racer, '🏆 ¡Gané!');
    },

    status() {
      const lap = Math.min(LAPS, Math.floor(me.progress / (Math.PI * 2)) + 1);
      const ahead = racers.filter((racer) => racer !== me && racer.shown > me.shown).length;
      return `🐷 Vuelta ${lap}/${LAPS} · 🏅 Vas ${ahead + 1}º · 💪 ${taps}`;
    },
    prompt: () => (messageTimer > 0 ? message : time >= 0 && time < 0.8 ? '¡YA! 🏁' : ''),

    result() {
      const finalPlace = place || racers.filter((racer) => racer !== me && racer.shown > me.shown).length + 1;
      return {
        coins: (PLACE_COINS[finalPlace - 1] ?? 4) + Math.min(6, Math.floor(taps / 15)),
        emoji: '🐷',
        title: finalPlace === 1 ? '¡Tu cerdito ganó! 🏆' : '¡Qué carrera!',
        stats: [
          { label: 'Puesto', value: `${finalPlace}º de ${racers.length}` },
          { label: 'Ánimos', value: taps },
        ],
      };
    },

    dispose() {
      scene.remove(group);
      track.group.visible = true;
      track.idle = true;
    },
  };
}
