/**
 * Galeón Pirata (Playa de Cartagena): en la proa del galeón, se apunta el cañón con ◀ ▶ (a los lados)
 * y ▲ ▼ (más lejos o más cerca), o arrastrando; un aro rojo en el agua marca dónde caerá la bala.
 * Se dispara 💣 a los barriles, a los barcos piratas y a los cofres que flotan. ¡A los delfines no!
 * La jugadora, la capitana Coral y las amigas van en la plataforma que gira con el cañón.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { at } from '../kit.js';
import { createAvatar } from '../avatar.js';
import { createMateRider, mateReacts, pickLine } from '../riders.js';
import { SAYINGS } from '../race.js';
import { addSkyAndLights, buildClouds } from '../props.js';
import { SEA_COLOR, SAND_COLOR, buildBarrel, buildChest, buildGalleon, buildPalm } from '../propsBeach.js';

const DURATION = 40;
const AIM_SPEED = 1.1;
const MAX_AIM = 1.0;
/** Inclinación del cañón (rad): más inclinado, más lejos (hasta unos 48 m). */
const MIN_PITCH = 0.1;
const MAX_PITCH = 0.72;
const START_PITCH = 0.35;
const PITCH_SPEED = 0.45;
const COOLDOWN = 0.65;
const BALL_SPEED = 26;
const BALL_GRAVITY = 14;
const BARREL_LENGTH = 1.6;
/** Centro de la plataforma del cañón (en la proa, sobre la cubierta). */
const CANNON = new THREE.Vector3(0, 2.1, 5.2);
const PIVOT_HEIGHT = 0.8;
/** Dónde va la cámara respecto a la plataforma (detrás y arriba). */
const CAMERA_OFFSET = new THREE.Vector3(0, 5.2, -4.2);
const MAX_TARGETS = 6;
/** Qué sale en el mar: puntos, radio para acertar y cuánto aparece. */
const TARGETS = {
  barrel: { points: 1, radius: 1.6, weight: 0.5 },
  ship: { points: 3, radius: 3.2, weight: 0.25 },
  chest: { points: 5, radius: 1.6, weight: 0.1 },
  dolphin: { points: 0, radius: 1.6, weight: 0.15 },
};
/** Por debajo de esta altura la bala ya puede pegarle a algo que flota. */
const HIT_HEIGHT = { barrel: 1.8, ship: 4, chest: 1.8, dolphin: 2.6 };
const CAPTAIN_LINES = ['¡Buen tiro, grumete! 🏴‍☠️', '¡Fuego! 💥', '¡Arrr, qué puntería! 🦜', '¡Al agua, pirata! 🌊'];
const PARROT_LINES = ['🦜 ¡Cañonazo!', '🦜 ¡Tesoro, tesoro!', '🦜 ¡Arrr!'];
const DOLPHIN_LINES = ['🐬 ¡Al delfín no!', '🐬 ¡Uy, pobre delfín!'];

function buildDolphin(kit) {
  const dolphin = new THREE.Group();
  dolphin.add(at(kit.box(0.7, 0.7, 2.2, 0x7aa6c2), 0, 0, 0));
  dolphin.add(at(kit.box(0.5, 0.5, 0.7, 0x7aa6c2), 0, -0.05, 1.4));
  dolphin.add(at(kit.box(0.15, 0.6, 0.5, 0x5f8ca8), 0, 0.55, -0.1));
  dolphin.add(at(kit.box(1, 0.12, 0.4, 0x5f8ca8), 0, 0, -1.25));
  dolphin.add(at(kit.box(0.5, 0.3, 0.6, 0xe8f1f6), 0, -0.3, 0.6));
  return dolphin;
}

