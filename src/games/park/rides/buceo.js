/**
 * Buceo en el Arrecife (Playa de Cartagena): se nada entre corales con la tortuga Tita. Mantener 🫧
 * sube, soltar baja poco a poco y ◀ ▶ gira. Hay perlas flotando, almejas con perla en el fondo
 * (hay que bajar) y medusas que pican. Al final se llega al galeón hundido y se abre el cofre.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { pickLine } from '../riders.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights } from '../props.js';
import { SAND_COLOR, buildChest, buildClam, buildFish, buildGalleon, buildJellyfish, buildTurtle } from '../propsBeach.js';

const WATER = 0x1f7fc0;
const SPEED = 6;
const SWIM_LENGTH = 200;
const TREASURE_SECONDS = 4;
const STEER_SPEED = 6;
const RISE_SPEED = 4;
const SINK_SPEED = 2.2;
const MIN_Y = 1.1;
const MAX_Y = 8;
const HALF_WIDTH = 6;
const SEGMENT = 40;
const SEGMENTS = 4;
const ITEM_GAP = 5;
const PICK_RADIUS = 1.3;
const STING_SECONDS = 1;
const FISH_COLORS = [0xffd93d, 0xff9f43, 0x5ab0ff, 0xff5fa2, 0x4dd4ac];
const CORAL_COLORS = [0xff6f91, 0xff9f43, 0xb57bff, 0xffd93d];
const TITA_LINES = ['🐢 ¡Bien hecho!', '🐢 ¡Mira, peces!', '🐢 ¡Una perla! ✨', '🐢 ¡Sígueme!'];

/** Fondo de un tramo: arena, corales, algas y piedras, todo en InstancedMesh. */
function buildReef(kit, random) {
  const group = new THREE.Group();
  group.add(at(kit.plane(60, SEGMENT, SAND_COLOR), 0, 0, 0));
  const matrix = new THREE.Matrix4();
  const instanced = (key, factory, color, count, place) => {
    const mesh = new THREE.InstancedMesh(kit.geometry(key, factory), kit.mat(color), count);
    for (let index = 0; index < count; index += 1) {
      place(index);
      mesh.setMatrixAt(index, matrix);
    }
    group.add(mesh);
  };
  // Corales y piedras a los lados, fuera de por donde se nada.
  const side = () => (random() < 0.5 ? -1 : 1) * (HALF_WIDTH + 3 + random() * 14);
  const along = () => (random() - 0.5) * SEGMENT;
  CORAL_COLORS.forEach((color, colorIndex) => {
    instanced(`coral-${colorIndex % 2}`, () => (colorIndex % 2 ? new THREE.ConeGeometry(0.6, 2, 6) : new THREE.SphereGeometry(0.8, 8, 6)), color, 9, () => {
      const scale = 0.7 + random() * 0.9;
      matrix.makeScale(scale, scale * (1 + random()), scale).setPosition(side(), scale, along());
    });
  });
  instanced('seaweed', () => new THREE.BoxGeometry(0.25, 3, 0.1), 0x3fae4a, 24, () => {
    const scale = 0.6 + random() * 0.9;
    matrix.makeScale(1, scale, 1).setPosition((random() - 0.5) * 34, 1.5 * scale, along());
  });
  instanced('reef-rock', () => new THREE.SphereGeometry(1, 7, 5), 0x8d99a6, 8, () => {
    const scale = 0.6 + random() * 1.2;
    matrix.makeScale(scale * 1.3, scale * 0.7, scale).setPosition(side(), 0.2, along());
  });
  return group;
}

