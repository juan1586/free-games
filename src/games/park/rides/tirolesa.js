/**
 * Vuelo del Tucán (Selva Amazónica): se baja colgada de un cable por encima de la selva. Con ◀ ▶ se
 * balancea a los lados para atrapar mariposas morpho y frutas; manteniendo 🙈 se encogen las piernas
 * para pasar por encima de las ramas. Los monos saludan desde los árboles y al final espera el
 * tucán Tuki en su plataforma. Las amigas bajan en cables al lado.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { pickLine } from '../riders.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights } from '../props.js';
import { buildButterfly, buildMonkey, buildToucan, flapButterfly } from '../propsJungle.js';

const ZIP_LENGTH = 240;
const SPEED = 9.5;
const START_Y = 28;
const END_Y = 12;
const ARRIVE_SECONDS = 3.5;
const SWING_RANGE = 2.4;
const SWING_SPEED = 5;
/** Del cable a los pies de quien va colgada (con las piernas estiradas o encogidas). */
const HANG = 2.9;
const TUCK = 2.6;
/** Encogida (piernas al frente), los pies suben esto desde la cadera hacia abajo. */
const TUCK_LIFT = 0.6;
const SEGMENT = 40;
const SEGMENTS = 4;
const ITEM_GAP = 6;
const PICK_RADIUS = 1.2;
const BUMP_SECONDS = 0.8;
const MATE_CABLES = [-4.2, 4.2, -8.4];
const FRUIT_COLORS = [0xffd93d, 0xff9f43, 0xe63946];
const MONKEY_LINES = ['🐒 ¡Hola!', '🐒 ¡Uh uh ah ah!', '🐒 ¡Qué valiente!', '🐒 ¡Vuela!'];

/** Altura del cable en `z` (baja poco a poco desde la salida hasta la plataforma del final). */
const cableY = (z) => START_Y + (z / ZIP_LENGTH) * (START_Y - END_Y);

/** Selva vista desde arriba en un tramo: troncos altos y copas a los lados, en InstancedMesh. */
function buildCanopy(kit, random) {
  const group = new THREE.Group();
  group.add(at(kit.plane(120, SEGMENT, 0x2f6b34), 0, 0, 0));
  const matrix = new THREE.Matrix4();
  const spots = Array.from({ length: 10 }, () => ({
    x: (random() < 0.5 ? -1 : 1) * (7 + random() * 22),
    z: (random() - 0.5) * SEGMENT,
    height: 18 + random() * 14,
    scale: 0.8 + random() * 0.7,
  }));
  const instanced = (key, factory, color, place) => {
    const mesh = new THREE.InstancedMesh(kit.geometry(key, factory), kit.mat(color), spots.length);
    spots.forEach((spot, index) => {
      place(spot);
      mesh.setMatrixAt(index, matrix);
    });
    group.add(mesh);
  };
  instanced('zip-trunk', () => new THREE.CylinderGeometry(0.6, 0.9, 1, 7), 0x6b4423, ({ x, z, height }) =>
    matrix.makeScale(1, height, 1).setPosition(x, height / 2, z),
  );
  instanced('zip-crown', () => new THREE.SphereGeometry(4, 9, 6), 0x2e8b3e, ({ x, z, height, scale }) =>
    matrix.makeScale(scale, scale * 0.7, scale).setPosition(x, height + 1, z),
  );
  instanced('zip-crown-2', () => new THREE.SphereGeometry(3, 8, 6), 0x4cbf5a, ({ x, z, height, scale }) =>
    matrix.makeScale(scale, scale * 0.7, scale).setPosition(x + 2 * scale, height + 0.4, z + 1.5),
  );
  // Copas bajas que tapan el suelo (la selva se ve tupida desde arriba).
  const bushes = new THREE.InstancedMesh(kit.geometry('zip-bush', () => new THREE.SphereGeometry(3.5, 8, 5)), kit.mat(0x1f7a3a), 14);
  for (let index = 0; index < 14; index += 1) {
    matrix.makeScale(1, 0.6, 1).setPosition((random() - 0.5) * 70, 2 + random() * 3, (random() - 0.5) * SEGMENT);
    bushes.setMatrixAt(index, matrix);
  }
  group.add(bushes);
  return group;
}

