import { createGameLoop } from '../../core/gameLoop.js';
import { setupCanvas } from '../../core/canvas.js';
import { bindHoldButton, bindKeyboard } from '../../core/input.js';
import { createMusicLoop, sounds } from '../../core/audio.js';
import { getGameData, updateGameData } from '../../core/player.js';
import { createBanner, createGameHeader } from '../../ui/hud.js';
import { closeModal, showModal } from '../../ui/modal.js';
import { el, navigate } from '../../ui/dom.js';
import {
  CEILING_Y,
  PLAYER_SIZE,
  STEP_SECONDS,
  TURBO_FACTOR,
  cloneState,
  createState,
  getSpeed,
  isSafeSpot,
  loadLevel,
  progressOf,
  step,
} from './physics.js';
import { GEO_LEVELS } from './levels.js';
import { PORTAL_STYLES, drawFinish, drawObjects } from './obstacles.js';
import { RAINBOW, drawPlayer, resolveSkin } from './shapes.js';
import { findNewAchievements } from './achievements.js';

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 400;
const FLOOR_Y = 340;
const PLAYER_SCREEN_X = 220;
const CAMERA_LIFT_FROM = 150;
const CUBE_SPIN_SPEED = 5.6;
const MAX_TILT = 0.7;
const RESPAWN_DELAY_MS = 750;
const WIN_MODAL_DELAY_MS = 1300;
const CHECKPOINT_EVERY_SECONDS = 1.6;
const PRACTICE_TIP_AFTER_ATTEMPTS = 6;
const TRAIL_SECONDS = 0.35;
const TRAIL_SPAWN_SECONDS = 0.045;
const DECOR_SPAN = 1200;
const COINS_PER_LEVEL = 3;
const WIN_FLY_UP_SPEED = 160;
const SPEED_LINE_COUNT = 14;
const TURBO_LINE_SPEED = 1400;
// Evita que el redondeo de coma flotante dé 3 o 5 pasos de física por fotograma en lugar de 4.
const STEP_EPSILON = 1e-9;

const random = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, span) => ((value % span) + span) % span;

const createLevelProgress = () => ({ best: 0, attempts: 0, completed: false, practiceCompleted: false, coins: [false, false, false] });

export class GeoGame {
  constructor(root, { levelIndex, practice }) {
    const data = getGameData('geo');
    this.levelIndex = clamp(levelIndex, 0, Math.min(data.unlockedLevel, GEO_LEVELS.length - 1));
    this.definition = GEO_LEVELS[this.levelIndex];
    this.world = this.definition.world;
    this.palette = this.world.palette;
    this.practice = practice;
    this.skin = resolveSkin(data.skin);
    this.speed = getSpeed(data.speed);
    this.level = loadLevel(this.definition, this.world.speed * this.speed.factor);
    this.turboHeld = false;
    this.turboAmount = 0;
    const progress = { ...createLevelProgress(), ...data.levels[this.definition.id] };
    this.savedCoins = [...progress.coins];
    this.best = progress.best;
    this.attempts = 0;
    this.pendingJumps = 0;
    this.practiceTipShown = false;

    this.buildDom(root);
    this.ctx = setupCanvas(this.canvas, VIEW_WIDTH, VIEW_HEIGHT);
    this.decor = Array.from({ length: 16 }, () => ({
      x: random(0, DECOR_SPAN),
      y: random(30, 270),
      size: random(14, 46),
      depth: pick([0.12, 0.25, 0.4]),
      spin: random(-0.8, 0.8),
      phase: random(0, Math.PI * 2),
    }));
    this.musicBpm = Math.round(this.world.music.bpm * this.speed.factor);
    this.music = createMusicLoop({ ...this.world.music, bpm: this.musicBpm });
    this.speedLines = Array.from({ length: SPEED_LINE_COUNT }, () => ({ x: random(0, VIEW_WIDTH), y: random(20, FLOOR_Y - 10), length: random(40, 110) }));
    this.showBanner = createBanner(this.stage);

    this.loop = createGameLoop({
      update: (delta) => this.update(delta),
      render: () => this.render(),
      onAutoPause: () => this.pause(),
    });
    this.unbinders = this.bindControls();
    this.time = 0;
    this.particles = [];
    this.confetti = [];
    this.newAttempt();
    this.status = 'ready';
    this.loop.start();
  }

