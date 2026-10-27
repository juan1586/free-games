/**
 * Paseo manejando (El Jipe en el cafetal, el tractor en el maizal, la lancha en el mar): se gira con
 * ◀ ▶ para recoger cosas del camino y esquivar charcos, barro o medusas; con el pito 📯 los animales
 * (gallinas, pelícanos) se quitan del camino. Cada atracción le pasa su tema (vehículo, asientos,
 * decorado, qué se recoge y textos).
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createMateRider, createRider, mateReacts, pickLine } from '../riders.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights, buildChicken, buildClouds, buildMountains } from '../props.js';

const DURATION = 40;
const SPEED = 15;
const ROAD_HALF = 4;
const STEER_SPEED = 7;
const SEGMENT = 60;
const SEGMENTS = 4;
const ITEM_GAP = 11;
const HONK_RANGE = 32;
const SLOW_SECONDS = 1;

/** Gallinas: el animal del camino si el tema no dice otro. */
const CHICKEN = {
  build: (kit) => buildChicken(kit),
  icon: '🐔',
  stat: 'Gallinas',
  fled: '🐔 ¡Cocorocó! +1',
  bumped: '🐔 ¡Uy! ¡Usa el pito!',
};

/**
 * theme = { vehicle(kit), seats: { driver, copilot, back } ({ x, z, seatY, scale }), ground, road, line,
 *   sky?, bob?, scenery(kit, positions), pickup: { build(kit), stat, icon, lines, saying },
 *   puddle: { color, build?(kit), text, stat, lines }, critter?: { build(kit), icon, stat, fled, bumped },
 *   companion?: { build(kit), place(object, { x, z, time }) } (un animal que acompaña, como el delfín rosado),
 *   horn?: { icon, label }, intro, emoji, titles: { clean, normal } }
 */
