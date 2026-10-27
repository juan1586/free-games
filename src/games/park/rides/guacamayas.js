/**
 * Coro de Guacamayas (Selva Amazónica): cuatro guacamayas de colores cantan una canción en una rama
 * y hay que repetirla con ◀ ▲ ▼ ▶ (cada flecha es una guacamaya). Cada ronda la canción tiene una nota
 * más. Equivocarse no termina el juego: las guacamayas la cantan otra vez. Con 🔁 se vuelve a oír.
 * Con amigas, todas oyen la misma canción (sale de la semilla común).
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights } from '../props.js';
import { MACAW_COLORS, buildFern, buildJungleTree, buildMacaw } from '../propsJungle.js';

const ROUNDS = 8;
const FIRST_LENGTH = 3;
const TIME_LIMIT = 75;
const FINALE_SECONDS = 3;
const NOTE_GAP = 0.15;
const BRANCH_Y = 4.2;
const BRANCH_Z = -6;
/** Flecha y nombre de cada guacamaya (en el mismo orden que MACAW_COLORS). */
const KEYS = [
  { input: 'left', arrow: '◀', name: 'Roja' },
  { input: 'up', arrow: '▲', name: 'Azul' },
  { input: 'down', arrow: '▼', name: 'Amarilla' },
  { input: 'right', arrow: '▶', name: 'Verde' },
];
const MACAW_X = [-3.3, -1.1, 1.1, 3.3];
const CHEERS = ['🎶 ¡Muy bien!', '🦜 ¡Eso es!', '⭐ ¡Qué oído!', '🎉 ¡Perfecto!'];

const toCss = (color) => `#${color.toString(16).padStart(6, '0')}`;

/** Alguien de pie con su nombre y burbuja (las amigas que cantan al lado). */
function buildSinger(kit, look, name) {
  const avatar = createAvatar(kit, look);
  avatar.root.rotation.y = Math.PI;
  const label = kit.label(name, { height: 0.4 });
  label.sprite.position.y = 2.8;
  const bubble = kit.label(' ', { bubble: true, height: 0.5, background: '#fff6c9' });
  bubble.sprite.position.y = 3.4;
  bubble.sprite.visible = false;
  avatar.root.add(label.sprite, bubble.sprite);
  return { avatar, bubble, timer: 0 };
}