/** Buzo: el personaje acostado boca abajo con careta, snorkel y aletas. Mira hacia -Z. */
function buildDiver(kit, look, name = null) {
  const diver = new THREE.Group();
  const avatar = createAvatar(kit, look);
  const turn = new THREE.Group();
  turn.rotation.y = Math.PI;
  avatar.root.rotation.x = Math.PI / 2;
  avatar.root.position.z = -1.1;
  avatar.root.add(at(kit.box(0.56, 0.22, 0.08, 0x5ab0ff, { opacity: 0.8 }), 0, 2.02, 0.33));
  avatar.root.add(at(kit.box(0.08, 0.6, 0.08, 0xffd93d), 0.3, 2.3, 0.1));
  [-0.2, 0.2].forEach((x) => avatar.root.add(at(kit.box(0.3, 0.06, 0.6, 0xffd93d), x, 0.04, 0.2)));
  turn.add(avatar.root);
  diver.add(turn);
  let label = null;
  let bubble = null;
  if (name) {
    label = kit.label(name, { height: 0.4 });
    label.sprite.position.y = 1.1;
    bubble = kit.label(' ', { bubble: true, height: 0.5, background: '#fff6c9' });
    bubble.sprite.position.y = 1.7;
    bubble.sprite.visible = false;
    diver.add(label.sprite, bubble.sprite);
  }
  return { diver, avatar, bubble };
}

