/**
 * La Piñata Gigante (Castillo de Dulces): la piñata cuelga y se mece de lado a lado. Se pulsa 🏏 cuando
 * pasa por el centro (el círculo del suelo se ilumina): fallar solo hace «¡uy!». Con 3 golpes buenos se
 * rompe y caen dulces: con ◀ ▶ se corre a recogerlos (también los que ya están en el suelo). Luego
 * baja otra piñata que se mece más rápido. Con amigas, los dulces caen igual para todas (semilla común).
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { createStandingMate } from '../riders.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights } from '../props.js';
import { CANDY_COLORS, buildCandyCane, buildCandyTower, buildCupcake, buildLollipop, buildPinata } from '../propsCandy.js';

const PINATAS = ['star', 'donkey', 'candy'];
const HITS_TO_BREAK = 3;
const TIME_LIMIT = 80;
const FINALE_SECONDS = 3;
const PIVOT = { y: 4.6, z: -1.6 };
/** Distancia del punto de donde cuelga al centro de la piñata. */
const HANG = 2;
const SWING_ANGLE = 0.7;
const FIRST_SWING_SPEED = 1.8;
const SWING_SPEED_STEP = 0.4;
/** Qué tan cerca del centro (m) tiene que pasar para que el golpe valga. */
const HIT_ZONE = 0.55;
const SWING_COOLDOWN = 0.45;
const CANDIES_PER_PINATA = 12;
const GOLDEN_PER_PINATA = 2;
const GOLDEN_VALUE = 3;
const COLLECT_SECONDS = 7;
const GRAVITY = 9;
const WALK_SPEED = 4.5;
const MAX_X = 3;
const REACH = 0.8;
const DROP_IN_SECONDS = 1.2;
const CHEERS = ['💥 ¡Pum!', '🏏 ¡Bien dado!', '⭐ ¡Justo!'];