export function createGuacamayasRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: 0xa8e6c8, fogNear: 30, fogFar: 90 });
  scene.add(at(kit.disc(80, 0x3f8f3f), 0, 0, 0));
  scene.add(at(kit.disc(7, 0x8fbf5a), 0, 0.02, -2));

  // Selva alrededor del claro.
  for (let index = 0; index < 14; index += 1) {
    const angle = Math.PI * 0.15 + (index / 13) * Math.PI * 1.7;
    const distance = 14 + random() * 8;
    const tree = buildJungleTree(kit, { height: 8 + random() * 5 });
    tree.position.set(Math.cos(angle + Math.PI / 2) * distance, 0, -Math.abs(Math.sin(angle + Math.PI / 2)) * distance - 4);
    scene.add(tree);
  }
  for (let index = 0; index < 10; index += 1) {
    scene.add(at(buildFern(kit), (random() - 0.5) * 20, 0, -3 - random() * 10));
  }

  // El árbol del coro y su rama.
  scene.add(at(kit.cyl(0.9, 1.2, 9, 0x6b4423, 10), 6.2, 4.5, BRANCH_Z - 0.5));
  scene.add(at(kit.sphere(3.5, 0x2e8b3e, 10), 5.5, 9.5, BRANCH_Z - 1));
  scene.add(at(kit.sphere(2.6, 0x3fae4a, 10), 2, 9, BRANCH_Z - 1.5));
  const branch = at(kit.cyl(0.25, 0.35, 11, 0x6b4423, 8), 0.8, BRANCH_Y, BRANCH_Z);
  branch.rotation.z = Math.PI / 2;
  scene.add(branch);

  const macaws = MACAW_COLORS.map((color, index) => {
    const bird = buildMacaw(kit, color);
    bird.scale.setScalar(1.7);
    bird.position.set(MACAW_X[index], BRANCH_Y + 0.15, BRANCH_Z);
    scene.add(bird);
    const ring = at(kit.torus(1.1, 0.08, 0xffffff, { emissive: 0xffffff }), MACAW_X[index], BRANCH_Y + 1.1, BRANCH_Z + 0.2);
    ring.visible = false;
    scene.add(ring);
    const arrow = kit.label(KEYS[index].arrow, { background: toCss(color), color: '#ffffff', height: 0.9 });
    arrow.sprite.position.set(MACAW_X[index], BRANCH_Y - 1.1, BRANCH_Z + 0.4);
    scene.add(arrow.sprite);
    const note = kit.label('🎵', { background: 'rgba(255,255,255,0)', height: 0.9 });
    note.sprite.visible = false;
    scene.add(note.sprite);
    return { bird, ring, note, glow: 0 };
  });

  const me = createAvatar(kit, look);
  me.root.rotation.y = Math.PI;
  scene.add(me.root);
  const singers = mates.slice(0, 3).map((mate, index) => {
    const singer = buildSinger(kit, mate.look, `${mate.emoji} ${mate.name}`);
    singer.avatar.root.position.set(index === 1 ? 1.9 : -1.9 * (index === 0 ? 1 : 2), 0, 0.9);
    scene.add(singer.avatar.root);
    return { ...singer, id: mate.id };
  });

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 3.4, 6.5);
  camera.lookAt(0, 3.4, BRANCH_Z);

  // La canción completa sale de la semilla: cada ronda canta un trozo más largo.
  const song = Array.from({ length: FIRST_LENGTH + ROUNDS - 1 }, () => Math.floor(random() * KEYS.length));
  let state = 'listen';
  let round = 0;
  let passed = 0;
  let mistakes = 0;
  let replays = 0;
  let time = 0;
  let stateTimer = 1.2;
  let noteIndex = 0;
  let typed = 0;
  let cheerTimer = 0;
  let message = '';
  let messageTimer = 0;
  const previous = { left: false, up: false, down: false, right: false };

  const length = () => FIRST_LENGTH + round;
  const noteSeconds = () => Math.max(0.36, 0.62 - round * 0.03);

  function say(text, seconds = 1.2) {
    message = text;
    messageTimer = seconds;
  }

  function sing(index) {
    sounds.macaw(index);
    macaws[index].glow = noteSeconds();
  }

  function listenAgain(delay) {
    state = 'listen';
    noteIndex = 0;
    typed = 0;
    stateTimer = delay;
  }

  function finish() {
    state = 'finale';
    stateTimer = FINALE_SECONDS;
    sounds.achievement();
    say(passed >= ROUNDS ? '🦜 ¡Cantaste toda la canción!' : `🎶 ¡Pasaste ${passed} rondas!`, FINALE_SECONDS);
  }

  function press(index) {
    sing(index);
    if (song[typed] !== index) {
      mistakes += 1;
      sounds.bump();
      say('🙉 ¡Casi! Escucha otra vez', 1.4);
      listenAgain(1.2);
      return;
    }
    typed += 1;
    if (typed < length()) return;
    passed += 1;
    round += 1;
    cheerTimer = 1.2;
    say(CHEERS[passed % CHEERS.length], 1.2);
    announce('song');
    if (round >= ROUNDS) finish();
    else listenAgain(1.4);
  }

  return {
    scene,
    camera,
    intro: 'Escucha a las guacamayas 👂 y repite la canción con ◀ ▲ ▼ ▶',
    controls: { action: { icon: '🔁', label: 'Otra vez' }, steer: true, aim: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      stateTimer -= delta;
      if (state !== 'finale' && time >= TIME_LIMIT) finish();

      if (state === 'listen' && stateTimer <= 0) {
        if (noteIndex < length()) {
          sing(song[noteIndex]);
          noteIndex += 1;
          stateTimer = noteSeconds() + NOTE_GAP;
        } else {
          state = 'play';
          say('🎶 ¡Tu turno!', 1);
        }
      } else if (state === 'play') {
        KEYS.forEach(({ input: key }, index) => {
          if (input[key] && !previous[key] && state === 'play') press(index);
        });
        if (state === 'play' && input.actionPressed) {
          replays += 1;
          listenAgain(0.4);
        }
      } else if (state === 'finale' && stateTimer <= 0) {
        this.done = true;
        return;
      }
      KEYS.forEach(({ input: key }) => (previous[key] = Boolean(input[key])));

      macaws.forEach((macaw, index) => {
        macaw.glow -= delta;
        const singing = macaw.glow > 0 || state === 'finale';
        const hop = singing ? Math.abs(Math.sin(time * 14 + index)) * 0.35 : Math.sin(time * 2 + index) * 0.03;
        macaw.bird.position.y = BRANCH_Y + 0.15 + hop;
        macaw.bird.scale.setScalar(macaw.glow > 0 ? 2.1 : 1.7);
        macaw.bird.userData.wings.forEach((wing, side) => (wing.rotation.z = singing ? (side ? 1 : -1) * (0.6 + Math.sin(time * 20) * 0.5) : 0));
        macaw.ring.visible = macaw.glow > 0;
        macaw.note.sprite.visible = macaw.glow > 0;
        macaw.note.sprite.position.set(MACAW_X[index] + 0.6, BRANCH_Y + 2.6 + (noteSeconds() - macaw.glow), BRANCH_Z);
      });

      cheerTimer -= delta;
      me.update(delta, { cheer: cheerTimer > 0 || state === 'finale', seated: false, airborne: cheerTimer > 0 });
      me.root.position.y = cheerTimer > 0 ? Math.abs(Math.sin(time * 10)) * 0.4 : 0;
      singers.forEach((singer) => {
        singer.avatar.update(delta, { airborne: singer.timer > 0 || state === 'finale' });
        if (singer.timer > 0) {
          singer.timer -= delta;
          if (singer.timer <= 0) singer.bubble.sprite.visible = false;
        }
      });
    },

    onMateSay(id, kind) {
      const singer = singers.find((other) => other.id === id);
      if (!singer || kind !== 'song') return;
      singer.bubble.setText(SAYINGS.song.text);
      singer.bubble.sprite.visible = true;
      singer.timer = 1.3;
    },

    status: () => `🎶 Ronda ${Math.min(round + 1, ROUNDS)} de ${ROUNDS} · ⭐ ${passed} · ⏱️ ${Math.max(0, Math.ceil(TIME_LIMIT - time))} s`,
    prompt() {
      if (messageTimer > 0) return message;
      if (state === 'listen') return '👂 Escucha…';
      if (state === 'play') return `🎶 ¡Tu turno! ${typed} de ${length()}`;
      return '';
    },

    result() {
      return {
        coins: Math.min(22, 4 + passed * 2),
        emoji: '🦜',
        title: passed >= ROUNDS && mistakes === 0 ? '¡Cantas como una guacamaya! 🦜' : '¡Qué lindo coro!',
        stats: [
          { label: 'Rondas', value: passed },
          { label: 'Notas seguidas', value: passed ? FIRST_LENGTH + passed - 1 : 0 },
          { label: 'Repeticiones', value: mistakes + replays },
        ],
      };
    },

    dispose() {},
  };
}
