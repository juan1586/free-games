import { createGameLoop } from '../../core/gameLoop.js';
import { setupCanvas } from '../../core/canvas.js';
import { bindHoldButton, bindKeyboard, bindTouchGestures } from '../../core/input.js';
import { sounds } from '../../core/audio.js';
import { getActivePlayer, getGameData, sanitizeName, updateGameData } from '../../core/player.js';
import { createBanner, createGameHeader, createTouchButton } from '../../ui/hud.js';
import { closeModal, showModal } from '../../ui/modal.js';
import { el, navigate } from '../../ui/dom.js';
import { getSession, leaveRoom } from '../../core/race.js';
import { RaceMatch } from '../../core/raceMatch.js';
import { createRandom } from '../../core/random.js';
import { formatRaceTime, placeLabel, showRaceEnded, showRacePodium } from '../../ui/raceResults.js';
import { DINO_SIZE, drawDino, getDino } from './dinos.js';
import { DINO_WORLDS, OBSTACLE_SIZES, drawObstacle } from './worlds.js';
import { parseDinoPos } from './race.js';

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 300;
const GROUND_Y = 252;
const DINO_X = 70;
const MOON_X = 470;
const NAME_LABEL_MIN_Y = 46;
const METERS_PER_PIXEL = 1 / 40;
const COIN_VALUE = 10;
const COIN_RADIUS = 9;
const DAY_CYCLE_SECONDS = 50;
const FAST_FALL_MULTIPLIER = 2.6;
const JUMP_BUFFER_SECONDS = 0.12;
const SWIPE_DUCK_SECONDS = 0.55;
const GAME_OVER_DELAY_MS = 750;
const HITBOX_PADDING = 7;
const FLYER_CHANCE = 0.28;
const COIN_ROW_CHANCE = 0.45;
/** Con el turbo al máximo se corre un 50 % más rápido y esos metros cuentan doble en los puntos. */
const TURBO_BOOST = 0.5;
const TURBO_EASE = 8;
const SPEED_LINE_COUNT = 12;
// Carrera: al chocar no se pierde, se tropieza (va más lento un momento y no choca otra vez).
const STUMBLE_SECONDS = 1.1;
const STUMBLE_MIN_SPEED = 0.25;
const COUNTDOWN_SECONDS = 3;
const GO_LABEL_SECONDS = 0.7;
const POS_SEND_SECONDS = 1 / 15;
const FINISH_MODAL_DELAY_MS = 1300;
const RIVAL_FOLLOW_RATE = 12;
const RIVAL_PREDICT_SECONDS = 0.15;
const RIVAL_SNAP_DISTANCE = 400;
const RIVAL_ALPHA = 0.5;

const HIGH_FLYER_BOTTOM = GROUND_Y - 44;
const LOW_FLYER_BOTTOM = GROUND_Y - 6;