  buildDom(root) {
    const speedTag = this.speed.id === 'normal' ? '' : ` ${this.speed.icon}`;
    const title = `${this.world.emoji} ${this.definition.label} ${this.definition.name}${speedTag}`;
    this.header = createGameHeader({
      title: this.practice ? `🚩 ${title}` : title,
      backPath: '/geo',
      onPause: () => this.pause(),
      items: [
        { key: 'progress', label: 'Avance', icon: '📊', value: '0%' },
        { key: 'attempts', label: 'Intento', icon: '🔁', value: 1 },
        { key: 'coins', label: 'Monedas', icon: '🪙', value: `0/${COINS_PER_LEVEL}` },
        { key: 'best', label: 'Récord', icon: '🏆', value: `${this.best}%` },
      ],
    });

    this.canvas = el('canvas', {
      className: 'stage__canvas stage__canvas--geo',
      attrs: { width: VIEW_WIDTH, height: VIEW_HEIGHT, 'aria-label': 'Juego Salto Geométrico' },
    });
    this.hint = el('div', { className: 'stage__hint' }, [
      el('strong', { text: '¡Toca o pulsa Espacio para empezar!' }),
      el('span', {
        text: this.practice
          ? 'Modo práctica: aparecen banderas 🚩 y vuelves a la última al chocar.'
          : 'Mantén pulsado para saltar seguido · Shift / ⚡: turbo · P: pausa',
      }),
    ]);
    this.stage = el('div', { className: `stage stage--geo geo-world--${this.world.id}` }, [this.canvas, this.hint]);

    this.jumpButton = el('button', { className: 'touch-btn touch-btn--jump', text: '⬆️ Saltar', attrs: { type: 'button' } });
    this.turboButton = el('button', { className: 'touch-btn touch-btn--turbo', text: '⚡ Turbo', attrs: { type: 'button' } });
    const touchControls = el('div', { className: 'touch-controls touch-controls--geo' }, [this.turboButton, this.jumpButton]);

    root.append(el('main', { className: 'page game-page' }, [this.header.element, this.stage, touchControls]));
  }

  bindControls() {
    const release = () => (this.held = false);
    const handleBlur = () => {
      release();
      this.setTurbo(false);
    };
    window.addEventListener('blur', handleBlur);

    return [
      bindKeyboard(
        { jump: ['Space', 'ArrowUp', 'KeyW', 'Enter'], turbo: ['ShiftLeft', 'ShiftRight'], pause: ['KeyP', 'Escape'] },
        {
          onPress: (action, repeat) => {
            if (repeat) return;
            if (action === 'jump') this.press();
            if (action === 'turbo') this.setTurbo(true);
            if (action === 'pause') this.pause();
          },
          onRelease: (action) => {
            if (action === 'jump') release();
            if (action === 'turbo') this.setTurbo(false);
          },
        },
      ),
      bindHoldButton(this.canvas, { onPress: () => this.press(), onRelease: release }),
      bindHoldButton(this.jumpButton, { onPress: () => this.press(), onRelease: release }),
      bindHoldButton(this.turboButton, { onPress: () => this.setTurbo(true), onRelease: () => this.setTurbo(false) }),
      () => window.removeEventListener('blur', handleBlur),
    ];
  }

  press() {
    if (this.status === 'ready') {
      this.status = 'running';
      this.hint.hidden = true;
      this.music.start();
      return;
    }
    if (this.status !== 'running') return;
    this.held = true;
    this.pressQueued = true;
  }

  setTurbo(isOn) {
    if (isOn && !this.turboHeld && this.status === 'running') sounds.turbo();
    this.turboHeld = isOn;
  }

  /** Prepara un intento desde el principio o desde la última bandera de práctica. */
  newAttempt({ fromCheckpoint = false } = {}) {
    const checkpoint = fromCheckpoint ? this.checkpoints.at(-1) : null;
    if (!checkpoint) this.checkpoints = [];
    this.state = checkpoint ? cloneState(checkpoint) : createState();
    this.lastCheckpointTime = this.state.time;
    this.attempts += 1;
    this.attemptStartX = this.state.x;
    this.accumulator = 0;
    this.held = false;
    this.pressQueued = false;
    this.angle = 0;
    this.tilt = 0;
    this.cameraY = 0;
    this.ceilingAlpha = this.state.mode === 'cube' ? 0 : 1;
    this.trail = [];
    this.trailTimer = 0;
    this.shakeTime = 0;
    this.flash = null;
    this.updateHud();
  }

