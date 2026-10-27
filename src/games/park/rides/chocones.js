/**
 * Carros chocones en la pista del parque: el carrito avanza solo, se gira con ◀ ▶ y con ⚡ acelera.
 * Cada choque fuerte contra otro carro da una moneda.
 */
import * as THREE from 'three';
import { sounds } from '../../../core/audio.js';
import { NAMES } from '../crowd.js';
import { buildBumperCar } from '../props.js';
import { createRider, pickLine } from '../riders.js';

const DURATION = 30;
const CRUISE = 3.6;
const BOOST = 7;
const TURN_SPEED = 2.4;
const CAR_RADIUS = 1.1;
const RIVAL_SPEED = 2.8;
const BUMP_MIN_SPEED = 2;
const BUMP_COOLDOWN = 0.8;
const MAX_BUMP_COINS = 18;
const HIT_LINES = ['¡Oye! 😤', '¡Jajaja! 😂', '¡Ayyy! 😵', '¡Te voy a alcanzar! 😜', '¡Pum! 💥'];

export function createChoconesRide({ kit, park, scene, look, random }) {
  const { bumper } = park;
  bumper.idle = false;
  bumper.group.visible = false;
  const radius = bumper.radius - CAR_RADIUS;

  const arena = new THREE.Group();
  arena.position.copy(bumper.center);
  scene.add(arena);

  const makeCar = (color, x, z, heading, driver) => {
    const mesh = buildBumperCar(kit, color, { driver });
    arena.add(mesh);
    return { mesh, driver, x, z, heading, speed: 0, vx: 0, vz: 0, spin: 0, cooldown: 0, turn: 0 };
  };

  const player = makeCar(0xff5fa2, 0, 4, Math.PI, createRider(kit, random, { scale: 0.62, seatY: 0.95, look }));
  // Rivales con nombre, para saber a quién chocaste.
  const firstName = Math.floor(random() * NAMES.length);
  const rivals = [0x5ab0ff, 0x4dd4ac, 0xffd93d, 0xb57bff, 0xff9f43].map((color, index) => {
    const angle = (index / 5) * Math.PI * 2;
    const name = NAMES[(firstName + index) % NAMES.length];
    const driver = createRider(kit, random, { scale: 0.62, seatY: 0.95, name });
    return makeCar(color, Math.sin(angle) * 5, Math.cos(angle) * 5 - 1, random() * Math.PI * 2, driver);
  });
  const cars = [player, ...rivals];

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 500);
  const lookTarget = new THREE.Vector3();
  let time = 0;
  let bumps = 0;
  let message = '';
  let messageTimer = 0;

  function moveCar(car, delta) {
    car.x += (Math.sin(car.heading) * car.speed + car.vx) * delta;
    car.z += (Math.cos(car.heading) * car.speed + car.vz) * delta;
    const decay = Math.max(0, 1 - delta * 3);
    car.vx *= decay;
    car.vz *= decay;
    const distance = Math.hypot(car.x, car.z);
    if (distance > radius) {
      // Rebota contra la valla.
      car.x *= radius / distance;
      car.z *= radius / distance;
      car.heading = Math.atan2(-car.x, -car.z) + (random() - 0.5) * 0.8;
      car.vx = (-car.x / radius) * 2;
      car.vz = (-car.z / radius) * 2;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading + car.spin;
  }

  function collide(a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= CAR_RADIUS * 2 || distance < 1e-3) return false;
    const nx = dx / distance;
    const nz = dz / distance;
    const overlap = CAR_RADIUS * 2 - distance;
    a.x -= nx * overlap * 0.5;
    a.z -= nz * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.z += nz * overlap * 0.5;
    const push = 2 + a.speed * 0.6;
    b.vx += nx * push;
    b.vz += nz * push;
    a.vx -= nx * push * 0.5;
    a.vz -= nz * push * 0.5;
    return true;
  }

  return {
    camera,
    intro: 'Gira con ◀ ▶, mantén ⚡ para acelerar y ¡choca a los demás!',
    controls: { action: { icon: '⚡', label: 'Acelerar' }, steer: true, holdAction: true },
    done: false,

    update(delta, input) {
      time += delta;
      messageTimer -= delta;
      if (time >= DURATION) {
        this.done = true;
        return;
      }
      const wanted = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      player.heading += wanted * TURN_SPEED * delta;
      const targetSpeed = input.action ? BOOST : CRUISE;
      player.speed += (targetSpeed - player.speed) * Math.min(1, delta * 3);

      rivals.forEach((car) => {
        car.turn = Math.max(-1, Math.min(1, car.turn + (random() - 0.5) * delta * 4));
        car.heading += car.turn * delta;
        car.speed = RIVAL_SPEED;
        car.spin *= Math.max(0, 1 - delta * 2.5);
        car.cooldown -= delta;
      });
      cars.forEach((car) => {
        moveCar(car, delta);
        car.driver.update(delta);
      });

      rivals.forEach((rival) => {
        const hit = collide(player, rival);
        if (hit && rival.cooldown <= 0 && player.speed >= BUMP_MIN_SPEED) {
          rival.cooldown = BUMP_COOLDOWN;
          rival.spin = Math.PI * 2;
          rival.driver.say(pickLine(HIT_LINES, random), 1.2);
          bumps += 1;
          message = '💥 ¡PUM! +1';
          messageTimer = 0.7;
          sounds.bump();
        }
      });
      for (let i = 0; i < rivals.length; i += 1) for (let j = i + 1; j < rivals.length; j += 1) collide(rivals[i], rivals[j]);

      const forwardX = Math.sin(player.heading);
      const forwardZ = Math.cos(player.heading);
      camera.position.set(
        bumper.center.x + player.x - forwardX * 6.5,
        4.2,
        bumper.center.z + player.z - forwardZ * 6.5,
      );
      lookTarget.set(bumper.center.x + player.x + forwardX * 3, 0.8, bumper.center.z + player.z + forwardZ * 3);
      camera.lookAt(lookTarget);
    },

    status: () => `💥 Choques: ${bumps} · ⏱️ ${Math.max(0, Math.ceil(DURATION - time))} s`,
    prompt: () => (messageTimer > 0 ? message : ''),

    result() {
      return {
        coins: 3 + Math.min(MAX_BUMP_COINS, bumps),
        emoji: '🚗',
        title: bumps >= 10 ? '¡Campeona de los chocones!' : '¡Pum, pum, pum!',
        stats: [{ label: 'Choques', value: bumps }],
      };
    },

    dispose() {
      scene.remove(arena);
      bumper.group.visible = true;
      bumper.idle = true;
    },
  };
}