export function createBuceoRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: WATER, fogNear: 10, fogFar: 55 });
  // Rayos de luz que bajan desde la superficie.
  const rays = new THREE.Group();
  for (let index = 0; index < 8; index += 1) {
    const ray = at(kit.box(1.4, 20, 0.1, 0xffffff, { opacity: 0.08 }), (random() - 0.5) * 30, 10, -index * 6);
    ray.rotation.z = 0.3;
    rays.add(ray);
  }
  scene.add(rays);
  scene.add(at(kit.plane(200, 400, 0x7fd0ff, { opacity: 0.5, side: THREE.DoubleSide }), 0, 12, -150));

  const segments = Array.from({ length: SEGMENTS }, (_, index) => {
    const segment = buildReef(kit, random);
    segment.position.z = -index * SEGMENT;
    scene.add(segment);
    return segment;
  });

  const me = buildDiver(kit, look);
  scene.add(me.diver);
  const tita = buildTurtle(kit);
  const titaLabel = kit.label('🐢 Tita', { height: 0.45 });
  titaLabel.sprite.position.y = 1.2;
  const titaTalk = kit.label(' ', { bubble: true, height: 0.55, background: '#fff6c9' });
  titaTalk.sprite.position.y = 1.9;
  titaTalk.sprite.visible = false;
  tita.add(titaLabel.sprite, titaTalk.sprite);
  scene.add(tita);
  const buddies = mates.slice(0, 3).map((mate, index) => {
    const buddy = buildDiver(kit, mate.look, `${mate.emoji} ${mate.name}`);
    scene.add(buddy.diver);
    return { ...buddy, id: mate.id, offsetX: index === 0 ? -2.6 : index === 1 ? 2.6 : 0, offsetZ: index === 2 ? 3 : 1.5, timer: 0 };
  });

  // Peces que cruzan en bancos.
  const schools = Array.from({ length: 4 }, (_, index) => {
    const school = new THREE.Group();
    for (let fish = 0; fish < 6; fish += 1) {
      school.add(at(buildFish(kit, FISH_COLORS[(index + fish) % FISH_COLORS.length]), (random() - 0.5) * 3, (random() - 0.5) * 1.5, (random() - 0.5) * 3));
    }
    school.userData = { direction: index % 2 ? 1 : -1, speed: 1.5 + random() * 1.5, y: 2 + random() * 5 };
    school.rotation.y = school.userData.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(school);
    return school;
  });

  // Al final del camino: el galeón hundido y el cofre del tesoro.
  const wreckZ = -SWIM_LENGTH - 9;
  const wreck = buildGalleon(kit, { hull: 0x5a4632, sails: 0xc9d6df });
  wreck.position.set(7, -0.6, wreckZ - 4);
  wreck.rotation.set(0.12, 0.6, 0.3);
  const chest = buildChest(kit);
  chest.position.set(0, 0, wreckZ + 3);
  chest.scale.setScalar(1.4);
  scene.add(wreck, chest);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300);
  const items = [];
  const position = { x: 0, y: 3, z: 0 };
  let nextItemZ = -14;
  let time = 0;
  let steer = 0;
  let stingTimer = 0;
  let pearls = 0;
  let clams = 0;
  let stings = 0;
  let treasureTimer = -1;
  let message = '';
  let messageTimer = 0;
  let talkTimer = 0;

  function say(text, seconds = 1) {
    message = text;
    messageTimer = seconds;
  }

  function titaSays(text) {
    titaTalk.setText(text);
    titaTalk.sprite.visible = true;
    talkTimer = 1.5;
  }

  function spawnItem(z) {
    const roll = random();
    const x = (random() * 2 - 1) * (HALF_WIDTH - 1);
    let mesh;
    let kind;
    let y;
    if (roll < 0.5) {
      kind = 'pearl';
      y = 1.6 + random() * 5.5;
      mesh = new THREE.Group();
      mesh.add(kit.sphere(0.32, 0xffffff, 10, { emissive: 0x888899 }));
      const ring = kit.torus(0.55, 0.04, 0xbfe6ff, { emissive: 0x335577 });
      mesh.add(ring);
    } else if (roll < 0.72) {
      kind = 'clam';
      y = 0.2;
      mesh = buildClam(kit);
      mesh.scale.setScalar(1.3);
    } else {
      kind = 'jelly';
      y = 2 + random() * 5;
      mesh = buildJellyfish(kit, random() < 0.5 ? 0xff8ac4 : 0xb57bff);
    }
    mesh.position.set(x, y, z);
    scene.add(mesh);
    items.push({ kind, mesh, baseY: y, phase: random() * 6, done: false });
  }

  return {
    scene,
    camera,
    intro: 'Mantén 🫧 para subir y suéltalo para bajar; gira con ◀ ▶. ¡Recoge perlas!',
    controls: { action: { icon: '🫧', label: 'Subir' }, steer: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      const swimming = treasureTimer < 0;
      if (swimming) {
        stingTimer -= delta;
        const speed = SPEED * (stingTimer > 0 ? 0.5 : 1);
        position.z -= speed * delta;
        const wanted = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        steer += (wanted - steer) * Math.min(1, delta * 6);
        position.x = Math.max(-HALF_WIDTH, Math.min(HALF_WIDTH, position.x + steer * STEER_SPEED * delta));
        position.y = Math.max(MIN_Y, Math.min(MAX_Y, position.y + (input.action ? RISE_SPEED : -SINK_SPEED) * delta));
        if (input.actionPressed) sounds.bubble();
        if (-position.z >= SWIM_LENGTH) {
          treasureTimer = 0;
          chest.userData.lid.rotation.x = 0;
          sounds.achievement();
          say('💰 ¡Encontraste el tesoro hundido!', TREASURE_SECONDS);
          titaSays('🐢 ¡El tesoro! 🎉');
          announce('pearl');
        }
      } else {
        treasureTimer += delta;
        position.y += (2.4 - position.y) * Math.min(1, delta * 2);
        position.x += (0 - position.x) * Math.min(1, delta * 2);
        chest.userData.lid.rotation.x = -Math.min(1.3, treasureTimer * 1.5);
        if (treasureTimer >= TREASURE_SECONDS) {
          this.done = true;
          return;
        }
      }
      me.diver.position.set(position.x, position.y, position.z);
      me.diver.rotation.z = -steer * 0.3;
      me.diver.rotation.x = swimming ? (input.action ? 0.25 : -0.12) : 0;
      me.avatar.update(delta, { speed: swimming ? 3 : 1 });

      tita.position.set(position.x + 2.8, position.y + Math.sin(time * 1.5) * 0.4, position.z - 2.5);
      tita.rotation.z = Math.sin(time * 2) * 0.1;
      talkTimer -= delta;
      if (talkTimer <= 0) titaTalk.sprite.visible = false;
      buddies.forEach((buddy, index) => {
        buddy.diver.position.set(position.x + buddy.offsetX, Math.max(MIN_Y, position.y + Math.sin(time * 1.3 + index) * 0.5), position.z + buddy.offsetZ);
        buddy.avatar.update(delta, { speed: 3 });
        if (buddy.timer > 0) {
          buddy.timer -= delta;
          if (buddy.timer <= 0) buddy.bubble.sprite.visible = false;
        }
      });

      while (swimming && nextItemZ > position.z - 60 && -nextItemZ < SWIM_LENGTH - 6) {
        spawnItem(nextItemZ);
        nextItemZ -= ITEM_GAP * (0.7 + random() * 0.6);
      }
      segments.forEach((segment) => {
        if (segment.position.z - SEGMENT / 2 > position.z + 15) segment.position.z -= SEGMENT * SEGMENTS;
      });
      rays.position.z = position.z;
      schools.forEach((school) => {
        const { direction, speed, y } = school.userData;
        school.position.x += direction * speed * delta;
        if (Math.abs(school.position.x) > 22 || school.position.z > position.z + 10) {
          school.position.set(-direction * 20, y, position.z - 15 - random() * 25);
        }
      });

      items.forEach((item) => {
        if (item.done) return;
        const { mesh } = item;
        if (item.kind === 'pearl') mesh.rotation.y += delta * 2;
        if (item.kind === 'jelly') mesh.position.y = item.baseY + Math.sin(time * 1.4 + item.phase) * 0.6;
        if (mesh.position.z > position.z + 12) {
          scene.remove(mesh);
          item.done = true;
          return;
        }
        const reach = item.kind === 'clam' ? PICK_RADIUS + 0.4 : PICK_RADIUS;
        if (Math.hypot(mesh.position.x - position.x, mesh.position.y - position.y, mesh.position.z - position.z) > reach) return;
        if (item.kind === 'jelly') {
          if (stingTimer > 0) return;
          stings += 1;
          stingTimer = STING_SECONDS;
          sounds.bump();
          say('💗 ¡Ay, una medusa! ¡Esquívalas!');
          return;
        }
        item.done = true;
        scene.remove(mesh);
        sounds.coin();
        if (item.kind === 'pearl') {
          pearls += 1;
          say('✨ ¡Una perla!', 0.7);
        } else {
          clams += 1;
          say('🦪 ¡Perla de almeja! +2', 0.9);
        }
        if ((pearls + clams) % 4 === 0) {
          titaSays(pickLine(TITA_LINES, random));
          announce('pearl');
        }
      });
      for (let index = items.length - 1; index >= 0; index -= 1) if (items[index].done) items.splice(index, 1);

      if (swimming) {
        camera.position.set(position.x * 0.7, position.y + 2.2, position.z + 5.8);
        camera.lookAt(position.x * 0.85, position.y - 0.2, position.z - 6);
      } else {
        // Al final, la cámara rodea el cofre.
        const angle = treasureTimer * 0.5;
        camera.position.set(Math.sin(angle) * 6, 4, chest.position.z + Math.cos(angle) * 6);
        camera.lookAt(chest.position.x, 1.2, chest.position.z);
      }
    },

    onMateSay(id, kind) {
      const buddy = buddies.find((other) => other.id === id);
      if (!buddy || kind !== 'pearl') return;
      buddy.bubble.setText(SAYINGS.pearl.text);
      buddy.bubble.sprite.visible = true;
      buddy.timer = 1.3;
    },

    status: () =>
      `✨ Perlas: ${pearls} · 🦪 ${clams} · 🗺️ ${Math.min(100, Math.round((-position.z / SWIM_LENGTH) * 100))} %`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      const points = pearls + clams * 2;
      return {
        coins: Math.min(22, 6 + Math.floor(points / 2)),
        emoji: '🤿',
        title: stings === 0 ? '¡Sirena del arrecife! 🧜‍♀️' : '¡Encontraste el tesoro!',
        stats: [
          { label: 'Perlas', value: pearls },
          { label: 'Almejas', value: clams },
          { label: 'Medusas', value: stings },
        ],
      };
    },

    dispose() {
      scene.traverse((object) => object.isInstancedMesh && object.dispose());
    },
  };
}
