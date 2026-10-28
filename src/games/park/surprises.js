/**
 * Sorpresas al azar mientras se pasea por el parque (una cada 60–100 s, nunca dos a la vez):
 * - `rain`: lluvia de monedas alrededor de la jugadora.
 * - `balloon`: un globo con regalo que baja despacio; se atrapa saltando.
 * - `wizard`: el Mago del Parque propone un reto: atrapar 5 estrellas a tiempo.
 * Fallar nunca quita nada. Cada tablet tiene las suyas (no se envían a las amigas).
 * Lo que pasa se avisa con `onEvent`: { type: 'start' | 'coin' | 'status' | 'reward' | 'miss', ... }.
 */
import * as THREE from 'three';
import { at } from './kit.js';

export const SURPRISE_KINDS = ['rain', 'balloon', 'wizard'];
const FIRST_WAIT = [40, 70];
const WAIT = [60, 100];

const RAIN_COINS = 15;
const RAIN_SECONDS = 20;
const RAIN_FALL_SPEED = 6;
const RAIN_ALL_BONUS = 10;

const BALLOON_SECONDS = 45;
/** Altura del regalo: solo se alcanza saltando. */
const BALLOON_GIFT_Y = 3.2;
const BALLOON_COINS = 15;

const WIZARD_WAIT_SECONDS = 60;
const WIZARD_TALK_DISTANCE = 2.6;
const STAR_COUNT = 5;
const STAR_SECONDS = 30;
const WIZARD_COINS = 25;

const COIN_RADIUS = 1.3;
const BALLOON_COLORS = [0xff5fa2, 0x5ab0ff, 0xffd93d, 0x4dd4ac, 0xb57bff];

const between = ([min, max]) => min + Math.random() * (max - min);

/**
 * `findSpot(min, max, around)` da un sitio libre { x, z } a esa distancia de `around` (o null).
 */
