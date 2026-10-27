/**
 * El Jipe: manejar un Willys por un camino entre cafetales. Se gira con ◀ ▶ para recoger granos
 * de café y esquivar charcos; con el pito 📯 las gallinas se quitan del camino.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { createRider, pickLine } from '../riders.js';
import { addSkyAndLights, buildClouds, buildCoffeeBushes, buildJeep, buildMountains } from '../props.js';

const DURATION = 40;
const SPEED = 15;
const ROAD_HALF = 4;
const STEER_SPEED = 7;
const SEGMENT = 60;
const SEGMENTS = 4;
const ITEM_GAP = 11;
const HONK_RANGE = 32;
const SLOW_SECONDS = 1;
const BEAN_LINES = ['¡Bien! ☕', '¡Otro grano! 🤩', '¡Eso! 🙌'];
const SPLASH_LINES = ['¡Me mojé! 💦', '¡Uyyy, charco! 😆'];

export function createJipeRide({ kit, look, random }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { fogNear: 60, fogFar: 170 });
  const ground = at(kit.disc(400, 0x86cf6a), 0, 0, 0);
  scene.add(ground);
  const mountains = buildMountains(kit, random, { count: 14, minDistance: 140, maxDistance: 180 });
  scene.add(mountains, buildClouds(kit, random, 8));

  // Tramos de camino con cafetal a los lados que se van reciclando.
  const segments = Array.from({ length: SEGMENTS }, (_, index) => {
    const segment = new THREE.Group();
    segment.add(at(kit.plane(ROAD_HALF * 2 + 1.5, SEGMENT, 0xc9a26b), 0, 0.02, 0));
    segment.add(at(kit.plane(0.4, SEGMENT, 0xf6e4bd), 0, 0.03, 0));
    const bushes = [];
    for (let z = -SEGMENT / 2; z < SEGMENT / 2; z += 3.2) {
      [-1, 1].forEach((side) => {
        for (let row = 0; row < 3; row += 1) {
          bushes.push({ x: side * (ROAD_HALF + 3 + row * 3 + random()), z: z + random(), scale: 0.8 + random() * 0.4 });
        }
      });
    }
    segment.add(buildCoffeeBushes(kit, bushes));
    segment.position.z = -index * SEGMENT;
    scene.add(segment);
    return segment;
  });

  const jeep = buildJeep(kit, 0x3fae6a);
  jeep.rotation.y = Math.PI;
  const driver = createAvatar(kit, look);
  driver.root.position.set(-0.45, 0.75, -0.45);
  driver.root.scale.setScalar(0.75);
  driver.update(0, { seated: true });
  jeep.add(driver.root);
  // Copiloto: celebra los granos y se ríe de los charcos.
  const copilot = createRider(kit, random, { scale: 0.75, seatY: 1.35 });
  copilot.root.position.set(0.45, copilot.root.position.y, -0.45);
  jeep.add(copilot.root);
  scene.add(jeep);

  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 500);
  const items = [];
  let nextItemZ = -30;
  let time = 0;
  let distance = 0;
  let x = 0;
  let steer = 0;
  let slowTimer = 0;
  let beans = 0;
  let chickens = 0;
  let splashes = 0;
  let message = '';
  let messageTimer = 0;

  function say(text) {
    message = text;
    messageTimer = 1;
  }

  function spawnItem(z) {
    const roll = random();
    const itemX = (random() * 2 - 1) * (ROAD_HALF - 0.8);
    let mesh;
    let kind;
    if (roll < 0.62) {
      kind = 'bean';
      mesh = new THREE.Group();
      const bean = kit.sphere(0.45, 0xb5371f, 10, { emissive: 0x301000 });
      bean.scale.set(0.8, 1, 0.6);
      mesh.add(bean, at(kit.box(0.06, 0.6, 0.02, 0x5a1a0a), 0, 0, 0.27));
      mesh.position.y = 1;
    } else if (roll < 0.85) {
      kind = 'puddle';
      mesh = kit.disc(1.3, 0x5ab0ff, { opacity: 0.8 });
      mesh.position.y = 0.05;
    } else {
      kind = 'chicken';
      mesh = new THREE.Group();
      mesh.add(at(kit.box(0.7, 0.6, 0.9, 0xffffff), 0, 0.6, 0));
      mesh.add(at(kit.box(0.4, 0.45, 0.4, 0xffffff), 0, 1.1, 0.4));
      mesh.add(at(kit.box(0.12, 0.2, 0.12, 0xff5f5f), 0, 1.42, 0.4));
      mesh.add(at(kit.box(0.14, 0.1, 0.2, 0xffb000), 0, 1.1, 0.68));
      mesh.add(at(kit.box(0.08, 0.3, 0.08, 0xffb000), -0.15, 0.15, 0));
      mesh.add(at(kit.box(0.08, 0.3, 0.08, 0xffb000), 0.15, 0.15, 0));
      mesh.rotation.y = Math.PI / 2;
    }
    mesh.position.x = itemX;
    mesh.position.z = z;
    scene.add(mesh);
    items.push({ kind, mesh, done: false, hit: false, flee: 0 });
  }

  function removeItem(item) {
    scene.remove(item.mesh);
    item.done = true;
  }

  return {
    scene,
    camera,
    intro: 'Gira con ◀ ▶, recoge granos ☕ y pita 📯 a las gallinas',
    controls: { action: { icon: '📯', label: 'Pito' }, steer: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      if (time >= DURATION) {
        this.done = true;
        return;
      }
      slowTimer -= delta;
      if (slowTimer <= 0) copilot.setCheer(false);
      copilot.update(delta);
      const speed = SPEED * (slowTimer > 0 ? 0.45 : 1);
      distance += speed * delta;
      const z = -distance;

      const wanted = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      steer += (wanted - steer) * Math.min(1, delta * 6);
      x = Math.max(-ROAD_HALF + 1, Math.min(ROAD_HALF - 1, x + steer * STEER_SPEED * delta));
      jeep.position.set(x, Math.abs(Math.sin(time * 18)) * 0.05, z);
      jeep.rotation.z = steer * 0.05;
      jeep.rotation.y = Math.PI - steer * 0.25;

      if (input.actionPressed) {
        sounds.honk();
        items.forEach((item) => {
          if (item.kind === 'chicken' && !item.flee && item.mesh.position.z < z + 2 && item.mesh.position.z > z - HONK_RANGE) {
            item.flee = item.mesh.position.x >= x ? 1 : -1;
            chickens += 1;
            say('🐔 ¡Cocorocó! +1');
          }
        });
      }

      while (nextItemZ > z - 120) {
        spawnItem(nextItemZ);
        nextItemZ -= ITEM_GAP * (0.7 + random() * 0.6);
      }
      segments.forEach((segment) => {
        if (segment.position.z - SEGMENT / 2 > z + 20) segment.position.z -= SEGMENT * SEGMENTS;
      });
      ground.position.z = z;
      mountains.position.z = z;

      items.forEach((item) => {
        if (item.done) return;
        const { position } = item.mesh;
        if (item.kind === 'bean') item.mesh.rotation.y += delta * 3;
        if (item.flee) {
          position.x += item.flee * delta * 9;
          item.mesh.rotation.y = item.flee > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (Math.abs(position.x) > ROAD_HALF + 6) removeItem(item);
          return;
        }
        if (position.z > z + 15) {
          removeItem(item);
          return;
        }
        if (item.hit) return;
        const near = Math.abs(position.z - z) < 1.8 && Math.abs(position.x - x) < (item.kind === 'puddle' ? 1.9 : 1.4);
        if (!near) return;
        if (item.kind === 'bean') {
          beans += 1;
          sounds.coin();
          if (random() < 0.35) copilot.say(pickLine(BEAN_LINES, random), 1);
          removeItem(item);
        } else if (item.kind === 'puddle') {
          splashes += 1;
          slowTimer = SLOW_SECONDS;
          sounds.splash();
          say('💦 ¡Splash!');
          copilot.setCheer(true);
          copilot.say(pickLine(SPLASH_LINES, random), 1.2);
          item.hit = true;
        } else {
          // La gallina se asusta y se va; el jeep frena un momento.
          item.flee = position.x >= x ? 1 : -1;
          slowTimer = SLOW_SECONDS;
          sounds.bump();
          say('🐔 ¡Uy! ¡Usa el pito!');
        }
      });
      for (let index = items.length - 1; index >= 0; index -= 1) if (items[index].done) items.splice(index, 1);

      camera.position.set(x * 0.6, 4.6, z + 8.5);
      camera.lookAt(x * 0.8, 1.2, z - 9);
    },

    status: () => `☕ Granos: ${beans} · 🐔 ${chickens} · ⏱️ ${Math.max(0, Math.ceil(DURATION - time))} s`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      return {
        coins: Math.floor(beans / 2) + chickens * 2 + 2,
        emoji: '🚙',
        title: splashes === 0 ? '¡Manejas como una experta!' : '¡Qué paseo!',
        stats: [
          { label: 'Granos de café', value: beans },
          { label: 'Gallinas', value: chickens },
          { label: 'Charcos', value: splashes },
        ],
      };
    },

    dispose() {
      scene.traverse((object) => object.isInstancedMesh && object.dispose());
    },
  };
}