const random = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class DinoGame {
  constructor(root, { worldIndex, race = false }) {
    const data = getGameData('dino');
    // En carrera manda la sala: se puede correr un mundo que aún no se tiene (no lo desbloquea).
    this.race = race ? getSession() : null;
    this.worldIndex = this.race ? this.race.meta.config.worldIndex : clamp(worldIndex, 0, data.unlockedWorld);
    this.world = DINO_WORLDS[this.worldIndex];
    this.dino = getDino(data.dinoType);
    this.dinoName = sanitizeName(data.dinoName) || this.dino.name;
    this.best = data.bestScore;
    // Obstáculos y monedas salen de aquí; en carrera, de una semilla compartida (misma pista para todos).
    this.courseRandom = Math.random;
    if (this.race) {
      this.match = new RaceMatch({ parsePos: parseDinoPos });
      this.match.rivals.forEach((rival) => {
        rival.dino = getDino(rival.look.dinoType);
        rival.label = rival.look.dinoName || rival.dino.name;
      });
    }

    this.buildDom(root);
    this.ctx = setupCanvas(this.canvas, VIEW_WIDTH, VIEW_HEIGHT);
    this.stars = Array.from({ length: 60 }, () => ({ x: random(0, VIEW_WIDTH), y: random(0, GROUND_Y - 60), r: random(0.6, 1.8), t: random(0, 6) }));
    this.speedLines = Array.from({ length: SPEED_LINE_COUNT }, () => ({ x: random(0, VIEW_WIDTH), y: random(30, GROUND_Y - 10), length: random(40, 100) }));
    this.clouds = Array.from({ length: 5 }, (_, index) => ({ x: index * 190 + random(0, 80), y: random(30, 110), s: random(0.7, 1.2) }));

    this.loop = createGameLoop({
      update: (delta) => this.update(delta),
      render: () => this.render(),
      onAutoPause: () => this.pause(),
    });
    this.unbinders = this.bindControls();
    this.reset();
    this.loop.start();
    if (this.race) this.startRaceSession();
  }

  buildDom(root) {
    const items = this.race
      ? [
          { key: 'distance', label: 'Metros', icon: getActivePlayer()?.avatar ?? '📏', value: `0/${this.world.goal}` },
          { key: 'place', label: 'Puesto', icon: '🏅', value: '—' },
          { key: 'coins', label: 'Monedas', icon: '🪙', value: 0 },
          { key: 'time', label: 'Tiempo', icon: '⏱️', value: '0 s' },
        ]
      : [
          { key: 'distance', label: 'Metros', icon: '📏', value: 0 },
          { key: 'coins', label: 'Monedas', icon: '🪙', value: 0 },
          { key: 'score', label: 'Puntos', icon: '⭐', value: 0 },
          { key: 'best', label: 'Récord', icon: '🏆', value: this.best },
        ];
    this.header = createGameHeader({
      title: `${this.race ? '🏁 ' : ''}${this.world.emoji} ${this.world.name}`,
      backPath: '/dino',
      onPause: () => this.pause(),
      items,
    });

    this.canvas = el('canvas', {
      className: 'stage__canvas stage__canvas--dino',
      attrs: { width: VIEW_WIDTH, height: VIEW_HEIGHT, 'aria-label': 'Juego del dinosaurio' },
    });
    this.hintTitle = el('strong', { text: '¡Toca o pulsa Espacio para empezar!' });
    this.hintText = el('span', { text: '⬆️ / Espacio: saltar · ⬇️: agacharse · Shift / ⚡: turbo (¡puntos dobles!) · P: pausa' });
    this.hint = el('div', { className: 'stage__hint' }, [this.hintTitle, this.hintText]);
    const stage = el('div', { className: `stage stage--dino world--${this.world.id}` }, [this.canvas, this.hint]);
    this.showBanner = createBanner(stage);

    this.jumpButton = createTouchButton({ icon: '⬆️', label: 'Saltar', variant: 'jump' });
    this.duckButton = createTouchButton({ icon: '⬇️', label: 'Agachar', variant: 'duck' });
    this.turboButton = createTouchButton({ icon: '⚡', label: 'Turbo', variant: 'turbo' });
    const touchControls = el('div', { className: 'touch-controls touch-controls--dino' }, [this.duckButton, this.turboButton, this.jumpButton]);

    root.append(el('main', { className: 'page game-page game-page--side-controls' }, [this.header.element, stage, touchControls]));
  }

  bindControls() {
    const pressAction = (action) => {
      if (action === 'jump') this.requestJump();
      if (action === 'duck') this.input.duckHeld = true;
      if (action === 'turbo') this.setTurbo(true);
      if (action === 'pause') this.pause();
    };
    const releaseAction = (action) => {
      if (action === 'duck') this.input.duckHeld = false;
      if (action === 'turbo') this.setTurbo(false);
    };

    return [
      bindKeyboard(
        { jump: ['Space', 'ArrowUp', 'KeyW'], duck: ['ArrowDown', 'KeyS'], turbo: ['ShiftLeft', 'ShiftRight'], pause: ['KeyP', 'Escape'] },
        { onPress: (action, repeat) => !repeat && pressAction(action), onRelease: releaseAction },
      ),
      bindTouchGestures(this.canvas, {
        onTap: () => this.requestJump(),
        onSwipe: (direction) => {
          if (direction === 'up') this.requestJump();
          if (direction === 'down') this.input.duckTimer = SWIPE_DUCK_SECONDS;
        },
      }),
      bindHoldButton(this.jumpButton, { onPress: () => this.requestJump() }),
      bindHoldButton(this.turboButton, { onPress: () => this.setTurbo(true), onRelease: () => this.setTurbo(false) }),
      bindHoldButton(this.duckButton, {
        onPress: () => (this.input.duckHeld = true),
        onRelease: () => (this.input.duckHeld = false),
      }),
    ];
  }

  reset() {
    this.status = 'ready';
    this.time = 0;
    this.frame = 0;
    this.distancePx = 0;
    this.speed = this.world.speed.start;
    this.player = { height: 0, velocity: 0, onGround: true, ducking: false };
    this.input = { duckHeld: false, duckTimer: 0, jumpBuffer: 0 };
    this.obstacles = [];
    this.coins = [];
    this.particles = [];
    this.confetti = [];
    this.nextSpawnPx = 500;
    this.coinsThisRun = 0;
    this.turboHeld = false;
    this.turboAmount = 0;
    this.turboBonusPx = 0;
    this.worldCleared = false;
    this.shakeTime = 0;
    this.progressSaved = false;
    this.stumbleTime = 0;
    this.hint.hidden = false;
    this.updateHud();
  }

  get meters() {
    return Math.floor(this.distancePx * METERS_PER_PIXEL);
  }

  get effectiveSpeed() {
    const stumble = this.stumbleTime > 0 ? STUMBLE_MIN_SPEED + (1 - STUMBLE_MIN_SPEED) * (1 - this.stumbleTime / STUMBLE_SECONDS) : 1;
    return this.speed * (1 + TURBO_BOOST * this.turboAmount) * stumble;
  }

  /** Velocidad base a una distancia dada (sin turbo): sube poco a poco hasta el máximo del mundo. */
  speedAt(distancePx) {
    const { start, max } = this.world.speed;
    const acceleration = (max - start) / (this.world.goal * 1.4);
    return Math.min(max, start + Math.floor(distancePx * METERS_PER_PIXEL) * acceleration);
  }

  courseRange(min, max) {
    return min + this.courseRandom() * (max - min);
  }

  coursePick(list) {
    return list[Math.floor(this.courseRandom() * list.length)];
  }

  setTurbo(isOn) {
    if (isOn && !this.turboHeld && this.status === 'running') sounds.turbo();
    this.turboHeld = isOn;
  }

  get score() {
    return this.meters + this.coinsThisRun * COIN_VALUE + Math.floor(this.turboBonusPx * METERS_PER_PIXEL);
  }

  requestJump() {
    if (this.status === 'ready') {
      this.status = 'running';
      this.hint.hidden = true;
    }
    if (this.status !== 'running') return;
    this.input.jumpBuffer = JUMP_BUFFER_SECONDS;
  }

  pause() {
    if (!['running', 'ready', 'waiting', 'countdown'].includes(this.status)) return;
    this.pausedFrom = this.status;
    this.status = 'paused';
    this.turboHeld = false;
    this.loop.stop();
    if (this.race) {
      showModal({
        emoji: '⏸️',
        title: 'Pausa',
        message: this.raceStartedAt ? '¡Ojo! En la carrera el reloj sigue corriendo.' : 'La carrera empieza cuando vuelvas.',
        escapeIndex: 0,
        actions: [
          { label: 'Continuar ▶', variant: 'primary', onClick: () => this.resume() },
          { label: 'Salir', onClick: () => navigate('/dino') },
        ],
      });
      return;
    }
    showModal({
      emoji: '⏸️',
      title: 'Pausa',
      message: 'Tómate un respiro. ¡Tu dino te espera!',
      escapeIndex: 0,
      actions: [
        { label: 'Continuar ▶', variant: 'primary', onClick: () => this.resume() },
        { label: 'Reiniciar', onClick: () => this.restart() },
        { label: 'Salir', onClick: () => navigate('/dino') },
      ],
    });
  }

  resume() {
    this.status = this.pausedFrom ?? 'running';
    this.input.duckHeld = false;
    this.loop.start();
  }

  restart() {
    this.saveProgress();
    this.reset();
    this.loop.start();
  }

  update(delta) {
    this.frame += delta * 60;
    this.time += delta;
    this.updateParticles(delta);
    if (this.shakeTime > 0) this.shakeTime -= delta;
    if (this.status === 'countdown') this.updateCountdown(delta);
    if (this.race) this.updateRace(delta);
    if (this.status !== 'running') return;

    this.speed = this.speedAt(this.distancePx);
    if (this.stumbleTime > 0) this.stumbleTime = Math.max(0, this.stumbleTime - delta);
    const turboTarget = this.turboHeld ? 1 : 0;
    this.turboAmount += (turboTarget - this.turboAmount) * Math.min(1, delta * TURBO_EASE);
    const step = this.effectiveSpeed * delta;
    this.turboBonusPx += step * this.turboAmount;
    this.distancePx += step;

    this.updatePlayer(delta);
    this.updateEntities(step);
    this.spawnEntities();
    this.collectCoins();
    this.checkGoal();
    if (this.status === 'running' && this.stumbleTime <= 0 && this.hitsObstacle()) {
      if (this.race) this.stumble();
      else this.gameOver();
    }
    this.updateHud();
  }

  updatePlayer(delta) {
    const { physics } = this.dino;
    const player = this.player;
    this.input.duckTimer = Math.max(0, this.input.duckTimer - delta);
    this.input.jumpBuffer = Math.max(0, this.input.jumpBuffer - delta);
    const wantsDuck = this.input.duckHeld || this.input.duckTimer > 0;

    if (this.input.jumpBuffer > 0 && player.onGround) {
      player.velocity = physics.jumpVelocity;
      player.onGround = false;
      this.input.jumpBuffer = 0;
      sounds.jump();
      this.spawnDust();
    }

    if (!player.onGround) {
      const gravity = physics.gravity * (wantsDuck ? FAST_FALL_MULTIPLIER : 1);
      player.velocity -= gravity * delta;
      player.height += player.velocity * delta;
      if (player.height <= 0) {
        player.height = 0;
        player.velocity = 0;
        player.onGround = true;
        this.spawnDust();
      }
    }
    player.ducking = wantsDuck && player.onGround;
  }

  updateEntities(step) {
    this.obstacles.forEach((obstacle) => (obstacle.x -= step * (obstacle.flyer ? 1.12 : 1)));
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -20);
    this.coins.forEach((coin) => (coin.x -= step));
    this.coins = this.coins.filter((coin) => coin.x > -20 && !coin.collected);
  }

  /**
   * En carrera la pista no depende de cómo juegue cada uno: los obstáculos van en distancias fijas
   * (con la velocidad base, sin turbo) y los números salen de la semilla compartida.
   */
  spawnEntities() {
    if (this.distancePx < this.nextSpawnPx) return;
    const spawnAt = this.race ? this.nextSpawnPx : this.distancePx;
    const canFly = Math.floor(spawnAt * METERS_PER_PIXEL) >= this.world.flyersFrom;
    const isFlyer = canFly && this.courseRandom() < FLYER_CHANCE;
    const kind = isFlyer ? this.world.flyer : this.coursePick(this.world.ground);
    const [w, h] = OBSTACLE_SIZES[kind];
    const bottom = isFlyer ? (this.courseRandom() < 0.5 ? HIGH_FLYER_BOTTOM : LOW_FLYER_BOTTOM) : GROUND_Y;
    const spawnX = VIEW_WIDTH + 30 - (this.distancePx - spawnAt);
    this.obstacles.push({ kind, x: spawnX, y: bottom - h, w, h, flyer: isFlyer });

    // El hueco se mide en segundos de reacción para que siga siendo justo a cualquier velocidad.
    const gapSpeed = this.race ? this.speedAt(spawnAt) : this.effectiveSpeed;
    const gap = gapSpeed * this.courseRange(1.05, 1.9);
    this.nextSpawnPx = spawnAt + gap;

    if (this.courseRandom() < COIN_ROW_CHANCE) this.spawnCoinRow(spawnX + gap / 2);
  }

  spawnCoinRow(centerX) {
    const count = 3;
    const isArc = this.courseRandom() < 0.5;
    const baseHeight = isArc ? 70 : this.coursePick([30, 95]);
    for (let index = 0; index < count; index += 1) {
      const offset = index - (count - 1) / 2;
      const arcLift = isArc ? (1 - Math.abs(offset)) * 40 : 0;
      this.coins.push({ x: centerX + offset * 32, y: GROUND_Y - baseHeight - arcLift, collected: false });
    }
  }

  getPlayerHitbox() {
    const { scale } = this.dino.physics;
    const { ducking, height } = this.player;
    const w = (ducking ? DINO_SIZE.duckWidth : DINO_SIZE.width) * scale;
    const h = (ducking ? DINO_SIZE.duckHeight : DINO_SIZE.height) * scale;
    return {
      x: DINO_X + HITBOX_PADDING,
      y: GROUND_Y - height - h + HITBOX_PADDING,
      w: w - HITBOX_PADDING * 2,
      h: h - HITBOX_PADDING,
    };
  }

  hitsObstacle() {
    const hitbox = this.getPlayerHitbox();
    return this.obstacles.some((obstacle) =>
      rectsOverlap(hitbox, { x: obstacle.x + 4, y: obstacle.y + 4, w: obstacle.w - 8, h: obstacle.h - 6 }),
    );
  }

  collectCoins() {
    const hitbox = this.getPlayerHitbox();
    this.coins.forEach((coin) => {
      const box = { x: coin.x - COIN_RADIUS, y: coin.y - COIN_RADIUS, w: COIN_RADIUS * 2, h: COIN_RADIUS * 2 };
      if (coin.collected || !rectsOverlap(hitbox, box)) return;
      coin.collected = true;
      this.coinsThisRun += 1;
      sounds.coin();
      this.spawnSparkles(coin.x, coin.y, '#ffd93d', 8);
    });
  }

  checkGoal() {
    if (this.worldCleared || this.meters < this.world.goal) return;
    this.worldCleared = true;
    if (this.race) {
      this.finishRace();
      return;
    }
    const data = getGameData('dino');
    const nextWorld = Math.min(this.worldIndex + 1, DINO_WORLDS.length - 1);
    updateGameData('dino', { unlockedWorld: Math.max(data.unlockedWorld, nextWorld) });
    sounds.win();
    const isLastWorld = this.worldIndex === DINO_WORLDS.length - 1;
    this.showBanner(isLastWorld ? '🏆 ¡Completaste todos los mundos!' : `🎉 ¡Desbloqueaste ${DINO_WORLDS[nextWorld].name}!`, 2600);
    this.spawnConfetti();
  }

  gameOver() {
    this.status = 'over';
    this.shakeTime = 0.3;
    sounds.hit();
    this.spawnSparkles(DINO_X + 30, GROUND_Y - this.player.height - 30, '#ff5f5f', 14);
    const isNewRecord = this.saveProgress();
    this.updateHud();

    this.gameOverTimer = setTimeout(() => {
      this.loop.stop();
      if (isNewRecord) sounds.levelUp();
      else sounds.gameOver();
      const nextWorld = DINO_WORLDS[this.worldIndex + 1];
      const canGoNext = this.worldCleared && nextWorld;
      showModal({
        emoji: this.worldCleared ? '🎉' : isNewRecord ? '🏆' : '💥',
        title: this.worldCleared ? '¡Mundo superado!' : isNewRecord ? '¡Nuevo récord!' : '¡Ups! Chocaste',
        message: this.worldCleared
          ? `${this.dinoName} recorrió todo ${this.world.name}.`
          : `A ${this.dinoName} le faltaron ${Math.max(0, this.world.goal - this.meters)} m para la meta.`,
        tone: this.worldCleared || isNewRecord ? 'success' : 'neutral',
        stats: [
          { label: 'Metros', value: this.meters },
          { label: 'Monedas', value: this.coinsThisRun },
          { label: 'Puntos', value: this.score },
          { label: 'Récord', value: this.best },
        ],
        actions: [
          canGoNext
            ? { label: `Ir a ${nextWorld.name} ${nextWorld.emoji}`, variant: 'primary', onClick: () => navigate(`/dino/jugar?mundo=${this.worldIndex + 1}`) }
            : { label: 'Jugar otra vez 🔁', variant: 'primary', onClick: () => this.restart() },
          canGoNext ? { label: 'Otra vez 🔁', onClick: () => this.restart() } : null,
          { label: 'Cambiar dino', onClick: () => navigate('/dino') },
        ].filter(Boolean),
      });
    }, GAME_OVER_DELAY_MS);
  }

  /** Guarda monedas y récord una sola vez por partida. Devuelve true si hubo récord nuevo. */
  saveProgress() {
    if (this.progressSaved) return false;
    this.progressSaved = true;
    const data = getGameData('dino');
    // En carrera solo se guardan las monedas: ni récord ni mundos.
    if (this.race) {
      updateGameData('dino', { coins: data.coins + this.coinsThisRun });
      return false;
    }
    const isNewRecord = this.score > data.bestScore;
    this.best = Math.max(data.bestScore, this.score);
    updateGameData('dino', { bestScore: this.best, coins: data.coins + this.coinsThisRun });
    return isNewRecord;
  }

  updateHud() {
    if (this.race) {
      const finishMs = this.match?.finishes.get(this.match.myId);
      const myTime = finishMs ?? (this.raceStartedAt ? performance.now() - this.raceStartedAt : 0);
      // El puesto usa la última posición recibida (sin adelantar), para no dar ventaja por la predicción.
      const place = this.match?.placeOf(this.distancePx, (rival) => rival.pos?.d ?? 0) ?? 1;
      this.header.set('distance', `${Math.min(this.meters, this.world.goal)}/${this.world.goal}`);
      this.header.set('place', this.raceStartedAt ? placeLabel(place) : '—');
      this.header.set('coins', this.coinsThisRun);
      this.header.set('time', `${Math.floor(myTime / 1000)} s`);
      return;
    }
    this.header.set('distance', this.meters);
    this.header.set('coins', this.coinsThisRun);
    this.header.set('score', this.score);
    this.header.set('best', Math.max(this.best, this.score));
  }

  // ---------- Carrera con amigos ----------

  startRaceSession() {
    this.match
      .on('countdown', (seed) => this.startCountdown(seed))
      .on('finish', () => this.refreshPodium())
      .on('result', () => this.handleResult())
      .on('rematch', () => this.resetRace())
      .on('left', (rival) => this.handleRivalLeft(rival))
      .on('closed', () => this.handleRoomClosed());
    this.resetRace();
  }

  get rivalList() {
    return [...this.match.rivals.values()];
  }

  /** Deja todo listo en la salida y avisa a los demás; la anfitriona da la señal cuando todos están listos. */
  resetRace() {
    clearTimeout(this.podiumRefreshTimer);
    clearTimeout(this.podiumTimer);
    closeModal();
    this.saveProgress();
    this.podiumOpen = false;
    this.raceStartedAt = null;
    this.posTimer = 0;
    this.goLabelTime = 0;
    this.rivalList.forEach((rival) => (rival.shown = null));
    this.match.reset();
    this.reset();
    this.status = 'waiting';
    const rivals = this.match.activeRivals;
    this.hintTitle.textContent = rivals.length === 1 ? `Esperando a ${rivals[0].name}…` : 'Esperando a los demás…';
    this.hintText.textContent = `Primero en recorrer ${this.world.goal} m gana. Si chocas, solo tropiezas. ¡A correr!`;
    this.loop.start();
  }

  startCountdown(seed) {
    this.courseRandom = createRandom(seed);
    this.countdown = COUNTDOWN_SECONDS;
    this.hint.hidden = true;
    // Si justo estaba en pausa, la cuenta atrás espera a que vuelva.
    if (this.status === 'paused') {
      this.pausedFrom = 'countdown';
      return;
    }
    this.status = 'countdown';
    sounds.click();
  }

  updateCountdown(delta) {
    const before = Math.ceil(this.countdown);
    this.countdown -= delta;
    if (this.countdown > 0) {
      if (Math.ceil(this.countdown) !== before) sounds.click();
      return;
    }
    // El tiempo de cada uno se mide desde su propia salida: la demora de internet no cuenta.
    this.status = 'running';
    this.raceStartedAt = performance.now();
    this.goLabelTime = GO_LABEL_SECONDS;
    sounds.levelUp();
  }

  updateRace(delta) {
    if (this.goLabelTime > 0) this.goLabelTime -= delta;
    this.rivalList.forEach((rival) => this.updateRival(rival, delta));
    if (this.status !== 'running' && this.status !== 'finished') return;
    this.posTimer -= delta;
    if (this.posTimer > 0) return;
    this.posTimer = POS_SEND_SECONDS;
    const { height, ducking } = this.player;
    this.match.sendPos({ d: this.distancePx, h: height, duck: ducking, hurt: this.stumbleTime > 0 });
  }

  /** Cada rival llega unas 15 veces por segundo: se suaviza y se adelanta un poco para que no dé tirones. */
  updateRival(rival, delta) {
    const pos = rival.pos;
    if (!pos) return;
    const isMoving = !pos.hurt && !this.match.hasFinished(rival.id);
    const sinceUpdate = (performance.now() - rival.receivedAt) / 1000;
    const goalD = pos.d + (isMoving ? Math.min(sinceUpdate, RIVAL_PREDICT_SECONDS) * this.speedAt(pos.d) : 0);
    if (!rival.shown || Math.abs(goalD - rival.shown.d) > RIVAL_SNAP_DISTANCE) {
      rival.shown = { d: goalD, h: pos.h };
      return;
    }
    const follow = Math.min(1, delta * RIVAL_FOLLOW_RATE);
    rival.shown.d += (goalD - rival.shown.d) * follow;
    rival.shown.h += (pos.h - rival.shown.h) * follow;
  }

  rivalProgress(rival) {
    if (this.match.hasFinished(rival.id)) return 1;
    return rival.shown ? clamp((rival.shown.d * METERS_PER_PIXEL) / this.world.goal, 0, 1) : 0;
  }

  stumble() {
    this.stumbleTime = STUMBLE_SECONDS;
    this.shakeTime = 0.25;
    sounds.hit();
    this.spawnSparkles(DINO_X + 30, GROUND_Y - this.player.height - 30, '#ff5f5f', 10);
  }

  finishRace() {
    this.status = 'finished';
    this.turboHeld = false;
    sounds.win();
    this.spawnConfetti();
    this.match.finish(performance.now() - this.raceStartedAt);
    this.finishedAt = performance.now();
    this.saveProgress();
    this.updateHud();
    if (!this.match.activeRivals.length) {
      this.podiumTimer = setTimeout(() => this.showRaceAlone(), FINISH_MODAL_DELAY_MS);
      return;
    }
    if (this.match.result) {
      this.podiumTimer = setTimeout(() => this.showPodium(), FINISH_MODAL_DELAY_MS);
      return;
    }
    this.showBanner('🏁 ¡Meta! Esperando a los demás…', 1500);
  }

  /** Todos ganan: la carrera cuenta para todos y la copa es para quien llegó primero. */
  handleResult() {
    const data = getGameData('dino');
    updateGameData('dino', { racesPlayed: data.racesPlayed + 1, raceWins: data.raceWins + (this.match.didWin() ? 1 : 0) });
    if (this.status === 'finished') {
      const wait = Math.max(0, FINISH_MODAL_DELAY_MS - (performance.now() - this.finishedAt));
      this.podiumTimer = setTimeout(() => this.showPodium(), wait);
      return;
    }
    const winner = this.match.playerName(this.match.result[0]);
    this.showBanner(`🏆 ¡${winner} llegó primero! ¡Sigue hasta la meta!`, 2400);
  }

  showPodium() {
    this.loop.stop();
    this.podiumOpen = true;
    clearTimeout(this.podiumRefreshTimer);
    const rematchIn = showRacePodium({
      match: this.match,
      extraMessage: this.coinsThisRun ? `Te llevas ${this.coinsThisRun} 🪙.` : '',
      trophies: getGameData('dino').raceWins,
      onRematch: () => this.requestRematch(),
      exitPath: '/dino',
    });
    // Si aún hay alguien corriendo, el podio se actualiza solo cuando ya se pueda pedir la revancha.
    if (Number.isFinite(rematchIn) && rematchIn > 0) this.podiumRefreshTimer = setTimeout(() => this.refreshPodium(), rematchIn + 50);
  }

  /** Si el podio está abierto y llega alguien más, se actualiza la tabla. */
  refreshPodium() {
    if (this.podiumOpen && this.status === 'finished') this.showPodium();
  }

  requestRematch() {
    if (!this.match.activeRivals.length) {
      this.showRaceAlone();
      return;
    }
    this.match.requestRematch();
    this.resetRace();
  }

  handleRivalLeft(rival) {
    this.showBanner(`👋 ${rival.name} se fue`, 2200);
    if (this.match.activeRivals.length) {
      if (this.podiumOpen) this.showPodium();
      return;
    }
    this.handleEveryoneLeft();
  }

  handleRoomClosed() {
    this.showBanner('👋 La sala se cerró', 2200);
    this.handleEveryoneLeft();
  }

  /** Si se fueron todos: antes de salir se avisa; en plena carrera se puede seguir hasta la meta. */
  handleEveryoneLeft() {
    if (!this.raceStartedAt) {
      this.status = 'paused';
      this.loop.stop();
      showRaceEnded({
        title: 'Se fueron todos',
        message: 'Se cortó la conexión. Pueden crear otra sala cuando quieran.',
        newRacePath: `/dino/carrera?mundo=${this.worldIndex}`,
        exitPath: '/dino',
      });
      return;
    }
    if (this.status === 'finished' && !this.match.result) {
      clearTimeout(this.podiumTimer);
      this.showRaceAlone();
    } else if (this.podiumOpen) {
      this.showPodium();
    }
  }

  showRaceAlone() {
    this.loop.stop();
    showRaceEnded({
      title: this.status === 'finished' ? '¡Llegaste a la meta!' : 'Se fueron todos',
      message: 'Ya no queda nadie en la sala, así que esta vez no hay copa.',
      stats: this.match.hasFinished()
        ? [
            { label: 'Tiempo', value: formatRaceTime(this.match.finishes.get(this.match.myId)) },
            { label: 'Monedas', value: this.coinsThisRun },
          ]
        : [],
      newRacePath: `/dino/carrera?mundo=${this.worldIndex}`,
      exitPath: '/dino',
    });
  }

  /** Cada rival es un dino fantasma; si va fuera de la pantalla, una flecha en el borde. */
  drawRival(rival, index) {
    if (!rival.shown || rival.gone) return;
    if (rival.pos?.hurt && Math.floor(this.time * 12) % 2 === 0) return;
    const ctx = this.ctx;
    const x = DINO_X + (rival.shown.d - this.distancePx);
    ctx.font = '600 13px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (x < -60 || x > VIEW_WIDTH) {
      const isAhead = x > 0;
      const edgeX = isAhead ? VIEW_WIDTH - 40 : 40;
      const edgeY = 60 + index * 34;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(edgeX - 32, edgeY - 14, 64, 28, 14);
      ctx.fill();
      ctx.fillStyle = rival.dino.colors.accent;
      ctx.fillText(isAhead ? `${rival.avatar} ▶` : `◀ ${rival.avatar}`, edgeX, edgeY + 1);
      ctx.textBaseline = 'alphabetic';
      return;
    }
    const footY = GROUND_Y - rival.shown.h;
    const ducking = Boolean(rival.pos?.duck);
    ctx.save();
    ctx.globalAlpha = RIVAL_ALPHA;
    drawDino(ctx, rival.dino, { x, y: footY, frame: this.frame, ducking, onGround: rival.shown.h < 1 });
    ctx.restore();
    const labelY = Math.max(NAME_LABEL_MIN_Y, footY - (ducking ? 52 : 86) * rival.dino.physics.scale);
    const label = `${rival.avatar} ${rival.label}`;
    const labelWidth = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x + 30 - labelWidth / 2, labelY - 10, labelWidth, 20, 10);
    ctx.fill();
    ctx.fillStyle = rival.dino.colors.accent;
    ctx.fillText(label, x + 30, labelY + 1);
    ctx.textBaseline = 'alphabetic';
  }

  drawCountdown() {
    if (!this.race) return;
    let text = null;
    if (this.status === 'countdown' || (this.status === 'paused' && this.pausedFrom === 'countdown')) text = String(Math.max(1, Math.ceil(this.countdown)));
    else if (this.goLabelTime > 0) text = '¡YA!';
    if (!text) return;
    const ctx = this.ctx;
    ctx.font = '700 96px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(43, 33, 64, 0.4)';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(text, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 20);
    ctx.fillText(text, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 20);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // ---------- Partículas ----------

  spawnDust() {
    for (let index = 0; index < 5; index += 1) {
      this.particles.push({
        x: DINO_X + 20,
        y: GROUND_Y,
        vx: random(-80, -20),
        vy: random(-60, -10),
        life: 0.4,
        maxLife: 0.4,
        size: random(2, 4),
        color: this.world.palette.groundDetail,
      });
    }
  }

  spawnSparkles(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      this.particles.push({ x, y, vx: Math.cos(angle) * 140, vy: Math.sin(angle) * 140, life: 0.5, maxLife: 0.5, size: 3, color });
    }
  }

  spawnConfetti() {
    const colors = ['#ff5fa2', '#ffd93d', '#4dd4ac', '#5ab0ff', '#b57bff'];
    for (let index = 0; index < 70; index += 1) {
      this.confetti.push({
        x: random(0, VIEW_WIDTH),
        y: random(-120, -10),
        vx: random(-40, 40),
        vy: random(80, 180),
        rotation: random(0, Math.PI),
        spin: random(-6, 6),
        color: pick(colors),
        life: 3,
      });
    }
  }

  updateParticles(delta) {
    this.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 300 * delta;
      particle.life -= delta;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.confetti.forEach((piece) => {
      piece.x += piece.vx * delta;
      piece.y += piece.vy * delta;
      piece.rotation += piece.spin * delta;
      piece.life -= delta;
    });
    this.confetti = this.confetti.filter((piece) => piece.life > 0 && piece.y < VIEW_HEIGHT + 20);
  }

  // ---------- Dibujo ----------

  get nightAmount() {
    if (this.world.alwaysNight) return 1;
    const wave = Math.sin((this.time / DAY_CYCLE_SECONDS) * Math.PI * 2 - Math.PI / 2);
    return clamp(wave * 1.4 - 0.2, 0, 1) * 0.85;
  }

  render() {
    const ctx = this.ctx;
    const { palette } = this.world;
    const night = this.nightAmount;

    ctx.save();
    if (this.shakeTime > 0) ctx.translate(random(-5, 5), random(-4, 4));

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, VIEW_WIDTH + 20, GROUND_Y + 10);

    this.drawSunAndMoon(night);
    if (!this.world.alwaysNight) this.drawClouds();
    this.drawHills(palette.far, 0.12, 70, 0.006, 38);
    this.drawHills(palette.near, 0.3, 38, 0.011, 22);

    if (night > 0 && !this.world.alwaysNight) {
      ctx.fillStyle = `rgba(20, 16, 60, ${night * 0.55})`;
      ctx.fillRect(-10, -10, VIEW_WIDTH + 20, GROUND_Y + 10);
    }
    if (night > 0.3) this.drawStars(night);

    this.drawGround();
    this.drawCoins();
    this.obstacles.forEach((obstacle) => drawObstacle(ctx, obstacle.kind, obstacle.x, obstacle.y, palette, this.frame));
    this.drawTurbo();
    if (this.race) this.rivalList.forEach((rival, index) => this.drawRival(rival, index));
    this.drawPlayer();
    this.drawParticles();
    this.drawWeather();
    this.drawProgress();
    this.drawCountdown();

    ctx.restore();
  }

  drawSunAndMoon(night) {
    const ctx = this.ctx;
    const sunY = 60 + night * 160;
    ctx.fillStyle = this.world.palette.sun;
    ctx.globalAlpha = 1 - night * 0.8;
    ctx.beginPath();
    ctx.arc(660, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (1 - night) * 0.25;
    ctx.beginPath();
    ctx.arc(660, sunY, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (night > 0.2) {
      const moonY = 220 - night * 160;
      ctx.globalAlpha = night;
      ctx.fillStyle = '#fff6d6';
      ctx.beginPath();
      ctx.arc(MOON_X, moonY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30, 24, 80, 0.35)';
      ctx.beginPath();
      ctx.arc(MOON_X + 10, moonY - 6, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawClouds() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.clouds.forEach((cloud) => {
      const span = VIEW_WIDTH + 200;
      const x = ((((cloud.x - this.distancePx * 0.08) % span) + span) % span) - 100;
      ctx.beginPath();
      ctx.arc(x, cloud.y, 16 * cloud.s, 0, Math.PI * 2);
      ctx.arc(x + 20 * cloud.s, cloud.y - 8 * cloud.s, 20 * cloud.s, 0, Math.PI * 2);
      ctx.arc(x + 42 * cloud.s, cloud.y, 15 * cloud.s, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawHills(color, parallax, amplitude, frequency, baseLift) {
    const ctx = this.ctx;
    const offset = this.distancePx * parallax;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= VIEW_WIDTH; x += 10) {
      const worldX = x + offset;
      const wave = Math.sin(worldX * frequency) * 0.6 + Math.sin(worldX * frequency * 2.3 + 1.7) * 0.4;
      ctx.lineTo(x, GROUND_Y - baseLift - (wave + 1) * amplitude * 0.5);
    }
    ctx.lineTo(VIEW_WIDTH, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  drawStars(night) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    this.stars.forEach((star) => {
      ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(this.time * 2 + star.t));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  drawGround() {
    const ctx = this.ctx;
    const { palette } = this.world;
    ctx.fillStyle = palette.ground;
    ctx.fillRect(-10, GROUND_Y, VIEW_WIDTH + 20, VIEW_HEIGHT - GROUND_Y + 10);
    ctx.fillStyle = palette.groundDetail;
    ctx.fillRect(-10, GROUND_Y, VIEW_WIDTH + 20, 3);
    const spacing = 46;
    const offset = this.distancePx % spacing;
    for (let x = -offset; x < VIEW_WIDTH; x += spacing) {
      const row = Math.floor((x + this.distancePx) / spacing) % 3;
      ctx.fillRect(x, GROUND_Y + 12 + row * 10, 14 - row * 3, 3);
    }
  }

  drawCoins() {
    const ctx = this.ctx;
    this.coins.forEach((coin, index) => {
      const bob = Math.sin(this.time * 5 + index) * 3;
      const squash = Math.abs(Math.cos(this.time * 4 + index));
      ctx.fillStyle = '#f4a100';
      ctx.beginPath();
      ctx.ellipse(coin.x, coin.y + bob, COIN_RADIUS * (0.4 + squash * 0.6), COIN_RADIUS, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.ellipse(coin.x, coin.y + bob, COIN_RADIUS * (0.4 + squash * 0.6) * 0.65, COIN_RADIUS * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Rayas de velocidad y estela de fuego detrás del dino mientras el turbo está activo. */
  drawTurbo() {
    if (this.turboAmount < 0.03) return;
    const ctx = this.ctx;
    const shift = this.distancePx * 1.5;
    ctx.globalAlpha = this.turboAmount * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    this.speedLines.forEach((line) => {
      const span = VIEW_WIDTH + line.length;
      const x = VIEW_WIDTH - ((((line.x + shift) % span) + span) % span);
      ctx.moveTo(x, line.y);
      ctx.lineTo(x + line.length, line.y);
    });
    ctx.stroke();

    const centerY = GROUND_Y - this.player.height - 30;
    const flame = ctx.createRadialGradient(DINO_X, centerY, 4, DINO_X, centerY, 46);
    flame.addColorStop(0, 'rgba(255, 217, 61, 0.9)');
    flame.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.globalAlpha = this.turboAmount * (0.75 + Math.sin(this.time * 30) * 0.15);
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(DINO_X - 4, centerY, 46, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawPlayer() {
    const ctx = this.ctx;
    const { height, ducking, onGround } = this.player;
    const isRunning = this.status === 'running';
    const footY = GROUND_Y - height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(DINO_X + 28, GROUND_Y + 2, Math.max(8, 24 - height * 0.1), 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Al tropezar, el dino parpadea.
    const isBlinking = this.stumbleTime > 0 && Math.floor(this.time * 12) % 2 === 0;
    if (!isBlinking) {
      drawDino(ctx, this.dino, {
        x: DINO_X,
        y: footY,
        frame: isRunning ? this.frame : 0,
        ducking,
        onGround,
        hurt: this.status === 'over' || this.stumbleTime > 0,
      });
    }

    const labelY = Math.max(NAME_LABEL_MIN_Y, footY - (ducking ? 52 : 86) * this.dino.physics.scale);
    ctx.font = '600 13px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelWidth = ctx.measureText(this.dinoName).width + 14;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(DINO_X + 30 - labelWidth / 2, labelY - 14, labelWidth, 20, 10);
    ctx.fill();
    ctx.fillStyle = this.dino.colors.accent;
    ctx.fillText(this.dinoName, DINO_X + 30, labelY + 1);
    ctx.textAlign = 'start';
  }

  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
    this.confetti.forEach((piece) => {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    });
  }

  drawWeather() {
    const kind = this.world.particles;
    if (!kind || kind === 'stars') return;
    const ctx = this.ctx;
    const count = kind === 'snow' ? 40 : 18;
    for (let index = 0; index < count; index += 1) {
      const seed = index * 97.13;
      const fall = kind === 'embers' ? -1 : 1;
      const speedY = 20 + (seed % 30);
      const x = (((seed * 7 - this.distancePx * (kind === 'leaves' ? 0.6 : 0.3) + Math.sin(this.time + seed) * 20) % VIEW_WIDTH) + VIEW_WIDTH) % VIEW_WIDTH;
      const y = (((seed * 3 + fall * this.time * speedY) % VIEW_HEIGHT) + VIEW_HEIGHT) % VIEW_HEIGHT;
      if (kind === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (index % 3), 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'embers') {
        ctx.fillStyle = index % 2 ? '#ffd93d' : '#ff7a3d';
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.time * 3 + index);
        ctx.fillRect(x, y, 3, 3);
        ctx.globalAlpha = 1;
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.time * 2 + index);
        ctx.fillStyle = index % 2 ? '#7be08f' : '#3fbf6b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawProgress() {
    const ctx = this.ctx;
    const trackX = 20;
    const trackY = 16;
    const trackWidth = VIEW_WIDTH - 40;
    const progress = this.myProgress;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackWidth, 10, 5);
    ctx.fill();
    ctx.fillStyle = this.worldCleared ? '#4dd4ac' : this.dino.colors.body;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, Math.max(10, trackWidth * progress), 10, 5);
    ctx.fill();
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁', trackX + trackWidth - 4, trackY + 9);
    if (this.race) {
      this.rivalList
        .filter((rival) => !rival.gone)
        .forEach((rival) => this.drawTrackMarker(trackX + trackWidth * this.rivalProgress(rival), trackY + 5, rival.avatar, rival.dino.colors.body));
      this.drawTrackMarker(trackX + trackWidth * progress, trackY + 5, getActivePlayer()?.avatar ?? '⭐', this.dino.colors.body);
    }
    ctx.textAlign = 'start';
  }

  get myProgress() {
    return clamp(this.meters / this.world.goal, 0, 1);
  }

  drawTrackMarker(x, y, emoji, color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }

  destroy() {
    clearTimeout(this.gameOverTimer);
    if (this.race) {
      clearTimeout(this.podiumTimer);
      clearTimeout(this.podiumRefreshTimer);
      this.match.destroy();
      leaveRoom();
    }
    if (this.status === 'running' || this.status === 'paused') this.saveProgress();
    closeModal();
    this.loop.destroy();
    this.unbinders.forEach((unbind) => unbind());
  }
}

export function mountDinoGame(root, params) {
  const game = new DinoGame(root, params);
  return () => game.destroy();
}