  pause() {
    if (this.status !== 'running' && this.status !== 'ready') return;
    this.pausedFrom = this.status;
    this.status = 'paused';
    this.turboHeld = false;
    this.loop.stop();
    this.music.stop();
    const otherMode = this.practice ? 'normal' : 'práctica 🚩';
    showModal({
      emoji: '⏸️',
      title: 'Pausa',
      message: this.practice ? 'Estás en modo práctica.' : '¡Respira hondo y sigue saltando!',
      escapeIndex: 0,
      actions: [
        { label: 'Continuar ▶', variant: 'primary', onClick: () => this.resume() },
        { label: 'Reiniciar', onClick: () => this.restart() },
        { label: `Cambiar a ${otherMode}`, onClick: () => navigate(this.routeFor(this.levelIndex, !this.practice)) },
        { label: 'Salir', onClick: () => navigate('/geo') },
      ],
    });
  }

  resume() {
    this.status = this.pausedFrom ?? 'running';
    this.held = false;
    this.loop.start();
    if (this.status === 'running') this.music.start();
  }

  restart() {
    clearTimeout(this.timer);
    this.flushTotals();
    this.newAttempt();
    this.status = 'ready';
    this.hint.hidden = false;
    this.loop.start();
  }

  routeFor(levelIndex, practice = false) {
    return `/geo/jugar?nivel=${levelIndex}${practice ? '&practica=1' : ''}`;
  }

  // ---------- Simulación ----------

  update(delta) {
    this.time += delta;
    this.updateParticles(delta);
    if (this.shakeTime > 0) this.shakeTime -= delta;
    if (this.flash) this.flash.life -= delta;
    const turboTarget = this.turboHeld && this.status === 'running' ? 1 : 0;
    this.turboAmount += (turboTarget - this.turboAmount) * Math.min(1, delta * 10);

    if (this.status === 'running') {
      this.accumulator += delta;
      while (this.accumulator >= STEP_SECONDS - STEP_EPSILON && this.status === 'running') {
        this.accumulator -= STEP_SECONDS;
        const events = step(this.state, this.level, { held: this.held, pressed: this.pressQueued, turbo: this.turboHeld }, STEP_SECONDS);
        this.pressQueued = false;
        events.forEach((event) => this.handleEvent(event));
      }
      if (this.status === 'running') {
        this.placeCheckpoint();
        this.updateTrail(delta);
      }
      this.updateHud();
    }
    if (this.status === 'won') this.flyAway(delta);
    this.updatePose(delta);
  }

  handleEvent(event) {
    const { x, y } = this.playerCenter();
    switch (event.type) {
      case 'jump':
      case 'flip':
      case 'flap':
        this.pendingJumps += 1;
        if (event.type === 'flip') sounds.flip();
        else sounds.jump();
        if (event.type === 'jump') this.spawnDust();
        break;
      case 'land':
        if (this.state.mode === 'cube') this.spawnDust();
        break;
      case 'orb':
        sounds.orb();
        this.spawnBurst(event.x, event.y, '#ffd93d', 12, 'dot');
        break;
      case 'pad':
        sounds.pad();
        this.spawnBurst(event.x, event.y + 6, '#ffd93d', 10, 'dot');
        break;
      case 'portal': {
        const style = PORTAL_STYLES[event.mode];
        sounds.portal();
        this.flash = { color: style.color, life: 0.35 };
        this.showBanner(`${style.icon} ¡${style.label}!`, 900);
        this.spawnBurst(x, y, style.color, 16, 'star');
        break;
      }
      case 'coin':
        this.collectCoin(event);
        break;
      case 'death':
        this.die();
        break;
      case 'win':
        this.win();
        break;
      default:
        break;
    }
  }

  collectCoin({ index, x, y }) {
    sounds.coin();
    this.spawnBurst(x, y, '#ffd93d', 14, 'star');
    if (this.practice) return;
    if (!this.savedCoins[index]) {
      this.savedCoins[index] = true;
      this.saveLevel({ coins: [...this.savedCoins] });
    }
  }