export function createPinataRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: 0xffd9ef, fogNear: 30, fogFar: 90 });
  scene.add(at(kit.disc(80, 0xbdf0d4), 0, 0, 0));
  scene.add(at(kit.disc(5.5, 0xfff6c9), 0, 0.02, -0.6));

  // El patio de la fiesta: postes, viga con banderines, mesas con cupcakes, chupetines y el castillo al fondo.
  [-4.2, 4.2].forEach((x) => scene.add(at(kit.cyl(0.18, 0.18, PIVOT.y + 0.4, 0xffffff, 8), x, (PIVOT.y + 0.4) / 2, PIVOT.z)));
  scene.add(at(kit.box(8.8, 0.25, 0.25, 0xb57bff), 0, PIVOT.y + 0.3, PIVOT.z));
  for (let flag = 0; flag < 11; flag += 1) {
    const cone = at(kit.cone(0.28, 0.55, CANDY_COLORS[flag % CANDY_COLORS.length], 3), -4 + flag * 0.8, PIVOT.y - 0.05, PIVOT.z);
    cone.rotation.x = Math.PI;
    scene.add(cone);
  }
  [-1, 1].forEach((side) => {
    scene.add(at(kit.box(2.4, 0.15, 1.2, 0xffffff), side * 6.5, 1, -3));
    scene.add(at(kit.box(0.15, 1, 0.15, 0xffffff), side * 6.5, 0.5, -3));
    [-0.6, 0.6].forEach((dx, index) => scene.add(at(buildCupcake(kit, { scale: 0.22, cream: CANDY_COLORS[index + (side > 0 ? 2 : 0)] }), side * 6.5 + dx, 1.07, -3)));
  });
  for (let index = 0; index < 10; index += 1) {
    const x = (index - 4.5) * 3.2 + (random() - 0.5);
    scene.add(at(buildLollipop(kit, { color: CANDY_COLORS[index % CANDY_COLORS.length], height: 3 + random() * 2 }), x, 0, -9 - random() * 3));
  }
  [-1, 1].forEach((side) => [2, -1].forEach((z) => scene.add(at(buildCandyCane(kit), side * 6, 0, z))));
  [[-8, 12], [0, 18], [8, 12]].forEach(([x, height]) => scene.add(at(buildCandyTower(kit, { height, radius: 2.2 }), x, 0, -30)));

  // El círculo del suelo: se ilumina cuando la piñata está justo en el centro.
  const zone = at(kit.disc(0.9, 0xffd93d), 0, 0.04, PIVOT.z);
  const zoneLit = at(kit.disc(0.9, 0xffffff, { emissive: 0xffd93d }), 0, 0.05, PIVOT.z);
  zoneLit.visible = false;
  scene.add(zone, zoneLit);

  const pivot = at(new THREE.Group(), 0, PIVOT.y, PIVOT.z);
  scene.add(pivot);
  pivot.add(at(kit.box(0.04, 1, 0.04, 0xf3e1b5), 0, -0.5, 0));
  let pinata = null;

  const me = createAvatar(kit, look);
  me.root.rotation.y = Math.PI;
  scene.add(me.root, me.shadow);
  // El palo: gira desde el hombro derecho (en el personaje, el frente es +Z).
  const stick = at(new THREE.Group(), 0.62, 1.55, 0);
  stick.add(at(kit.cyl(0.07, 0.07, 1.8, 0xd9a066, 6), 0, 0.9, 0));
  stick.add(at(kit.cyl(0.075, 0.075, 0.3, 0xff5fa2, 6), 0, 1.6, 0));
  me.root.add(stick);

  const friends = mates.slice(0, 3).map((mate, index) => {
    const friend = createStandingMate(kit, mate);
    friend.root.position.set([-2.4, 2.4, -3.4][index], 0, 1.4);
    friend.root.rotation.y = Math.PI;
    scene.add(friend.root);
    return friend;
  });

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  // Desde arriba, para que la jugadora no tape la piñata.
  camera.position.set(0, 4, 6);
  camera.lookAt(0, 1.9, PIVOT.z);

  let state = 'drop';
  let stateTimer = DROP_IN_SECONDS;
  let round = 0;
  let hits = 0;
  let misses = 0;
  let collected = 0;
  let broken = 0;
  let time = 0;
  let swingTime = 0;
  let swingSpeed = FIRST_SWING_SPEED;
  let swingCooldown = 0;
  let shake = 0;
  let cheerTimer = 0;
  let message = '';
  let messageTimer = 0;
  let candies = [];
  let pieces = [];
  const bodyPosition = new THREE.Vector3();

  function say(text, seconds = 1.2) {
    message = text;
    messageTimer = seconds;
  }

  function hangPinata() {
    if (pinata) pivot.remove(pinata);
    pinata = at(buildPinata(kit, PINATAS[round % PINATAS.length]), 0, -1, 0);
    pinata.scale.setScalar(1.3);
    pivot.add(pinata);
    pivot.visible = true;
    hits = 0;
    swingTime = 0;
    state = 'drop';
    stateTimer = DROP_IN_SECONDS;
  }

  function finish() {
    state = 'finale';
    stateTimer = FINALE_SECONDS;
    sounds.achievement();
    say(broken >= PINATAS.length ? '🪅 ¡Rompiste todas las piñatas!' : `🍬 ¡Recogiste ${collected} dulces!`, FINALE_SECONDS);
  }

  function breakPinata() {
    broken += 1;
    sounds.crunch();
    announce('candy');
    say('🪅 ¡Se rompió! ¡Recoge los dulces!', 1.6);
    cheerTimer = 1.2;
    pinata.userData.body.getWorldPosition(bodyPosition);
    pivot.visible = false;
    // Pedacitos de piñata que salen volando.
    pieces = Array.from({ length: 8 }, (_, index) => {
      const piece = at(kit.box(0.3, 0.3, 0.08, CANDY_COLORS[index % CANDY_COLORS.length]), bodyPosition.x, bodyPosition.y, bodyPosition.z);
      scene.add(piece);
      const angle = (index / 8) * Math.PI * 2;
      return { mesh: piece, vx: Math.cos(angle) * 3, vy: 2 + Math.sin(angle) * 2, life: 1.2 };
    });
    candies = Array.from({ length: CANDIES_PER_PINATA + GOLDEN_PER_PINATA }, (_, index) => {
      const golden = index >= CANDIES_PER_PINATA;
      const mesh = new THREE.Group();
      if (golden) {
        mesh.add(kit.sphere(0.22, 0xffd21f, 10, { emissive: 0x6a4a00 }));
      } else {
        const color = CANDY_COLORS[index % CANDY_COLORS.length];
        mesh.add(kit.sphere(0.17, color, 8));
        [-1, 1].forEach((side) => {
          const wrap = at(kit.cone(0.12, 0.18, color, 6), side * 0.22, 0, 0);
          wrap.rotation.z = side * Math.PI / 2;
          mesh.add(wrap);
        });
      }
      mesh.position.copy(bodyPosition);
      mesh.position.z = PIVOT.z + 0.8 + random() * 0.8;
      scene.add(mesh);
      return { mesh, golden, vx: (random() - 0.5) * 5, vy: 2 + random() * 3, landed: false };
    });
    state = 'collect';
    stateTimer = COLLECT_SECONDS;
  }

  function swingStick() {
    swingCooldown = SWING_COOLDOWN;
    shake = 0;
    const x = Math.sin(Math.sin(swingTime * swingSpeed) * SWING_ANGLE) * HANG;
    if (Math.abs(x) < HIT_ZONE) {
      hits += 1;
      sounds.whack();
      shake = 0.4;
      if (hits >= HITS_TO_BREAK) breakPinata();
      else say(CHEERS[hits % CHEERS.length], 0.8);
    } else {
      misses += 1;
      sounds.flip();
      say('🙈 ¡Uy! Cuando pase por el centro', 1);
    }
  }

  function clearCandies() {
    candies.forEach(({ mesh }) => scene.remove(mesh));
    candies = [];
  }

  hangPinata();

  return {
    scene,
    camera,
    intro: 'Pulsa 🏏 cuando la piñata pase por el centro. Luego recoge los dulces con ◀ ▶',
    controls: { action: { icon: '🏏', label: 'Golpear' }, steer: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      stateTimer -= delta;
      swingCooldown -= delta;
      cheerTimer -= delta;
      if (state !== 'finale' && time >= TIME_LIMIT) finish();

      if (state === 'drop') {
        // La piñata baja desde arriba.
        pivot.position.y = PIVOT.y + Math.max(0, stateTimer / DROP_IN_SECONDS) * 4;
        if (stateTimer <= 0) {
          pivot.position.y = PIVOT.y;
          state = 'swing';
        }
      } else if (state === 'swing') {
        swingTime += delta;
        if (input.actionPressed && swingCooldown <= 0) swingStick();
      } else if (state === 'collect') {
        const allTaken = candies.every((candy) => candy.taken);
        if (stateTimer <= 0 || allTaken) {
          clearCandies();
          round += 1;
          if (round >= PINATAS.length) {
            finish();
          } else {
            swingSpeed += SWING_SPEED_STEP;
            say('🪅 ¡Otra piñata! Esta va más rápido', 1.4);
            hangPinata();
          }
        }
      } else if (state === 'finale' && stateTimer <= 0) {
        this.done = true;
        return;
      }

      // Caminar (solo cuando hay dulces que recoger).
      const walk = state === 'collect' ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
      me.root.position.x = Math.max(-MAX_X, Math.min(MAX_X, me.root.position.x + walk * WALK_SPEED * delta));
      if (state !== 'collect') me.root.position.x *= Math.max(0, 1 - delta * 3);
      me.shadow.position.x = me.root.position.x;
      me.update(delta, { speed: walk ? WALK_SPEED : 0, airborne: cheerTimer > 0 || state === 'finale' });
      stick.visible = state !== 'collect';
      // El palo: arriba esperando, abajo justo después de golpear.
      const swingProgress = Math.max(0, swingCooldown / SWING_COOLDOWN);
      stick.rotation.x = -0.5 + Math.sin(swingProgress * Math.PI) * 2.2;

      // La piñata se mece (y tiembla si le dieron).
      shake = Math.max(0, shake - delta);
      const angle = Math.sin(swingTime * swingSpeed) * SWING_ANGLE;
      pivot.rotation.z = angle;
      if (pinata) {
        pinata.rotation.y = Math.sin(time * 0.8) * 0.4 + Math.sin(shake * 40) * shake;
        pinata.scale.setScalar(1.3 - hits * 0.06 + shake * 0.3);
      }
      const inZone = state === 'swing' && Math.abs(Math.sin(angle) * HANG) < HIT_ZONE;
      zoneLit.visible = inZone;

      pieces = pieces.filter((piece) => {
        piece.life -= delta;
        piece.vy -= GRAVITY * delta;
        piece.mesh.position.x += piece.vx * delta;
        piece.mesh.position.y = Math.max(0.05, piece.mesh.position.y + piece.vy * delta);
        piece.mesh.rotation.z += delta * 8;
        if (piece.life > 0) return true;
        scene.remove(piece.mesh);
        return false;
      });

      candies.forEach((candy) => {
        if (candy.taken) return;
        if (!candy.landed) {
          candy.vy -= GRAVITY * delta;
          candy.mesh.position.x = Math.max(-MAX_X, Math.min(MAX_X, candy.mesh.position.x + candy.vx * delta));
          candy.mesh.position.y += candy.vy * delta;
          candy.mesh.rotation.z += delta * 6;
          if (candy.mesh.position.y <= 0.2) {
            candy.mesh.position.y = 0.2;
            candy.landed = true;
          }
        }
        if (Math.abs(candy.mesh.position.x - me.root.position.x) < REACH && candy.mesh.position.y < 2) {
          candy.taken = true;
          candy.mesh.visible = false;
          collected += candy.golden ? GOLDEN_VALUE : 1;
          if (candy.golden) sounds.coin();
          else sounds.pop();
        }
      });

      friends.forEach((friend) => friend.update(delta, { airborne: state === 'finale' }));
    },

    onMateSay(id, kind) {
      const friend = friends.find((other) => other.id === id);
      if (friend && kind === 'candy') friend.say(SAYINGS.candy.text);
    },

    status: () =>
      `🪅 Piñata ${Math.min(round + 1, PINATAS.length)} de ${PINATAS.length} · 💥 ${hits}/${HITS_TO_BREAK} · 🍬 ${collected} · ⏱️ ${Math.max(0, Math.ceil(TIME_LIMIT - time))} s`,
    prompt() {
      if (messageTimer > 0) return message;
      if (state === 'swing') return zoneLit.visible ? '🏏 ¡Ahora!' : '';
      if (state === 'collect') return '🍬 ◀ ▶ ¡Recógelos!';
      return '';
    },

    result() {
      return {
        coins: Math.min(24, 4 + collected),
        emoji: '🪅',
        title: broken >= PINATAS.length ? '¡Qué fiesta! 🎉' : '¡Cuántos dulces!',
        stats: [
          { label: 'Piñatas rotas', value: `${broken}/${PINATAS.length}` },
          { label: 'Dulces', value: collected },
          { label: 'Golpes fallados', value: misses },
        ],
      };
    },

    dispose() {},
  };
}