/** Alguien colgada de la polea: el personaje con los brazos arriba. El grupo está en el cable. */
function buildHanger(kit, look, name = null) {
  const hanger = new THREE.Group();
  hanger.add(at(kit.box(0.3, 0.25, 0.5, 0xffd93d), 0, -0.1, 0));
  [-0.3, 0.3].forEach((x) => {
    const strap = at(kit.box(0.05, 0.75, 0.05, 0x2b2140), x / 2, -0.55, 0);
    strap.rotation.z = -x * 0.5;
    hanger.add(strap);
  });
  const avatar = createAvatar(kit, look);
  avatar.root.position.y = -HANG;
  avatar.root.rotation.y = Math.PI;
  // Arnés de colores en la cintura.
  avatar.root.add(at(kit.box(0.96, 0.18, 0.54, 0xff5fa2), 0, 0.82, 0));
  hanger.add(avatar.root);
  let bubble = null;
  if (name) {
    const label = kit.label(name, { height: 0.4 });
    label.sprite.position.y = 0.5;
    bubble = kit.label(' ', { bubble: true, height: 0.5, background: '#fff6c9' });
    bubble.sprite.position.y = 1.1;
    bubble.sprite.visible = false;
    hanger.add(label.sprite, bubble.sprite);
  }
  return { hanger, avatar, bubble };
}

/** Cable recto desde la salida hasta el final, a `x` del centro. */
function buildCable(kit, x) {
  const fromZ = 12;
  const toZ = -ZIP_LENGTH - 8;
  const length = Math.hypot(fromZ - toZ, cableY(fromZ) - cableY(toZ));
  const cable = at(kit.box(0.06, 0.06, length, 0x333333), x, (cableY(fromZ) + cableY(toZ)) / 2, (fromZ + toZ) / 2);
  cable.rotation.x = -Math.atan2(cableY(fromZ) - cableY(toZ), fromZ - toZ);
  return cable;
}