  placeCheckpoint() {
    if (!this.practice) return;
    const state = this.state;
    const isStable = state.mode === 'rocket' || state.mode === 'plane' || state.onGround;
    if (state.time - this.lastCheckpointTime < CHECKPOINT_EVERY_SECONDS || !isStable) return;
    if (!isSafeSpot(state, this.level)) return;
    this.checkpoints.push(cloneState(state));
    this.lastCheckpointTime = state.time;
    sounds.checkpoint();
  }

  die() {
    this.status = 'dying';
    this.shakeTime = 0.3;
    this.music.stop();
    sounds.hit();
    const { x, y } = this.playerCenter();
    this.spawnExplosion(x, y);

    if (!this.practice) {
      const percent = Math.floor(progressOf(this.state, this.level) * 100);
      const progress = this.levelProgress();
      const isNewBest = percent > progress.best;
      this.best = Math.max(progress.best, percent);
      this.saveLevel({ best: this.best, attempts: progress.attempts + 1 });
      this.flushTotals({ attempts: 1 });
      if (isNewBest && percent >= 10) this.showBanner(`🏆 ¡Nuevo récord: ${percent}%!`, 1300);
    }
    this.announceAchievements(findNewAchievements(getGameData('geo')));

    this.timer = setTimeout(() => {
      this.newAttempt({ fromCheckpoint: this.practice });
      this.status = 'running';
      // Si la pestaña se ocultó durante la explosión, el bucle está parado: mostramos la pausa.
      if (!this.loop.isRunning()) {
        this.pause();
        return;
      }
      this.music.start();
      const shouldSuggestPractice = !this.practice && !this.practiceTipShown && this.attempts > PRACTICE_TIP_AFTER_ATTEMPTS;
      if (shouldSuggestPractice) {
        this.practiceTipShown = true;
        this.showBanner('💡 Prueba el modo práctica 🚩 (pausa)', 2600);
      }
    }, RESPAWN_DELAY_MS);
  }

  win() {
    this.status = 'won';
    this.winCameraX = this.state.x - PLAYER_SCREEN_X;
    this.music.stop();
    sounds.win();
    this.spawnConfetti();

    const data = getGameData('geo');
    const nextIndex = this.levelIndex + 1;
    const nextLevel = GEO_LEVELS[nextIndex];
    const unlocksNext = !this.practice && nextLevel && data.unlockedLevel < nextIndex;
    if (this.practice) {
      this.saveLevel({ practiceCompleted: true });
    } else {
      this.best = 100;
      this.saveLevel({ best: 100, completed: true, attempts: this.levelProgress().attempts + 1 });
      if (unlocksNext) updateGameData('geo', { unlockedLevel: nextIndex });
      this.flushTotals({ attempts: 1 });
    }
    this.updateHud();
    const achievements = findNewAchievements(getGameData('geo'), {
      won: true,
      practice: this.practice,
      attempts: this.attempts,
      speed: this.speed.id,
    });
    this.saveAchievements(achievements);

    this.timer = setTimeout(() => {
      this.loop.stop();
      if (this.practice) this.showPracticeWin(achievements);
      else this.showWin({ nextLevel, unlocksNext, achievements });
    }, WIN_MODAL_DELAY_MS);
  }

  achievementLines(achievements) {
    if (!achievements.length) return '';
    const titles = achievements.map((achievement) => `${achievement.icon} ${achievement.title}`).join(', ');
    return `🏅 ${achievements.length === 1 ? 'Nuevo reto' : 'Nuevos retos'}: ${titles}.`;
  }

  showWin({ nextLevel, unlocksNext, achievements }) {
    const coinsThisRun = this.state.coins.size;
    const coinsTotal = this.savedCoins.filter(Boolean).length;
    const unlockText = unlocksNext ? `¡Desbloqueaste ${nextLevel.label} ${nextLevel.name}!` : '¡Lo lograste!';
    showModal({
      emoji: '🎉',
      title: '¡Nivel completado!',
      stars: coinsTotal,
      message: [unlockText, this.achievementLines(achievements)].filter(Boolean).join(' '),
      tone: 'success',
      stats: [
        { label: 'Intentos', value: this.attempts },
        { label: 'Monedas', value: `${coinsThisRun}/${COINS_PER_LEVEL}` },
        { label: 'Saltos', value: this.jumpsThisAttempt ?? 0 },
      ],
      actions: [
        nextLevel ? { label: `Siguiente: ${nextLevel.label} ▶`, variant: 'primary', onClick: () => navigate(this.routeFor(nextLevel.index)) } : null,
        { label: 'Otra vez 🔁', variant: nextLevel ? 'secondary' : 'primary', onClick: () => this.restart() },
        { label: 'Elegir nivel', onClick: () => navigate('/geo') },
      ].filter(Boolean),
    });
  }