export function createGaleonRide({ kit, look, random, announce, mates }) {
  const scene = new THREE.Scene();
  addSkyAndLights(scene, { sky: 0x8fd8ff, fogNear: 80, fogFar: 220 });
  const sea = at(kit.disc(400, SEA_COLOR), 0, 0, 0);
  scene.add(sea, buildClouds(kit, random, 10));
  // Islas a lo lejos con palmeras.
  for (let index = 0; index < 6; index += 1) {
    const angle = -1.3 + index * 0.52 + random() * 0.2;
    const distance = 110 + random() * 50;
    const island = at(new THREE.Group(), Math.sin(angle) * distance, 0, Math.cos(angle) * distance);
    const sand = kit.sphere(10, SAND_COLOR, 12);
    sand.scale.y = 0.25;
    island.add(sand);
    [-3, 2, 5].forEach((x, palm) => island.add(at(buildPalm(kit, { height: 7 + palm }), x, 1.5, palm - 1)));
    scene.add(island);
  }

  // Nuestro galeón: la popa hacia la cámara y la proa (con el cañón) hacia el mar abierto (+Z).
  const ship = buildGalleon(kit, { foresails: false });
  scene.add(ship);
  // Plataforma redonda que gira con el cañón; encima, la tripulación (así siempre se la ve).
  const turret = at(new THREE.Group(), CANNON.x, CANNON.y, CANNON.z);
  turret.add(at(kit.cyl(3.4, 3.4, 0.3, 0x8a4b1f, 24), 0, -0.15, 0));
  const rim = at(kit.torus(3.4, 0.08, 0xffd166), 0, 0.02, 0);
  rim.rotation.x = Math.PI / 2;
  turret.add(rim);
  turret.add(at(kit.box(1, 0.5, 1.2, 0x6b3b1f), 0, 0.25, 0));
  const barrelPivot = at(new THREE.Group(), 0, PIVOT_HEIGHT, 0);
  const barrel = at(kit.cyl(0.25, 0.32, BARREL_LENGTH + 0.2, 0x222222, 10), 0, 0, BARREL_LENGTH / 2);
  barrel.rotation.x = Math.PI / 2;
  barrelPivot.add(barrel);
  turret.add(barrelPivot);
  ship.add(turret);

  // La capitana Coral con su loro, a un lado del cañón (a la derecha en pantalla).
  const captain = createAvatar(kit, {
    ...look,
    shirt: { color: '#ffffff' },
    pants: { color: '#2b2140' },
    hat: { kind: 'brim', color: '#2b2140', band: '#ffd166' },
    extra: { kind: 'none' },
  });
  captain.root.position.set(-1.8, 0, 0.6);
  captain.root.rotation.y = 0.5;
  turret.add(captain.root);
  const parrot = new THREE.Group();
  parrot.add(at(kit.box(0.25, 0.45, 0.25, 0xe63946), 0, 0, 0), at(kit.box(0.2, 0.2, 0.2, 0x3fae4a), 0, 0.3, 0.05), at(kit.box(0.08, 0.1, 0.15, 0xffd93d), 0, 0.28, 0.2));
  parrot.position.set(0.55, 1.95, 0);
  captain.root.add(parrot);
  const captainName = kit.label('🏴‍☠️ Capitana Coral', { height: 0.4 });
  captainName.sprite.position.set(0, 2.75, 0);
  const captainTalk = kit.label(' ', { bubble: true, height: 0.55, background: '#fff6c9' });
  captainTalk.sprite.position.set(0, 3.35, 0);
  captainTalk.sprite.visible = false;
  captain.root.add(captainName.sprite, captainTalk.sprite);

  // La jugadora al otro lado (a la izquierda en pantalla) y las amigas sentadas en barriles.
  const me = createAvatar(kit, look);
  me.root.position.set(1.7, 0, 0.6);
  me.root.rotation.y = -0.4;
  turret.add(me.root);
  const MATE_SPOTS = [
    { x: -2.9, z: 2.1 },
    { x: 2.9, z: 2.1 },
    { x: -2.9, z: -0.6 },
  ];
  const mateRiders = new Map();
  mates.slice(0, MATE_SPOTS.length).forEach((mate, index) => {
    const { x, z } = MATE_SPOTS[index];
    turret.add(at(buildBarrel(kit), x, 0, z));
    const rider = createMateRider(kit, random, mate, { scale: 0.6, seatY: 1.3, bubbleHeight: 0.4 });
    rider.root.position.set(x, rider.root.position.y, z);
    turret.add(rider.root);
    mateRiders.set(mate.id, rider);
  });

  // Aro rojo en el agua: ahí caerá la bala.
  const marker = kit.torus(2, 0.18, 0xff3b3b, { emissive: 0x661111 });
  marker.rotation.x = Math.PI / 2;
  scene.add(marker);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  const targets = [];
  const balls = [];
  const effects = [];
  let time = 0;
  let aim = 0;
  let pitch = START_PITCH;
  let cooldown = 0;
  const muzzle = new THREE.Vector3();
  const cameraSpot = new THREE.Vector3();
  const landing = new THREE.Vector3();
  let spawnTimer = 0;
  let shots = 0;
  let hits = 0;
  let points = 0;
  let ships = 0;
  let chests = 0;
  let dolphinHits = 0;
  let message = '';
  let messageTimer = 0;
  let talkTimer = 0;

  function say(text, seconds = 1) {
    message = text;
    messageTimer = seconds;
  }

  function captainSays(text) {
    captainTalk.setText(text);
    captainTalk.sprite.visible = true;
    talkTimer = 1.6;
  }

  function pickKind() {
    let roll = random();
    for (const [kind, { weight }] of Object.entries(TARGETS)) {
      roll -= weight;
      if (roll <= 0) return kind;
    }
    return 'barrel';
  }

  function spawnTarget() {
    const kind = pickKind();
    let mesh;
    if (kind === 'barrel') mesh = buildBarrel(kit);
    else if (kind === 'chest') mesh = buildChest(kit);
    else if (kind === 'dolphin') mesh = buildDolphin(kit);
    else {
      mesh = buildGalleon(kit, { hull: 0x3b2f2f, sails: 0x2b2140, flag: 0xe63946 });
      mesh.scale.setScalar(0.5);
    }
    const angle = (random() * 2 - 1) * (MAX_AIM - 0.1);
    const distance = 14 + random() * 30;
    const drift = (random() < 0.5 ? -1 : 1) * (1.5 + random() * 2);
    const target = {
      kind,
      mesh,
      x: Math.sin(angle) * distance,
      z: CANNON.z + Math.cos(angle) * distance,
      drift,
      phase: random() * 6,
      life: 0,
      sinking: 0,
    };
    mesh.rotation.y = drift > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(mesh);
    targets.push(target);
  }

  function addEffect(x, y, z, color, size) {
    const mesh = at(kit.sphere(1, color, 10, { opacity: 0.85 }), x, y, z);
    mesh.scale.setScalar(0.2);
    scene.add(mesh);
    effects.push({ mesh, timer: 0, size });
  }

  /** Boca del cañón en el mundo (sin contar el vaivén del barco, que es pequeño). */
  function updateMuzzle() {
    const reach = Math.cos(pitch) * BARREL_LENGTH;
    muzzle.set(CANNON.x + Math.sin(aim) * reach, CANNON.y + PIVOT_HEIGHT + Math.sin(pitch) * BARREL_LENGTH, CANNON.z + Math.cos(aim) * reach);
  }

  /** Dónde cae la bala si se dispara ahora (tiro parabólico desde la boca hasta el agua). */
  function updateLanding() {
    const up = BALL_SPEED * Math.sin(pitch);
    const flight = (up + Math.sqrt(up * up + 2 * BALL_GRAVITY * muzzle.y)) / BALL_GRAVITY;
    const distance = BALL_SPEED * Math.cos(pitch) * flight;
    landing.set(muzzle.x + Math.sin(aim) * distance, 0.1, muzzle.z + Math.cos(aim) * distance);
  }

  function fire() {
    cooldown = COOLDOWN;
    shots += 1;
    sounds.cannon();
    const ball = at(kit.sphere(0.35, 0x222222, 8), muzzle.x, muzzle.y, muzzle.z);
    scene.add(ball);
    const flat = BALL_SPEED * Math.cos(pitch);
    balls.push({ mesh: ball, velocity: new THREE.Vector3(Math.sin(aim) * flat, BALL_SPEED * Math.sin(pitch), Math.cos(aim) * flat) });
    addEffect(muzzle.x, muzzle.y, muzzle.z, 0xdddddd, 1.2);
  }

  function hitTarget(target) {
    const { points: value } = TARGETS[target.kind];
    sounds.pop();
    target.sinking = 0.001;
    if (target.kind === 'dolphin') {
      dolphinHits += 1;
      say(pickLine(DOLPHIN_LINES, random), 1.4);
      captainSays('¡A los delfines no, grumete! 🐬');
      return;
    }
    hits += 1;
    points += value;
    addEffect(target.x, 1.5, target.z, 0xff9f43, target.kind === 'ship' ? 4 : 2.4);
    if (target.kind === 'ship') {
      ships += 1;
      say('🏴‍☠️ ¡Hundiste un barco pirata! +3', 1.3);
      announce('boom');
    } else if (target.kind === 'chest') {
      chests += 1;
      say('💰 ¡Un cofre del tesoro! +5', 1.3);
      sounds.cash();
      announce('boom');
    } else {
      say('🛢️ ¡Le diste al barril! +1');
    }
    if (hits % 3 === 0) captainSays(pickLine(CAPTAIN_LINES, random));
    else if (random() < 0.3) captainSays(pickLine(PARROT_LINES, random));
  }

  return {
    scene,
    camera,
    intro: 'Apunta con ◀ ▶ ▲ ▼: la bala cae en el aro rojo. ¡A los delfines no!',
    controls: { action: { icon: '💣', label: '¡Fuego!' }, steer: true, aim: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      if (time >= DURATION) {
        this.done = true;
        return;
      }
      // Mirando hacia +Z, girar a la derecha es ir hacia -X.
      aim += ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * AIM_SPEED * delta - input.lookDelta;
      aim = Math.max(-MAX_AIM, Math.min(MAX_AIM, aim));
      pitch += ((input.up ? 1 : 0) - (input.down ? 1 : 0)) * PITCH_SPEED * delta - (input.lookDeltaY ?? 0);
      pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));
      turret.rotation.y = aim;
      barrelPivot.rotation.x = -pitch;
      updateMuzzle();
      updateLanding();
      marker.position.copy(landing);
      marker.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
      cooldown -= delta;
      if (input.actionPressed && cooldown <= 0) fire();

      spawnTimer -= delta;
      if (spawnTimer <= 0 && targets.length < MAX_TARGETS) {
        spawnTimer = 0.9 + random() * 0.8;
        spawnTarget();
      }

      targets.forEach((target) => {
        target.life += delta;
        if (target.sinking) {
          target.sinking += delta;
          target.mesh.position.y -= delta * 3;
          target.mesh.rotation.z += delta * 1.5;
          return;
        }
        target.x += target.drift * delta;
        const bob = Math.sin(time * 2 + target.phase);
        if (target.kind === 'dolphin') {
          // Salta del agua de vez en cuando.
          const jump = Math.max(0, Math.sin(time * 1.6 + target.phase));
          target.mesh.position.set(target.x, -0.6 + jump * 2.6, target.z);
          target.mesh.rotation.x = -Math.cos(time * 1.6 + target.phase) * 0.6;
        } else {
          target.mesh.position.set(target.x, bob * 0.15 - (target.kind === 'ship' ? 0.3 : 0.2), target.z);
          target.mesh.rotation.z = bob * 0.06;
        }
      });
      for (let index = targets.length - 1; index >= 0; index -= 1) {
        const target = targets[index];
        if (target.sinking > 1.2 || Math.abs(target.x) > 60) {
          scene.remove(target.mesh);
          targets.splice(index, 1);
        }
      }

      balls.forEach((ball) => {
        ball.velocity.y -= BALL_GRAVITY * delta;
        ball.mesh.position.addScaledVector(ball.velocity, delta);
        const { position } = ball.mesh;
        const hit = targets.find(
          (target) =>
            !target.sinking &&
            position.y < HIT_HEIGHT[target.kind] &&
            Math.hypot(target.x - position.x, target.z - position.z) < TARGETS[target.kind].radius,
        );
        if (hit) {
          hitTarget(hit);
          ball.done = true;
        } else if (position.y <= 0) {
          sounds.splash();
          addEffect(ball.mesh.position.x, 0, ball.mesh.position.z, 0xffffff, 1.6);
          ball.done = true;
        }
      });
      for (let index = balls.length - 1; index >= 0; index -= 1) {
        if (!balls[index].done) continue;
        scene.remove(balls[index].mesh);
        balls.splice(index, 1);
      }

      effects.forEach((effect) => {
        effect.timer += delta;
        effect.mesh.scale.setScalar(0.2 + effect.timer * effect.size * 2.5);
        effect.mesh.visible = effect.timer < 0.4;
      });
      for (let index = effects.length - 1; index >= 0; index -= 1) {
        if (effects[index].timer < 0.4) continue;
        scene.remove(effects[index].mesh);
        effects.splice(index, 1);
      }

      ship.position.y = Math.sin(time * 1.2) * 0.15;
      ship.rotation.z = Math.sin(time * 0.9) * 0.025;
      ship.rotation.x = Math.sin(time * 1.2 + 1) * 0.015;
      parrot.rotation.y = Math.sin(time * 3) * 0.4;
      me.update(delta, { speed: 0 });
      captain.update(delta, { speed: 0 });
      mateRiders.forEach((rider) => rider.update(delta));
      talkTimer -= delta;
      if (talkTimer <= 0) captainTalk.sprite.visible = false;

      // Cámara detrás de la plataforma (gira con ella), mirando al aro donde caerá la bala.
      cameraSpot.copy(CAMERA_OFFSET);
      turret.localToWorld(cameraSpot);
      camera.position.copy(cameraSpot);
      camera.lookAt(landing.x, 0, landing.z);
    },

    onMateSay(id, kind) {
      const rider = mateRiders.get(id);
      if (rider && kind === 'boom') mateReacts(rider, SAYINGS.boom.text, { cheer: true });
    },

    status: () => `💥 Puntos: ${points} · 🏴‍☠️ ${ships} · 💰 ${chests} · ⏱️ ${Math.max(0, Math.ceil(DURATION - time))} s`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      return {
        coins: Math.max(3, Math.min(20, 3 + points)),
        emoji: '🏴‍☠️',
        title: dolphinHits === 0 && points >= 10 ? '¡Pirata de puntería! 🎯' : '¡Arrr, qué aventura!',
        stats: [
          { label: 'Puntos', value: points },
          { label: 'Barcos piratas', value: ships },
          { label: 'Cofres', value: chests },
          { label: 'Disparos', value: shots },
        ],
      };
    },

    dispose() {},
  };
}