export function createSurprises({ kit, scene, findSpot, onEvent }) {
  let wait = between(FIRST_WAIT);
  let current = null;

  const near = (position, player, radius, height = 1.6) =>
    Math.hypot(position.x - player.x, position.z - player.z) < radius && Math.abs(position.y - (player.y + 1)) < height;

  const beam = (x, z, color = 0xfff2a8) => at(kit.cyl(0.6, 0.6, 30, color, 12, { opacity: 0.2, emissive: 0xffd93d }), x, 15, z);

  function coinMesh() {
    const coin = new THREE.Group();
    const disc = kit.cyl(0.42, 0.42, 0.1, 0xffc21a, 16, { emissive: 0x4a3400 });
    disc.rotation.x = Math.PI / 2;
    const inner = kit.cyl(0.25, 0.25, 0.12, 0xffe680, 12);
    inner.rotation.x = Math.PI / 2;
    coin.add(disc, inner);
    return coin;
  }

  function starMesh() {
    const star = new THREE.Group();
    const glow = { emissive: 0x806a00 };
    star.add(at(kit.cone(0.32, 0.4, 0xffd93d, 5, glow), 0, 0.2, 0));
    const bottom = at(kit.cone(0.32, 0.4, 0xffd93d, 5, glow), 0, -0.2, 0);
    bottom.rotation.x = Math.PI;
    star.add(bottom);
    return star;
  }

  function wizardMesh() {
    const wizard = new THREE.Group();
    wizard.add(at(kit.cone(0.6, 1.5, 0x6b4bd8, 10), 0, 0.75, 0));
    wizard.add(at(kit.sphere(0.32, 0xf6c99f, 10), 0, 1.75, 0));
    wizard.add(at(kit.box(0.5, 0.35, 0.12, 0xf3f0ff), 0, 1.55, 0.25));
    wizard.add(at(kit.cyl(0.55, 0.55, 0.06, 0x4a2fb0, 14), 0, 2.02, 0));
    wizard.add(at(kit.cone(0.36, 0.9, 0x4a2fb0, 10), 0, 2.48, 0));
    wizard.add(at(kit.sphere(0.09, 0xffd93d, 6, { emissive: 0x806a00 }), 0, 2.95, 0));
    const wand = at(kit.box(0.06, 0.7, 0.06, 0x3b2414), 0.5, 1.2, 0.2);
    wand.rotation.z = -0.5;
    wizard.add(wand, at(kit.sphere(0.1, 0xfff2a8, 6, { emissive: 0xffd93d }), 0.68, 1.5, 0.2));
    wizard.add(at(kit.disc(0.6, 0x000000, { opacity: 0.18 }), 0, 0.03, 0));
    return wizard;
  }

  function balloonMesh() {
    const balloon = new THREE.Group();
    const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const ball = at(kit.sphere(0.8, color, 14), 0, 2.4, 0);
    ball.scale.set(1, 1.15, 1);
    balloon.add(ball, at(kit.cone(0.14, 0.2, color, 6), 0, 1.45, 0));
    balloon.add(at(kit.box(0.03, 1.2, 0.03, 0xffffff), 0, 0.75, 0));
    // El regalo cuelga en y = 0 del grupo.
    balloon.add(at(kit.box(0.6, 0.5, 0.6, 0xff4f8b), 0, 0, 0));
    balloon.add(at(kit.box(0.64, 0.12, 0.14, 0xffd93d), 0, 0, 0), at(kit.box(0.14, 0.12, 0.64, 0xffd93d), 0, 0.2, 0));
    balloon.add(at(kit.box(0.14, 0.54, 0.64, 0xffd93d), 0, 0, 0));
    return balloon;
  }

  // ---------- Inicio de cada sorpresa ----------

  function startRain(player) {
    const coins = [];
    for (let index = 0; index < RAIN_COINS; index += 1) {
      const spot = findSpot(3, 10, player);
      if (!spot) continue;
      const mesh = at(coinMesh(), spot.x, 8 + Math.random() * 8, spot.z);
      scene.add(mesh);
      coins.push(mesh);
    }
    if (!coins.length) return null;
    onEvent({ type: 'start', kind: 'rain', text: '🌧️ ¡Lluvia de monedas! Atrapa todas las que puedas' });
    return { kind: 'rain', coins, caught: 0, total: coins.length, time: RAIN_SECONDS };
  }

  function startBalloon(player) {
    const spot = findSpot(15, 25, player);
    if (!spot) return null;
    const mesh = at(balloonMesh(), spot.x, 12, spot.z);
    const ray = beam(spot.x, spot.z);
    scene.add(mesh, ray);
    onEvent({ type: 'start', kind: 'balloon', text: '🎈 ¡Un globo con regalo! Búscalo y salta para atraparlo' });
    return { kind: 'balloon', mesh, ray, home: spot, height: mesh.position.y, time: BALLOON_SECONDS, leaving: 0, angle: 0 };
  }

  function startWizard(player) {
    const spot = findSpot(10, 20, player);
    if (!spot) return null;
    const mesh = at(wizardMesh(), spot.x, 0, spot.z);
    const ray = beam(spot.x, spot.z, 0xd9c8ff);
    scene.add(mesh, ray);
    onEvent({ type: 'start', kind: 'wizard', text: '🎩 ¡Llegó el Mago del Parque! Ve a hablar con él' });
    return { kind: 'wizard', mesh, ray, stars: [], time: WIZARD_WAIT_SECONDS, playing: false, caught: 0 };
  }

  const STARTERS = { rain: startRain, balloon: startBalloon, wizard: startWizard };

  function start(kind, player) {
    if (current) finish();
    current = STARTERS[kind]?.(player) ?? null;
    return Boolean(current);
  }

  /** Quita todo lo de la sorpresa actual y espera a la siguiente. */
  function finish() {
    if (!current) return;
    const { coins = [], stars = [], mesh, ray } = current;
    [...coins, ...stars.map((star) => star.mesh), mesh, ray].filter(Boolean).forEach((object) => scene.remove(object));
    if (current.kind === 'wizard' && current.playing) onEvent({ type: 'status', text: null });
    current = null;
    wait = between(WAIT);
  }

  // ---------- Cada cuadro ----------

  function updateRain(delta, player) {
    current.time -= delta;
    current.coins = current.coins.filter((coin) => {
      coin.position.y = Math.max(1, coin.position.y - RAIN_FALL_SPEED * delta);
      coin.rotation.y += delta * 4;
      if (!near(coin.position, player, COIN_RADIUS, 2)) return true;
      scene.remove(coin);
      current.caught += 1;
      onEvent({ type: 'coin' });
      return false;
    });
    if (current.coins.length && current.time > 0) return;
    const { caught, total } = current;
    if (caught === 0) onEvent({ type: 'miss', kind: 'rain', text: '🌧️ Se acabó la lluvia de monedas' });
    else if (caught === total) onEvent({ type: 'reward', kind: 'rain', coins: RAIN_ALL_BONUS, text: `🌧️ ¡Atrapaste todas las monedas! +${RAIN_ALL_BONUS} 🪙 extra` });
    else onEvent({ type: 'reward', kind: 'rain', coins: 0, text: `🌧️ ¡Atrapaste ${caught} monedas!` });
    finish();
  }

  function updateBalloon(delta, player) {
    const balloon = current;
    balloon.angle += delta * 0.6;
    const { mesh, home } = balloon;
    if (balloon.leaving > 0) {
      balloon.leaving -= delta;
      mesh.position.y += delta * 6;
      if (balloon.leaving <= 0) finish();
      return;
    }
    balloon.time -= delta;
    mesh.position.x = home.x + Math.sin(balloon.angle) * 1.2;
    mesh.position.z = home.z + Math.cos(balloon.angle) * 1.2;
    balloon.height = Math.max(BALLOON_GIFT_Y, balloon.height - delta * 4);
    mesh.position.y = balloon.height + Math.sin(balloon.angle * 3) * 0.12;
    mesh.rotation.y += delta * 0.8;
    balloon.ray.position.x = mesh.position.x;
    balloon.ray.position.z = mesh.position.z;
    if (near(mesh.position, player, 1.5)) {
      onEvent({ type: 'reward', kind: 'balloon', coins: BALLOON_COINS, text: `🎁 ¡Atrapaste el globo! +${BALLOON_COINS} 🪙` });
      finish();
      return;
    }
    if (balloon.time <= 0) {
      onEvent({ type: 'miss', kind: 'balloon', text: '🎈 El globo se fue volando… ¡Saldrá otro!' });
      scene.remove(balloon.ray);
      balloon.ray = null;
      balloon.leaving = 2.5;
    }
  }

  function wizardStatus() {
    onEvent({ type: 'status', text: `⭐ ${current.caught}/${STAR_COUNT} · ⏱️ ${Math.ceil(current.time)}` });
  }

  function updateWizard(delta, player) {
    const wizard = current;
    wizard.mesh.rotation.y = Math.atan2(player.x - wizard.mesh.position.x, player.z - wizard.mesh.position.z);
    if (!wizard.playing) {
      wizard.time -= delta;
      if (Math.hypot(player.x - wizard.mesh.position.x, player.z - wizard.mesh.position.z) < WIZARD_TALK_DISTANCE) {
        // Empieza el reto: las estrellas salen alrededor del mago.
        for (let index = 0; index < STAR_COUNT; index += 1) {
          const spot = findSpot(5, 15, wizard.mesh.position);
          if (!spot) continue;
          const mesh = at(starMesh(), spot.x, 1.2, spot.z);
          scene.add(mesh);
          wizard.stars.push({ mesh, y: 1.2 + Math.random() * 0.6 });
        }
        wizard.goal = wizard.stars.length;
        if (!wizard.goal) {
          finish();
          return;
        }
        wizard.playing = true;
        wizard.time = STAR_SECONDS;
        scene.remove(wizard.ray);
        onEvent({ type: 'start', kind: 'wizard-challenge', text: `🎩 ¡Reto del mago! Atrapa ${wizard.goal} estrellas en ${STAR_SECONDS} segundos` });
        wizardStatus();
      } else if (wizard.time <= 0) {
        onEvent({ type: 'miss', kind: 'wizard', text: '🎩 El mago se fue… ¡Volverá otro rato!' });
        finish();
      }
      return;
    }
    wizard.time -= delta;
    const before = wizard.caught;
    wizard.stars = wizard.stars.filter((star) => {
      star.mesh.rotation.y += delta * 3;
      star.mesh.position.y = star.y + Math.sin(performance.now() / 300 + star.y * 5) * 0.2;
      if (!near(star.mesh.position, player, COIN_RADIUS + 0.2)) return true;
      scene.remove(star.mesh);
      wizard.caught += 1;
      onEvent({ type: 'star' });
      return false;
    });
    if (!wizard.stars.length) {
      onEvent({ type: 'reward', kind: 'wizard', coins: WIZARD_COINS, text: `🎩 ¡Lo lograste! El mago te regala +${WIZARD_COINS} 🪙` });
      finish();
      return;
    }
    if (wizard.time <= 0) {
      onEvent({ type: 'miss', kind: 'wizard', text: '🎩 ¡Casi! El mago volverá otro rato con otro reto' });
      finish();
      return;
    }
    if (before !== wizard.caught || Math.ceil(wizard.time) !== Math.ceil(wizard.time + delta)) wizardStatus();
  }

  const UPDATERS = { rain: updateRain, balloon: updateBalloon, wizard: updateWizard };

  return {
    start,
    /** `active`: la jugadora está paseando (en filas, atracciones o pausa todo espera). */
    update(delta, player, active) {
      if (!active) return;
      if (current) {
        UPDATERS[current.kind](delta, player);
        return;
      }
      wait -= delta;
      if (wait > 0) return;
      const kind = SURPRISE_KINDS[Math.floor(Math.random() * SURPRISE_KINDS.length)];
      if (!start(kind, player)) wait = between(WAIT);
    },
    get current() {
      return current?.kind ?? null;
    },
    dispose() {
      finish();
    },
  };
}