  showPracticeWin(achievements) {
    showModal({
      emoji: '🚩',
      title: '¡Meta en práctica!',
      message: ['Ahora inténtalo en modo normal para ganar el nivel.', this.achievementLines(achievements)].filter(Boolean).join(' '),
      tone: 'success',
      actions: [
        { label: 'Jugar en normal ▶', variant: 'primary', onClick: () => navigate(this.routeFor(this.levelIndex)) },
        { label: 'Practicar otra vez', onClick: () => this.restart() },
        { label: 'Elegir nivel', onClick: () => navigate('/geo') },
      ],
    });
  }

  // ---------- Guardado ----------

  levelProgress() {
    const data = getGameData('geo');
    return { ...createLevelProgress(), ...data.levels[this.definition.id] };
  }

  saveLevel(changes) {
    const data = getGameData('geo');
    const levels = { ...data.levels, [this.definition.id]: { ...this.levelProgress(), ...changes } };
    updateGameData('geo', { levels });
  }

  /** Suma intentos y saltos acumulados a los totales del jugador. */
  flushTotals({ attempts = 0 } = {}) {
    if (!attempts && !this.pendingJumps) return;
    const data = getGameData('geo');
    updateGameData('geo', {
      totalAttempts: data.totalAttempts + attempts,
      totalJumps: data.totalJumps + this.pendingJumps,
    });
    this.jumpsThisAttempt = this.pendingJumps;
    this.pendingJumps = 0;
  }

  saveAchievements(achievements) {
    if (!achievements.length) return;
    const data = getGameData('geo');
    updateGameData('geo', { achievements: [...data.achievements, ...achievements.map((achievement) => achievement.id)] });
    sounds.achievement();
  }

  announceAchievements(achievements) {
    if (!achievements.length) return;
    this.saveAchievements(achievements);
    this.showBanner(`🏅 ¡Reto: ${achievements[0].title}!`, 2200);
  }

  updateHud() {
    const percent = Math.floor(progressOf(this.state, this.level) * 100);
    const coins = this.savedCoins.filter((saved, index) => saved || this.state.coins.has(index)).length;
    this.header.set('progress', `${percent}%`);
    this.header.set('attempts', this.attempts);
    this.header.set('coins', `${coins}/${COINS_PER_LEVEL}`);
    this.header.set('best', `${this.best}%`);
  }

  // ---------- Pose, estela y partículas ----------

  /** Tras cruzar la meta la figura sigue de largo y sale volando de la pantalla. */
  flyAway(delta) {
    this.state.x += this.level.speed * 1.3 * delta;
    this.state.y += WIN_FLY_UP_SPEED * delta;
    this.state.onGround = false;
    this.updateTrail(delta);
  }

  playerCenter() {
    return { x: this.state.x + PLAYER_SIZE / 2, y: this.state.y + PLAYER_SIZE / 2 };
  }

  updatePose(delta) {
    const state = this.state;
    const quarter = Math.PI / 2;
    if (state.mode === 'cube') {
      if (!state.onGround) this.angle += CUBE_SPIN_SPEED * delta;
      else this.angle += (Math.round(this.angle / quarter) * quarter - this.angle) * Math.min(1, delta * 22);
    } else if (state.mode === 'ball') {
      if (this.status === 'running') this.angle += ((this.currentSpeed * delta) / (PLAYER_SIZE / 2)) * state.gravityDir;
    }
    const targetTilt = state.mode === 'rocket' || state.mode === 'plane' ? clamp(-Math.atan2(state.vy, this.level.speed), -MAX_TILT, MAX_TILT) : 0;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, delta * 14);