export function createDriveRide({ kit, look, random, announce, mates }, theme) {
  const critter = theme.critter ?? CHICKEN;
  const saying = theme.pickup.saying ?? 'yum';
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: theme.sky, fogNear: 60, fogFar: 170 });
  const ground = at(kit.disc(400, theme.ground), 0, 0, 0);
  scene.add(ground);
  const mountains = buildMountains(kit, random, { count: 14, minDistance: 140, maxDistance: 180 });
  scene.add(mountains, buildClouds(kit, random, 8));

  // Tramos de camino con cafetal a los lados que se van reciclando.
  const segments = Array.from({ length: SEGMENTS }, (_, index) => {
    const segment = new THREE.Group();
    segment.add(at(kit.plane(ROAD_HALF * 2 + 1.5, SEGMENT, theme.road), 0, 0.02, 0));
    segment.add(at(kit.plane(0.4, SEGMENT, theme.line), 0, 0.03, 0));
    const bushes = [];
    for (let z = -SEGMENT / 2; z < SEGMENT / 2; z += 3.2) {
      [-1, 1].forEach((side) => {
        for (let row = 0; row < 3; row += 1) {
          bushes.push({ x: side * (ROAD_HALF + 3 + row * 3 + random()), z: z + random(), scale: 0.8 + random() * 0.4 });
        }
      });
    }
    segment.add(theme.scenery(kit, bushes));
    segment.position.z = -index * SEGMENT;
    scene.add(segment);
    return segment;
  });

  const jeep = theme.vehicle(kit);
  jeep.rotation.y = Math.PI;
  const seat = (rider, { x, z }) => {
    rider.root.position.x = x;
    rider.root.position.z = z;
    jeep.add(rider.root);
    return rider;
  };
  const { driver: driverSeat, copilot: copilotSeat, back: backSeat } = theme.seats;
  seat(createRider(kit, random, { scale: driverSeat.scale, seatY: driverSeat.seatY, look }), driverSeat);
  // Copiloto: celebra lo que se recoge y se ríe de los charcos. Si va una amiga, ella es la copiloto (y otra atrás).
  const mateRiders = new Map();
  const [firstMate, secondMate] = mates;
  const copilotOptions = { scale: copilotSeat.scale, seatY: copilotSeat.seatY };
  const copilot = seat(firstMate ? createMateRider(kit, random, firstMate, copilotOptions) : createRider(kit, random, copilotOptions), copilotSeat);
  if (firstMate) mateRiders.set(firstMate.id, copilot);
  if (secondMate) {
    mateRiders.set(secondMate.id, seat(createMateRider(kit, random, secondMate, { scale: backSeat.scale, seatY: backSeat.seatY }), backSeat));
  }
  scene.add(jeep);
  const companion = theme.companion?.build(kit);
  if (companion) scene.add(companion);

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
      mesh = theme.pickup.build(kit);
      mesh.position.y = 1;
    } else if (roll < 0.85) {
      kind = 'puddle';
      mesh = theme.puddle.build ? theme.puddle.build(kit) : kit.disc(1.3, theme.puddle.color, { opacity: 0.85 });
      mesh.position.y = 0.05;
    } else {
      kind = 'chicken';
      mesh = critter.build(kit);
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
    intro: theme.intro,
    controls: { action: theme.horn ?? { icon: '📯', label: 'Pito' }, steer: true },
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
      mateRiders.forEach((rider) => rider !== copilot && rider.update(delta));
      const speed = SPEED * (slowTimer > 0 ? 0.45 : 1);
      distance += speed * delta;
      const z = -distance;

      const wanted = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      steer += (wanted - steer) * Math.min(1, delta * 6);
      x = Math.max(-ROAD_HALF + 1, Math.min(ROAD_HALF - 1, x + steer * STEER_SPEED * delta));
      const bob = theme.bob ?? 0;
      jeep.position.set(x, Math.abs(Math.sin(time * 18)) * 0.05 + Math.sin(time * 3) * bob, z);
      if (bob) jeep.rotation.x = Math.sin(time * 3 + 1) * bob * 0.2;
      jeep.rotation.z = steer * 0.05;
      jeep.rotation.y = Math.PI - steer * 0.25;
      if (companion) theme.companion.place(companion, { x, z, time });

      if (input.actionPressed) {
        sounds.honk();
        items.forEach((item) => {
          if (item.kind === 'chicken' && !item.flee && item.mesh.position.z < z + 2 && item.mesh.position.z > z - HONK_RANGE) {
            item.flee = item.mesh.position.x >= x ? 1 : -1;
            chickens += 1;
            say(critter.fled);
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
          if (critter.flies) position.y += delta * 4;
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
          if (!firstMate && random() < 0.35) copilot.say(pickLine(theme.pickup.lines, random), 1);
          if (beans % 3 === 0) announce(saying);
          removeItem(item);
        } else if (item.kind === 'puddle') {
          splashes += 1;
          slowTimer = SLOW_SECONDS;
          sounds.splash();
          say(theme.puddle.text);
          copilot.setCheer(true);
          copilot.say(pickLine(theme.puddle.lines, random), 1.2);
          item.hit = true;
        } else {
          // La gallina se asusta y se va; el jeep frena un momento.
          item.flee = position.x >= x ? 1 : -1;
          slowTimer = SLOW_SECONDS;
          sounds.bump();
          say(critter.bumped);
        }
      });
      for (let index = items.length - 1; index >= 0; index -= 1) if (items[index].done) items.splice(index, 1);

      camera.position.set(x * 0.6, 4.6, z + 8.5);
      camera.lookAt(x * 0.8, 1.2, z - 9);
    },

    onMateSay(id, kind) {
      const rider = mateRiders.get(id);
      if (rider && kind === saying) mateReacts(rider, SAYINGS[saying].text, { cheer: true });
    },

    status: () => `${theme.pickup.icon} ${theme.pickup.stat}: ${beans} · ${critter.icon} ${chickens} · ⏱️ ${Math.max(0, Math.ceil(DURATION - time))} s`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      return {
        coins: Math.floor(beans / 2) + chickens * 2 + 2,
        emoji: theme.emoji,
        title: splashes === 0 ? theme.titles.clean : theme.titles.normal,
        stats: [
          { label: theme.pickup.stat, value: beans },
          { label: critter.stat, value: chickens },
          { label: theme.puddle.stat, value: splashes },
        ],
      };
    },

    dispose() {
      scene.traverse((object) => object.isInstancedMesh && object.dispose());
    },
  };
}