export function createTirolesaRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: 0xa8e6c8, fogNear: 40, fogFar: 140 });

  const segments = Array.from({ length: SEGMENTS }, (_, index) => {
    const segment = buildCanopy(kit, random);
    segment.position.z = -index * SEGMENT;
    scene.add(segment);
    return segment;
  });
  scene.add(buildCable(kit, 0));

  // Plataforma de salida (detrás) y de llegada, con el tucán Tuki.
  const startDeck = at(new THREE.Group(), 0, cableY(6) - HANG, 6);
  startDeck.add(at(kit.box(5, 0.5, 4, 0x8a5a2b), 0, -0.25, 0));
  startDeck.add(at(kit.cyl(0.9, 1.1, 40, 0x6b4423, 8), 0, -20.5, 2));
  scene.add(startDeck);
  const endZ = -ZIP_LENGTH - 3;
  const endDeck = at(new THREE.Group(), 0, END_Y - HANG, endZ);
  endDeck.add(at(kit.box(7, 0.5, 6, 0x8a5a2b), 0, -0.25, 0));
  endDeck.add(at(kit.cyl(1.2, 1.5, 40, 0x6b4423, 8), 0, -20.5, -2.5));
  [-3.4, 3.4].forEach((x) => endDeck.add(at(kit.box(0.15, 1, 6, 0xc58b4e), x, 0.5, 0)));
  endDeck.add(at(kit.sphere(4, 0x2e8b3e, 10), 0, 6, -4));
  const tuki = buildToucan(kit);
  tuki.position.set(1.8, 0, -1.5);
  tuki.scale.setScalar(1.6);
  endDeck.add(tuki);
  const tukiTalk = kit.label('🐦 ¡Bienvenida!', { bubble: true, height: 0.6, background: '#fff6c9' });
  tukiTalk.sprite.position.set(1.8, 2.8, -1.5);
  tukiTalk.sprite.visible = false;
  endDeck.add(tukiTalk.sprite);
  const tukiName = kit.label('🐦 Tuki', { height: 0.45 });
  tukiName.sprite.position.set(1.8, 2.2, -1.5);
  endDeck.add(tukiName.sprite);
  scene.add(endDeck);

  const me = buildHanger(kit, look);
  scene.add(me.hanger);
  const buddies = mates.slice(0, MATE_CABLES.length).map((mate, index) => {
    scene.add(buildCable(kit, MATE_CABLES[index]));
    const buddy = buildHanger(kit, mate.look, `${mate.emoji} ${mate.name}`);
    scene.add(buddy.hanger);
    return { ...buddy, id: mate.id, cableX: MATE_CABLES[index], lag: 1.5 + index * 1.2, timer: 0 };
  });

  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 300);
  const items = [];
  let nextItemZ = -16;
  let time = 0;
  let distance = 0;
  let swing = 0;
  let swingVelocity = 0;
  let bumpTimer = 0;
  let butterflies = 0;
  let fruits = 0;
  let bumps = 0;
  let arriveTimer = -1;
  let message = '';
  let messageTimer = 0;
  let zipSoundTimer = 0;

  function say(text, seconds = 1) {
    message = text;
    messageTimer = seconds;
  }

  function spawnItem(z) {
    const roll = random();
    const y = cableY(z);
    let mesh;
    let kind;
    if (roll < 0.45) {
      kind = 'butterfly';
      mesh = buildButterfly(kit, random() < 0.75 ? 0x2f8fff : 0xff9f43);
      mesh.position.set((random() * 2 - 1) * SWING_RANGE, y - 1.6 - random() * 0.8, z);
      mesh.scale.setScalar(1.6);
    } else if (roll < 0.65) {
      kind = 'fruit';
      const x = (random() * 2 - 1) * SWING_RANGE;
      mesh = new THREE.Group();
      mesh.add(at(kit.box(0.05, 2, 0.05, 0x4f7d2a), 0, 1, 0));
      mesh.add(kit.sphere(0.4, FRUIT_COLORS[Math.floor(random() * FRUIT_COLORS.length)], 8, { emissive: 0x332200 }));
      mesh.position.set(x, y - 1.9, z);
    } else if (roll < 0.88) {
      // Rama atravesada a la altura de los pies: hay que encoger las piernas.
      kind = 'branch';
      mesh = new THREE.Group();
      const log = kit.cyl(0.2, 0.25, 22, 0x6b4423, 8);
      log.rotation.z = Math.PI / 2;
      mesh.add(log);
      [-6, -2.5, 2.8, 6.5].forEach((x) => mesh.add(at(kit.sphere(0.6, 0x3fae4a, 8), x, 0.3, 0)));
      mesh.position.set(0, y - HANG + 0.15, z);
    } else {
      // Mono en una rama al lado del camino: saluda al pasar.
      kind = 'monkey';
      const side = random() < 0.5 ? -1 : 1;
      mesh = new THREE.Group();
      const branch = kit.cyl(0.15, 0.2, 6, 0x6b4423, 8);
      branch.rotation.z = Math.PI / 2;
      mesh.add(at(branch, side * 3, 0, 0));
      const monkey = buildMonkey(kit);
      monkey.position.set(0, 0.1, 0);
      monkey.rotation.y = -side * 0.8 + Math.PI;
      mesh.add(monkey);
      mesh.userData.monkey = monkey;
      mesh.position.set(side * 5.6, y - 1.2, z);
    }
    scene.add(mesh);
    items.push({ kind, mesh, phase: random() * 6, done: false, hit: false });
  }

  return {
    scene,
    camera,
    intro: 'Balancéate con ◀ ▶ para atrapar mariposas 🦋 y mantén 🙈 para pasar las ramas',
    controls: { action: { icon: '🙈', label: 'Encoger' }, steer: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      const zipping = arriveTimer < 0;
      if (zipping) {
        bumpTimer -= delta;
        distance += SPEED * (bumpTimer > 0 ? 0.6 : 1) * delta;
        zipSoundTimer -= delta;
        if (zipSoundTimer <= 0) {
          sounds.zip();
          zipSoundTimer = 2.5;
        }
        if (distance >= ZIP_LENGTH) {
          arriveTimer = 0;
          sounds.achievement();
          say('🐦 ¡Llegaste! Tuki te felicita', ARRIVE_SECONDS);
          tukiTalk.sprite.visible = true;
          announce('butterfly');
        }
      } else {
        arriveTimer += delta;
        distance += Math.max(0, 3 - arriveTimer * 2) * delta;
        if (arriveTimer >= ARRIVE_SECONDS) {
          this.done = true;
          return;
        }
      }
      const z = -distance;
      const y = Math.max(END_Y, cableY(z));

      // Balanceo: ◀ ▶ empujan hacia un lado; suelto, vuelve poco a poco al centro.
      const wanted = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * SWING_RANGE;
      swingVelocity += ((wanted - swing) * SWING_SPEED - swingVelocity * 3) * delta;
      swing = Math.max(-SWING_RANGE, Math.min(SWING_RANGE, swing + swingVelocity * delta));
      const tucked = zipping && input.action;
      if (input.actionPressed) sounds.jump();
      me.hanger.position.set(0, y, z);
      me.avatar.root.position.x = swing;
      me.avatar.root.rotation.z = -swing * 0.12;
      me.avatar.root.position.y += ((tucked ? -TUCK : -HANG) - me.avatar.root.position.y) * Math.min(1, delta * 14);
      // Encogida = "sentada" en el aire (piernas al frente) con los brazos arriba agarrando las cintas.
      me.avatar.update(delta, { cheer: true, seated: tucked || !zipping, airborne: true });
      const feetY = y + me.avatar.root.position.y + (tucked ? TUCK_LIFT : 0);

      buddies.forEach((buddy, index) => {
        const buddyZ = Math.min(z + buddy.lag, -0.5);
        buddy.hanger.position.set(buddy.cableX, Math.max(END_Y, cableY(buddyZ)), buddyZ);
        buddy.avatar.root.position.x = Math.sin(time * 1.3 + index) * 0.5;
        buddy.avatar.update(delta, { cheer: true, seated: true });
        if (buddy.timer > 0) {
          buddy.timer -= delta;
          if (buddy.timer <= 0) buddy.bubble.sprite.visible = false;
        }
      });

      while (zipping && nextItemZ > z - 70 && -nextItemZ < ZIP_LENGTH - 12) {
        spawnItem(nextItemZ);
        nextItemZ -= ITEM_GAP * (0.7 + random() * 0.6);
      }
      segments.forEach((segment) => {
        if (segment.position.z - SEGMENT / 2 > z + 20) segment.position.z -= SEGMENT * SEGMENTS;
      });

      items.forEach((item) => {
        if (item.done) return;
        const { mesh } = item;
        if (item.kind === 'butterfly') {
          flapButterfly(mesh, time + item.phase);
          mesh.position.y += Math.sin(time * 3 + item.phase) * delta * 0.6;
        }
        if (item.kind === 'monkey') {
          const monkey = mesh.userData.monkey;
          monkey.position.y = 0.1 + Math.abs(Math.sin(time * 5 + item.phase)) * 0.4;
          monkey.userData.tail.rotation.z = Math.sin(time * 4 + item.phase) * 0.5;
        }
        if (mesh.position.z > z + 12) {
          scene.remove(mesh);
          item.done = true;
          return;
        }
        if (item.hit) return;
        const dz = Math.abs(mesh.position.z - z);
        if (item.kind === 'monkey') {
          if (dz < 2) {
            item.hit = true;
            say(pickLine(MONKEY_LINES, random), 1.2);
          }
          return;
        }
        if (item.kind === 'branch') {
          if (dz > 0.5) return;
          item.hit = true;
          // Choca si los pies van más abajo que la parte de arriba de la rama.
          if (feetY < mesh.position.y + 0.2) {
            bumps += 1;
            bumpTimer = BUMP_SECONDS;
            sounds.bump();
            say('🌿 ¡Uy, una rama! Mantén 🙈 para encogerte');
          } else {
            say('🙈 ¡Por encima!', 0.6);
          }
          return;
        }
        const handX = swing;
        const bodyY = feetY + 1.2;
        if (dz > PICK_RADIUS || Math.abs(mesh.position.x - handX) > PICK_RADIUS || Math.abs(mesh.position.y - bodyY) > 2) return;
        item.done = true;
        scene.remove(mesh);
        sounds.coin();
        if (item.kind === 'butterfly') {
          butterflies += 1;
          say('🦋 ¡Una mariposa!', 0.7);
          if (butterflies % 4 === 0) announce('butterfly');
        } else {
          fruits += 1;
          say('🍌 ¡Fruta! +2', 0.8);
        }
      });
      for (let index = items.length - 1; index >= 0; index -= 1) if (items[index].done) items.splice(index, 1);

      tuki.rotation.y = Math.sin(time * 2) * 0.4;
      if (zipping) {
        // Un poco al lado del cable (encima, el cable taparía media pantalla).
        camera.position.set(2.2 + swing * 0.3, y + 0.4, z + 6.5);
        camera.lookAt(swing * 0.6, y - 2.4, z - 8);
      } else {
        // Al llegar, la cámara mira a la jugadora y a Tuki en la plataforma.
        const angle = Math.min(1, arriveTimer / 2) * 0.9;
        camera.position.set(Math.sin(angle) * 7, END_Y - 1, z + Math.cos(angle) * 7);
        camera.lookAt(0.8, END_Y - HANG + 1, z - 1);
      }
    },

    onMateSay(id, kind) {
      const buddy = buddies.find((other) => other.id === id);
      if (!buddy || kind !== 'butterfly') return;
      buddy.bubble.setText(SAYINGS.butterfly.text);
      buddy.bubble.sprite.visible = true;
      buddy.timer = 1.3;
    },

    status: () => `🦋 Mariposas: ${butterflies} · 🍌 ${fruits} · 🗺️ ${Math.min(100, Math.round((distance / ZIP_LENGTH) * 100))} %`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      const points = butterflies + fruits * 2;
      return {
        coins: Math.min(22, 6 + Math.floor(points / 2)),
        emoji: '🌿',
        title: bumps === 0 ? '¡Vuelas como un tucán! 🐦' : '¡Qué vuelo por la selva!',
        stats: [
          { label: 'Mariposas', value: butterflies },
          { label: 'Frutas', value: fruits },
          { label: 'Ramas', value: bumps },
        ],
      };
    },

    dispose() {
      scene.traverse((object) => object.isInstancedMesh && object.dispose());
    },
  };
}