    const targetCameraY = state.mode === 'cube' ? Math.max(0, state.y - CAMERA_LIFT_FROM) : 0;
    this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, delta * 5);
    const targetCeiling = state.mode === 'cube' ? 0 : 1;
    this.ceilingAlpha += (targetCeiling - this.ceilingAlpha) * Math.min(1, delta * 6);
  }

  updateTrail(delta) {
    const { x, y } = this.playerCenter();
    const trail = this.skin.trail.id;
    if (trail === 'rainbow') {
      this.trail.push({ x, y, t: this.time });
      this.trail = this.trail.filter((point) => this.time - point.t < TRAIL_SECONDS);
      return;
    }
    if (trail === 'none') return;
    this.trailTimer -= delta;
    if (this.trailTimer > 0) return;
    this.trailTimer = TRAIL_SPAWN_SECONDS;
    const kinds = { sparkle: 'star', bubbles: 'bubble', hearts: 'heart' };
    const colors = { sparkle: '#ffd93d', bubbles: '#ffffff', hearts: '#ff5fa2' };
    this.particles.push({
      x: x - 14,
      y: y + random(-8, 8),
      vx: random(-60, -20),
      vy: random(-20, 30),
      life: 0.5,
      maxLife: 0.5,
      size: random(4, 7),
      color: colors[trail],
      kind: kinds[trail],
      gravity: 0,
    });
  }

  spawnDust() {
    const { x } = this.playerCenter();
    const groundY = this.state.gravityDir === 1 ? this.state.y : this.state.y + PLAYER_SIZE;
    for (let i = 0; i < 5; i += 1) {
      this.particles.push({
        x: x - 10,
        y: groundY,
        vx: random(-90, -20),
        vy: random(10, 70),
        life: 0.35,
        maxLife: 0.35,
        size: random(2, 4),
        color: 'rgba(255, 255, 255, 0.85)',
        kind: 'dot',
        gravity: -300,
      });
    }
  }

  spawnBurst(x, y, color, count, kind) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      this.particles.push({ x, y, vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150, life: 0.5, maxLife: 0.5, size: 4, color, kind, gravity: 0 });
    }
  }

  spawnExplosion(x, y) {
    const colors = [this.skin.color.primary, this.skin.color.secondary, '#ffffff'];
    for (let i = 0; i < 22; i += 1) {
      const angle = random(0, Math.PI * 2);
      const speed = random(80, 320);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        size: random(4, 9),
        color: pick(colors),
        kind: 'square',
        gravity: -500,
      });
    }
  }

  spawnConfetti() {
    for (let i = 0; i < 80; i += 1) {
      this.confetti.push({
        x: random(0, VIEW_WIDTH),
        y: random(-140, -10),
        vx: random(-40, 40),
        vy: random(80, 190),
        rotation: random(0, Math.PI),
        spin: random(-6, 6),
        color: pick(RAINBOW),
        life: 3.5,
      });
    }
  }

  updateParticles(delta) {
    this.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += particle.gravity * delta;
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

  /** Velocidad horizontal actual (incluye el turbo) para animaciones. */
  get currentSpeed() {
    return this.level.speed * (this.turboHeld && this.status === 'running' ? TURBO_FACTOR : 1);
  }

  get view() {
    const cameraX = this.status === 'won' ? this.winCameraX : this.state.x - PLAYER_SCREEN_X;
    return { x: cameraX, y: this.cameraY, floor: FLOOR_Y };
  }

  /** Pulso que late con la música para que el fondo "baile". */
  get beat() {
    if (this.status !== 'running') return 0;
    const phase = (this.time * this.musicBpm) / 60;
    return (1 - (phase % 1)) ** 3;
  }

  render() {
    const ctx = this.ctx;
    const view = this.view;
    ctx.save();
    if (this.shakeTime > 0) ctx.translate(random(-5, 5), random(-4, 4));

    this.drawSky();
    this.drawDecor(view);
    this.drawSpeedLines();
    this.drawCeiling(view);
    drawObjects(ctx, this.level.objects, {
      view,
      palette: this.palette,
      time: this.time,
      used: this.state.used,
      savedCoins: this.practice ? [] : this.savedCoins,
      viewWidth: VIEW_WIDTH,
    });
    drawFinish(ctx, this.level.endX, view, VIEW_HEIGHT);
    this.drawCheckpoints(view);
    this.drawAttemptLabel(view);
    this.drawRainbowTrail(view);
    if (this.status !== 'dying') this.drawPlayer(view);
    this.drawParticles(view);
    this.drawGround(view);
    this.drawFlash();
    this.drawConfetti();
    this.drawProgress();
    ctx.restore();
  }

  drawSky() {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, this.palette.skyTop);
    sky.addColorStop(1, this.palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, VIEW_WIDTH + 20, VIEW_HEIGHT + 20);
  }

  drawDecor(view) {
    const ctx = this.ctx;
    const pulse = 1 + this.beat * 0.12;
    ctx.fillStyle = this.palette.decor;
    ctx.strokeStyle = this.palette.decor;
    ctx.lineWidth = 3;
    this.decor.forEach((item) => {
      const x = wrap(item.x - view.x * item.depth, DECOR_SPAN) - 200;
      const y = item.y + view.y * item.depth * 0.5;
      const size = item.size * pulse;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(item.phase + this.time * item.spin);
      this.drawDecorShape(size, item);
      ctx.restore();
    });
  }

  drawDecorShape(size, item) {
    const ctx = this.ctx;
    switch (this.world.decor) {
      case 'bubble':
        ctx.beginPath();
        ctx.arc(0, Math.sin(this.time + item.phase) * 6, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'star': {
        const twinkle = 0.5 + Math.sin(this.time * 2 + item.phase) * 0.5;
        const r = size * 0.35 * (0.6 + twinkle * 0.4);
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const radius = i % 2 === 0 ? r : r * 0.3;
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'gear':
        ctx.beginPath();
        for (let i = 0; i < 16; i += 1) {
          const angle = (i / 16) * Math.PI * 2;
          const radius = i % 2 === 0 ? size * 0.7 : size * 0.55;
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.roundRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8, 6);
        if (item.depth > 0.2) ctx.fill();
        else ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  drawCeiling(view) {
    if (this.ceilingAlpha < 0.02) return;
    const ctx = this.ctx;
    const ceilingY = view.floor - (CEILING_Y - view.y);
    ctx.globalAlpha = this.ceilingAlpha;
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(0, -10, VIEW_WIDTH, ceilingY + 10);
    ctx.fillStyle = this.palette.groundDark;
    const offset = wrap(view.x, 80);
    for (let x = -offset; x < VIEW_WIDTH; x += 80) ctx.fillRect(x, -10, 40, ceilingY + 10);
    ctx.fillStyle = this.palette.line;
    ctx.fillRect(0, ceilingY - 4, VIEW_WIDTH, 4);
    ctx.globalAlpha = 1;
  }

  drawGround(view) {
    const ctx = this.ctx;
    const groundY = view.floor + view.y;
    if (groundY > VIEW_HEIGHT) return;
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(-10, groundY, VIEW_WIDTH + 20, VIEW_HEIGHT - groundY + 10);
    ctx.fillStyle = this.palette.groundDark;
    const offset = wrap(view.x, 80);
    for (let x = -offset; x < VIEW_WIDTH; x += 80) ctx.fillRect(x, groundY, 40, VIEW_HEIGHT - groundY + 10);
    if (this.palette.rainbow) {
      const stripe = ctx.createLinearGradient(0, 0, VIEW_WIDTH, 0);
      RAINBOW.forEach((color, index) => stripe.addColorStop(index / (RAINBOW.length - 1), color));
      ctx.fillStyle = stripe;
    } else {
      ctx.fillStyle = this.palette.line;
    }
    ctx.fillRect(-10, groundY, VIEW_WIDTH + 20, 5);
  }

  drawCheckpoints(view) {
    if (!this.practice) return;
    const ctx = this.ctx;
    this.checkpoints.forEach((checkpoint) => {
      const x = checkpoint.x + PLAYER_SIZE / 2 - view.x;
      const y = view.floor - (checkpoint.y + PLAYER_SIZE / 2 - view.y);
      if (x < -20 || x > VIEW_WIDTH + 20) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = 'rgba(77, 212, 172, 0.85)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, -8, 16, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  drawAttemptLabel(view) {
    const x = this.attemptStartX + 160 - view.x;
    if (x < -300) return;
    const ctx = this.ctx;
    ctx.font = '700 34px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(43, 33, 64, 0.35)';
    ctx.fillStyle = '#ffffff';
    const text = this.practice ? `Práctica · Intento ${this.attempts}` : `Intento ${this.attempts}`;
    ctx.strokeText(text, x, 150 + view.y);
    ctx.fillText(text, x, 150 + view.y);
  }

  drawRainbowTrail(view) {
    if (this.skin.trail.id !== 'rainbow' || this.trail.length < 2 || this.status === 'dying') return;
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    RAINBOW.forEach((color, index) => {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      this.trail.forEach((point, pointIndex) => {
        const x = point.x - view.x - 12;
        const y = view.floor - (point.y - view.y) + (index - 2.5) * 4;
        if (pointIndex === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  drawPlayer(view) {
    const { x, y } = this.playerCenter();
    drawPlayer(this.ctx, this.skin, {
      x: x - view.x,
      y: view.floor - (y - view.y),
      size: PLAYER_SIZE,
      mode: this.state.mode,
      angle: this.angle,
      tilt: this.tilt,
      time: this.time,
      flipped: this.state.gravityDir === -1,
    });
  }

  drawParticles(view) {
    const ctx = this.ctx;
    this.particles.forEach((particle) => {
      const x = particle.x - view.x;
      const y = view.floor - (particle.y - view.y);
      const size = particle.size;
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = particle.color;
      ctx.beginPath();
      if (particle.kind === 'square') {
        ctx.rect(x - size / 2, y - size / 2, size, size);
        ctx.fill();
      } else if (particle.kind === 'bubble') {
        ctx.lineWidth = 2;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (particle.kind === 'heart') {
        ctx.moveTo(x, y + size);
        ctx.bezierCurveTo(x - size * 1.4, y, x - size * 0.8, y - size * 1.1, x, y - size * 0.4);
        ctx.bezierCurveTo(x + size * 0.8, y - size * 1.1, x + size * 1.4, y, x, y + size);
        ctx.fill();
      } else if (particle.kind === 'star') {
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const radius = i % 2 === 0 ? size : size * 0.35;
          ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        ctx.fill();
      } else {
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  /** Rayas de velocidad y brillo en los bordes mientras el turbo está activo. */
  drawSpeedLines() {
    if (this.turboAmount < 0.03) return;
    const ctx = this.ctx;
    const shift = this.time * TURBO_LINE_SPEED;
    ctx.globalAlpha = this.turboAmount * 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    this.speedLines.forEach((line) => {
      const x = VIEW_WIDTH - wrap(line.x + shift, VIEW_WIDTH + line.length);
      ctx.moveTo(x, line.y);
      ctx.lineTo(x + line.length, line.y);
    });
    ctx.stroke();
    const glow = ctx.createLinearGradient(0, 0, 120, 0);
    glow.addColorStop(0, 'rgba(255, 159, 67, 0.45)');
    glow.addColorStop(1, 'rgba(255, 159, 67, 0)');
    ctx.globalAlpha = this.turboAmount;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 120, VIEW_HEIGHT);
    ctx.globalAlpha = 1;
  }

  drawFlash() {
    if (!this.flash || this.flash.life <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = (this.flash.life / 0.35) * 0.35;
    ctx.fillStyle = this.flash.color;
    ctx.fillRect(-10, -10, VIEW_WIDTH + 20, VIEW_HEIGHT + 20);
    ctx.globalAlpha = 1;
  }

  drawConfetti() {
    const ctx = this.ctx;
    this.confetti.forEach((piece) => {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    });
  }

  drawProgress() {
    const ctx = this.ctx;
    const trackWidth = 320;
    const trackX = (VIEW_WIDTH - trackWidth) / 2;
    const trackY = 14;
    const progress = progressOf(this.state, this.level);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackWidth, 12, 6);
    ctx.fill();
    ctx.fillStyle = this.skin.color.primary;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, Math.max(12, trackWidth * progress), 12, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackWidth, 12, 6);
    ctx.stroke();
    ctx.font = '700 15px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.palette.text;
    ctx.fillText(`${Math.floor(progress * 100)}%`, trackX + trackWidth + 10, trackY + 7);
  }

  destroy() {
    clearTimeout(this.timer);
    this.music.stop();
    this.flushTotals();
    closeModal();
    this.loop.destroy();
    this.unbinders.forEach((unbind) => unbind());
  }
}

export function mountGeoGame(root, params) {
  const game = new GeoGame(root, params);
  return () => game.destroy();
}
