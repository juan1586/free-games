import { createGameLoop } from '../../core/gameLoop.js';
import { setupCanvas } from '../../core/canvas.js';
import { bindHoldButton, bindKeyboard, bindTouchGestures } from '../../core/input.js';
import { sounds } from '../../core/audio.js';
import { getGameData, sanitizeName, updateGameData } from '../../core/player.js';
import { createBanner, createGameHeader } from '../../ui/hud.js';
import { closeModal, showModal } from '../../ui/modal.js';
import { el, navigate } from '../../ui/dom.js';
import { DINO_SIZE, drawDino, getDino } from './dinos.js';
import { DINO_WORLDS, OBSTACLE_SIZES, drawObstacle } from './worlds.js';

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

const HIGH_FLYER_BOTTOM = GROUND_Y - 44;
const LOW_FLYER_BOTTOM = GROUND_Y - 6;

const random = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class DinoGame {
  constructor(root, { worldIndex }) {
    const data = getGameData('dino');
    this.worldIndex = clamp(worldIndex, 0, data.unlockedWorld);
    this.world = DINO_WORLDS[this.worldIndex];
    this.dino = getDino(data.dinoType);
    this.dinoName = sanitizeName(data.dinoName) || this.dino.name;
    this.best = data.bestScore;

    this.buildDom(root);
    this.ctx = setupCanvas(this.canvas, VIEW_WIDTH, VIEW_HEIGHT);
    this.stars = Array.from({ length: 60 }, () => ({ x: random(0, VIEW_WIDTH), y: random(0, GROUND_Y - 60), r: random(0.6, 1.8), t: random(0, 6) }));
    this.clouds = Array.from({ length: 5 }, (_, index) => ({ x: index * 190 + random(0, 80), y: random(30, 110), s: random(0.7, 1.2) }));

    this.loop = createGameLoop({
      update: (delta) => this.update(delta),
      render: () => this.render(),
      onAutoPause: () => this.pause(),
    });
    this.unbinders = this.bindControls();
    this.reset();
    this.loop.start();
  }

  buildDom(root) {
    this.header = createGameHeader({
      title: `${this.world.emoji} ${this.world.name}`,
      backPath: '/dino',
      onPause: () => this.pause(),
      items: [
        { key: 'distance', label: 'Metros', icon: '📏', value: 0 },
        { key: 'coins', label: 'Monedas', icon: '🪙', value: 0 },
        { key: 'score', label: 'Puntos', icon: '⭐', value: 0 },
        { key: 'best', label: 'Récord', icon: '🏆', value: this.best },
      ],
    });

    this.canvas = el('canvas', {
      className: 'stage__canvas stage__canvas--dino',
      attrs: { width: VIEW_WIDTH, height: VIEW_HEIGHT, 'aria-label': 'Juego del dinosaurio' },
    });
    this.hint = el('div', { className: 'stage__hint' }, [
      el('strong', { text: '¡Toca o pulsa Espacio para empezar!' }),
      el('span', { text: '⬆️ / Espacio: saltar · ⬇️: agacharse · P: pausa' }),
    ]);
    const stage = el('div', { className: `stage stage--dino world--${this.world.id}` }, [this.canvas, this.hint]);
    this.showBanner = createBanner(stage);

    this.jumpButton = el('button', { className: 'touch-btn touch-btn--jump', text: '⬆️ Saltar', attrs: { type: 'button' } });
    this.duckButton = el('button', { className: 'touch-btn touch-btn--duck', text: '⬇️ Agachar', attrs: { type: 'button' } });
    const touchControls = el('div', { className: 'touch-controls touch-controls--dino' }, [this.duckButton, this.jumpButton]);

    root.append(el('main', { className: 'page game-page' }, [this.header.element, stage, touchControls]));
  }

  bindControls() {
    const pressAction = (action) => {
      if (action === 'jump') this.requestJump();
      if (action === 'duck') this.input.duckHeld = true;
      if (action === 'pause') this.pause();
    };
    const releaseAction = (action) => {
      if (action === 'duck') this.input.duckHeld = false;
    };

    return [
      bindKeyboard(
        { jump: ['Space', 'ArrowUp', 'KeyW'], duck: ['ArrowDown', 'KeyS'], pause: ['KeyP', 'Escape'] },
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
    this.worldCleared = false;
    this.shakeTime = 0;
    this.progressSaved = false;
    this.hint.hidden = false;
    this.updateHud();
  }

  get meters() {
    return Math.floor(this.distancePx * METERS_PER_PIXEL);
  }

  get score() {
    return this.meters + this.coinsThisRun * COIN_VALUE;
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
    if (this.status !== 'running' && this.status !== 'ready') return;
    this.pausedFrom = this.status;
    this.status = 'paused';
    this.loop.stop();
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
    if (this.status !== 'running') return;

    const { start, max } = this.world.speed;
    const acceleration = (max - start) / (this.world.goal * 1.4);
    this.speed = Math.min(max, start + this.meters * acceleration);
    const step = this.speed * delta;
    this.distancePx += step;

    this.updatePlayer(delta);
    this.updateEntities(step);
    this.spawnEntities();
    this.collectCoins();
    this.checkGoal();
    if (this.hitsObstacle()) this.gameOver();
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

  spawnEntities() {
    if (this.distancePx < this.nextSpawnPx) return;
    const canFly = this.meters >= this.world.flyersFrom;
    const isFlyer = canFly && Math.random() < FLYER_CHANCE;
    const kind = isFlyer ? this.world.flyer : pick(this.world.ground);
    const [w, h] = OBSTACLE_SIZES[kind];
    const bottom = isFlyer ? (Math.random() < 0.5 ? HIGH_FLYER_BOTTOM : LOW_FLYER_BOTTOM) : GROUND_Y;
    const spawnX = VIEW_WIDTH + 30;
    this.obstacles.push({ kind, x: spawnX, y: bottom - h, w, h, flyer: isFlyer });

    // El hueco se mide en segundos de reacción para que siga siendo justo a cualquier velocidad.
    const gap = this.speed * random(1.05, 1.9);
    this.nextSpawnPx = this.distancePx + gap;

    if (Math.random() < COIN_ROW_CHANCE) this.spawnCoinRow(spawnX + gap / 2);
  }

  spawnCoinRow(centerX) {
    const count = 3;
    const isArc = Math.random() < 0.5;
    const baseHeight = isArc ? 70 : pick([30, 95]);
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
    const isNewRecord = this.score > data.bestScore;
    this.best = Math.max(data.bestScore, this.score);
    updateGameData('dino', { bestScore: this.best, coins: data.coins + this.coinsThisRun });
    return isNewRecord;
  }

  updateHud() {
    this.header.set('distance', this.meters);
    this.header.set('coins', this.coinsThisRun);
    this.header.set('score', this.score);
    this.header.set('best', Math.max(this.best, this.score));
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
    this.drawPlayer();
    this.drawParticles();
    this.drawWeather();
    this.drawProgress();

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

  drawPlayer() {
    const ctx = this.ctx;
    const { height, ducking, onGround } = this.player;
    const isRunning = this.status === 'running';
    const footY = GROUND_Y - height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(DINO_X + 28, GROUND_Y + 2, Math.max(8, 24 - height * 0.1), 4, 0, 0, Math.PI * 2);
    ctx.fill();

    drawDino(ctx, this.dino, {
      x: DINO_X,
      y: footY,
      frame: isRunning ? this.frame : 0,
      ducking,
      onGround,
      hurt: this.status === 'over',
    });

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
    const progress = clamp(this.meters / this.world.goal, 0, 1);
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
    ctx.textAlign = 'start';
  }

  destroy() {
    clearTimeout(this.gameOverTimer);
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
