import { createGameLoop } from '../../core/gameLoop.js';
import { setupCanvas } from '../../core/canvas.js';
import { bindHoldButton, bindKeyboard } from '../../core/input.js';
import { createMusicLoop, sounds } from '../../core/audio.js';
import { getActivePlayer, getGameData, updateGameData } from '../../core/player.js';
import { createBanner, createGameHeader, createTouchButton } from '../../ui/hud.js';
import { closeModal, showModal } from '../../ui/modal.js';
import { el, navigate } from '../../ui/dom.js';
import { createStageFit } from '../../ui/stageFit.js';
import { createRotateHint } from '../../ui/rotateHint.js';
import { createFullscreenButton, exitFullscreen } from '../../ui/fullscreen.js';
import { getSession, leaveRoom } from '../../core/race.js';
import { RaceMatch } from '../../core/raceMatch.js';
import { trackEvent } from '../../core/analytics.js';
import { formatRaceTime, placeLabel, showRaceEnded, showRacePodium } from '../../ui/raceResults.js';
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
import { canPlayLevel, findNewAchievements } from './achievements.js';
import { parseGeoPos } from './race.js';

/** El alto lógico es fijo; el ancho se adapta a la pantalla (ver ui/stageFit.js). */
const MIN_VIEW_WIDTH = 800;
const PORTRAIT_VIEW_WIDTH = 560;
/** En un celular en horizontal se deja la vista un poco más estrecha para que el juego llene el alto. */
const LANDSCAPE_VIEW_WIDTH = 640;
const MAX_VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 400;
const FLOOR_Y = 340;
/** Dónde va el jugador en la pantalla: con la vista estrecha (celular en vertical), más a la izquierda. */
const PLAYER_SCREEN_X = 220;
const MIN_PLAYER_SCREEN_X = 150;
const PLAYER_SCREEN_SHARE = 0.275;
const CAMERA_LIFT_FROM = 150;
const CUBE_SPIN_SPEED = 5.6;
const MAX_TILT = 0.7;
const RESPAWN_DELAY_MS = 750;
const WIN_MODAL_DELAY_MS = 1300;
const CHECKPOINT_EVERY_SECONDS = 1.6;
const PRACTICE_TIP_AFTER_ATTEMPTS = 6;
const TRAIL_SECONDS = 0.35;
const TRAIL_SPAWN_SECONDS = 0.045;
const DECOR_SPAN = MAX_VIEW_WIDTH + 400;
const COINS_PER_LEVEL = 3;
const WIN_FLY_UP_SPEED = 160;
const SPEED_LINE_COUNT = 14;
const TURBO_LINE_SPEED = 1400;
const COUNTDOWN_SECONDS = 3;
const GO_LABEL_SECONDS = 0.7;
const POS_SEND_SECONDS = 1 / 15;
const RIVAL_FOLLOW_RATE = 12;
const RIVAL_PREDICT_SECONDS = 0.15;
const RIVAL_SNAP_DISTANCE = 300;
const RIVAL_ALPHA = 0.55;
// Evita que el redondeo de coma flotante dé 3 o 5 pasos de física por fotograma en lugar de 4.
const STEP_EPSILON = 1e-9;

const random = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, span) => ((value % span) + span) % span;

// Intentos de un mismo nivel que se cuentan en las estadísticas, para ver dónde se atascan.
const STUCK_ATTEMPTS = [10, 25, 50];

const createLevelProgress = () => ({ best: 0, attempts: 0, completed: false, practiceCompleted: false, coins: [false, false, false] });

export class GeoGame {
  constructor(root, { levelIndex, practice, race = false }) {
    const data = getGameData('geo');
    // En carrera manda la sala: se puede correr un nivel que aún no se tiene (no lo desbloquea).
    this.race = race ? getSession() : null;
    const raceConfig = this.race?.meta.config;
    const requested = GEO_LEVELS[levelIndex];
    const canPlay = requested && canPlayLevel(data, requested);
    this.levelIndex = this.race ? raceConfig.levelIndex : canPlay ? levelIndex : clamp(levelIndex, 0, Math.min(data.unlockedLevel, GEO_LEVELS.length - 1));
    this.definition = GEO_LEVELS[this.levelIndex];
    this.world = this.definition.world;
    this.palette = this.world.palette;
    this.practice = practice && !this.race;
    this.useCheckpoints = this.practice || Boolean(this.race);
    this.recordsProgress = !this.useCheckpoints;
    if (this.race) {
      this.match = new RaceMatch({ parsePos: parseGeoPos });
      this.match.rivals.forEach((rival) => (rival.skin = resolveSkin(rival.look.skin)));
    }
    this.skin = resolveSkin(data.skin);
    this.speed = getSpeed(this.race ? raceConfig.speedId : data.speed);
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
    this.stageFit = createStageFit({
      page: this.page,
      stage: this.stage,
      canvas: this.canvas,
      header: this.header.element,
      controls: this.touchControls,
      viewHeight: VIEW_HEIGHT,
      minWidth: MIN_VIEW_WIDTH,
      portraitMinWidth: PORTRAIT_VIEW_WIDTH,
      landscapeMinWidth: LANDSCAPE_VIEW_WIDTH,
      maxWidth: MAX_VIEW_WIDTH,
      onChange: (viewWidth) => {
        this.viewWidth = viewWidth;
        this.playerScreenX = clamp(Math.round(viewWidth * PLAYER_SCREEN_SHARE), MIN_PLAYER_SCREEN_X, PLAYER_SCREEN_X);
        this.ctx = setupCanvas(this.canvas, viewWidth, VIEW_HEIGHT);
        if (this.state) this.render();
      },
    });
    this.stageFit.fit();
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
    this.speedLines = Array.from({ length: SPEED_LINE_COUNT }, () => ({ x: random(0, MAX_VIEW_WIDTH), y: random(20, FLOOR_Y - 10), length: random(40, 110) }));
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
    if (this.race) this.startRaceSession();
  }

  buildDom(root) {
    const speedTag = this.speed.id === 'normal' ? '' : ` ${this.speed.icon}`;
    const title = `${this.world.emoji} ${this.definition.label} ${this.definition.name}${speedTag}`;
    const items = this.race
      ? [
          { key: 'progress', label: 'Tú', icon: getActivePlayer()?.avatar ?? '📊', value: '0%' },
          { key: 'place', label: 'Puesto', icon: '🏅', value: '—' },
          { key: 'time', label: 'Tiempo', icon: '⏱️', value: '0 s' },
        ]
      : [
          { key: 'progress', label: 'Avance', icon: '📊', value: '0%' },
          { key: 'attempts', label: 'Intento', icon: '🔁', value: 1 },
          { key: 'coins', label: 'Monedas', icon: '🪙', value: `0/${COINS_PER_LEVEL}` },
          { key: 'best', label: 'Récord', icon: '🏆', value: `${this.best}%` },
        ];
    let titlePrefix = '';
    if (this.race) titlePrefix = '🏁 ';
    else if (this.practice) titlePrefix = '🚩 ';
    this.header = createGameHeader({
      title: `${titlePrefix}${title}`,
      backPath: '/geo',
      onPause: () => this.pause(),
      extraActions: [createFullscreenButton({ landscape: true })].filter(Boolean),
      items,
    });

    this.canvas = el('canvas', {
      className: 'stage__canvas stage__canvas--geo',
      attrs: { width: MIN_VIEW_WIDTH, height: VIEW_HEIGHT, 'aria-label': 'Juego Salto Geométrico' },
    });
    this.hintTitle = el('strong', { text: '¡Toca o pulsa Espacio para empezar!' });
    this.hintText = el('span', {
      text: this.practice
        ? 'Modo práctica: aparecen banderas 🚩 y vuelves a la última al chocar.'
        : 'Mantén pulsado para saltar seguido · Shift / ⚡: turbo · P: pausa',
    });
    this.hint = el('div', { className: 'stage__hint' }, [this.hintTitle, this.hintText]);
    this.stage = el('div', { className: `stage stage--geo geo-world--${this.world.id}` }, [this.canvas, this.hint]);

    this.jumpButton = createTouchButton({ icon: '⬆️', label: 'Saltar', variant: 'jump' });
    this.turboButton = createTouchButton({ icon: '⚡', label: 'Turbo', variant: 'turbo' });
    this.touchControls = el('div', { className: 'touch-controls touch-controls--geo' }, [this.turboButton, this.jumpButton]);

    this.page = el('main', { className: 'page game-page game-page--runner game-page--geo' }, [
      this.header.element,
      this.stage,
      this.touchControls,
    ]);
    root.append(this.page);
    this.closeRotateHint = createRotateHint(this.page);
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
    this.ceilingAlpha = this.hasCeiling ? 1 : 0;
    this.trail = [];
    this.trailTimer = 0;
    this.shakeTime = 0;
    this.flash = null;
    this.updateHud();
  }

  pause() {
    if (!['running', 'ready', 'waiting', 'countdown'].includes(this.status)) return;
    this.pausedFrom = this.status;
    this.status = 'paused';
    this.turboHeld = false;
    this.loop.stop();
    this.music.stop();
    if (this.race) {
      showModal({
        emoji: '⏸️',
        title: 'Pausa',
        message: this.raceStartedAt ? '¡Ojo! En la carrera el reloj sigue corriendo.' : 'La carrera empieza cuando vuelvas.',
        escapeIndex: 0,
        actions: [
          { label: 'Continuar ▶', variant: 'primary', onClick: () => this.resume() },
          { label: 'Salir', onClick: () => navigate('/geo') },
        ],
      });
      return;
    }
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

    if (this.status === 'countdown') this.updateCountdown(delta);
    if (this.race) this.updateRace(delta);

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
    if (!this.recordsProgress) return;
    if (!this.savedCoins[index]) {
      this.savedCoins[index] = true;
      this.saveLevel({ coins: [...this.savedCoins] });
    }
  }

  placeCheckpoint() {
    if (!this.useCheckpoints) return;
    const state = this.state;
    const isStable = state.mode === 'rocket' || state.mode === 'plane' || state.mode === 'wave' || state.onGround;
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

    if (this.recordsProgress) {
      const percent = Math.floor(progressOf(this.state, this.level) * 100);
      const progress = this.levelProgress();
      const isNewBest = percent > progress.best;
      this.best = Math.max(progress.best, percent);
      this.saveLevel({ best: this.best, attempts: progress.attempts + 1 });
      this.flushTotals({ attempts: 1 });
      if (isNewBest && percent >= 10) this.showBanner(`🏆 ¡Nuevo récord: ${percent}%!`, 1300);
      if (!this.practice && STUCK_ATTEMPTS.includes(this.attempts)) {
        trackEvent(`geo-nivel-${this.definition.label}-intentos-${this.attempts}`, `Geo · nivel ${this.definition.label}: ${this.attempts} intentos sin pasarlo`);
      }
    }
    this.announceAchievements(findNewAchievements(getGameData('geo')));

    this.timer = setTimeout(() => {
      this.newAttempt({ fromCheckpoint: this.useCheckpoints });
      this.status = 'running';
      // Si la pestaña se ocultó durante la explosión, el bucle está parado: mostramos la pausa.
      if (!this.loop.isRunning()) {
        this.pause();
        return;
      }
      this.music.start();
      const shouldSuggestPractice = this.recordsProgress && !this.practiceTipShown && this.attempts > PRACTICE_TIP_AFTER_ATTEMPTS;
      if (shouldSuggestPractice) {
        this.practiceTipShown = true;
        this.showBanner('💡 Prueba el modo práctica 🚩 (pausa)', 2600);
      }
    }, RESPAWN_DELAY_MS);
  }

  win() {
    this.status = 'won';
    this.winCameraX = this.state.x - this.playerScreenX;
    this.music.stop();
    sounds.win();
    this.spawnConfetti();
    if (this.race) {
      this.finishRace();
      return;
    }

    const data = getGameData('geo');
    const nextIndex = this.levelIndex + 1;
    // Tras el último nivel normal no se pasa al secreto: ese se abre con monedas.
    const nextLevel = GEO_LEVELS[nextIndex]?.secret ? null : GEO_LEVELS[nextIndex];
    const unlocksNext = !this.practice && nextLevel && data.unlockedLevel < nextIndex;
    const { label } = this.definition;
    if (this.practice) {
      this.saveLevel({ practiceCompleted: true });
      trackEvent(`geo-nivel-${label}-practica-completada`, `Geo · nivel ${label} completado en práctica`);
    } else {
      trackEvent(`geo-nivel-${label}-completado-${this.speed.id}`, `Geo · nivel ${label} completado (${this.speed.label})`);
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
      expert: Boolean(this.world.expert),
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

  // ---------- Carrera con amigos ----------

  startRaceSession() {
    this.match
      .on('countdown', () => this.startCountdown())
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
    clearTimeout(this.timer);
    clearTimeout(this.podiumTimer);
    closeModal();
    this.podiumOpen = false;
    this.raceStartedAt = null;
    this.raceAchievements = [];
    this.posTimer = 0;
    this.goLabelTime = 0;
    this.attempts = 0;
    this.rivalList.forEach((rival) => (rival.shown = null));
    this.match.reset();
    this.newAttempt();
    this.status = 'waiting';
    this.music.stop();
    const rivals = this.match.activeRivals;
    this.hintTitle.textContent = rivals.length === 1 ? `Esperando a ${rivals[0].name}…` : 'Esperando a los demás…';
    this.hintText.textContent = 'La carrera empieza sola con una cuenta atrás 3, 2, 1.';
    this.hint.hidden = false;
    this.loop.start();
  }

  startCountdown() {
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
    sounds.checkpoint();
    this.music.start();
  }

  updateRace(delta) {
    if (this.goLabelTime > 0) this.goLabelTime -= delta;
    this.rivalList.forEach((rival) => this.updateRival(rival, delta));
    if (!['running', 'dying', 'won'].includes(this.status)) return;
    this.posTimer -= delta;
    if (this.posTimer > 0) return;
    this.posTimer = POS_SEND_SECONDS;
    const { x, y, mode, gravityDir } = this.state;
    this.match.sendPos({ x, y, mode, gravityDir, angle: this.angle, tilt: this.tilt, dead: this.status === 'dying' });
  }

  /** Cada rival llega unas 15 veces por segundo: se suaviza y se adelanta un poco para que no dé tirones. */
  updateRival(rival, delta) {
    const pos = rival.pos;
    if (!pos) return;
    const sinceUpdate = (performance.now() - rival.receivedAt) / 1000;
    const ahead = pos.dead ? 0 : Math.min(sinceUpdate, RIVAL_PREDICT_SECONDS) * this.level.speed;
    const goalX = pos.x + ahead;
    if (!rival.shown || Math.abs(goalX - rival.shown.x) > RIVAL_SNAP_DISTANCE) {
      rival.shown = { x: goalX, y: pos.y };
      return;
    }
    const follow = Math.min(1, delta * RIVAL_FOLLOW_RATE);
    rival.shown.x += (goalX - rival.shown.x) * follow;
    rival.shown.y += (pos.y - rival.shown.y) * follow;
  }

  rivalProgress(rival) {
    if (this.match.hasFinished(rival.id)) return 1;
    return rival.shown ? clamp(rival.shown.x / this.level.endX, 0, 1) : 0;
  }

  finishRace() {
    this.match.finish(performance.now() - this.raceStartedAt);
    this.wonAt = performance.now();
    this.updateHud();
    if (!this.match.activeRivals.length) {
      this.timer = setTimeout(() => this.showRaceAlone(), WIN_MODAL_DELAY_MS);
      return;
    }
    if (this.match.result) {
      this.podiumTimer = setTimeout(() => this.showPodium(), WIN_MODAL_DELAY_MS);
      return;
    }
    this.showBanner('🏁 ¡Meta! Esperando a los demás…', 1500);
  }

  /** Todos ganan: la carrera cuenta para todos y la copa es para quien llegó primero. */
  handleResult() {
    const iWon = this.match.didWin();
    const data = getGameData('geo');
    updateGameData('geo', { racesPlayed: data.racesPlayed + 1, raceWins: data.raceWins + (iWon ? 1 : 0) });
    this.raceAchievements = findNewAchievements(getGameData('geo'));
    this.saveAchievements(this.raceAchievements);
    if (this.status === 'won') {
      const wait = Math.max(0, WIN_MODAL_DELAY_MS - (performance.now() - this.wonAt));
      this.podiumTimer = setTimeout(() => this.showPodium(), wait);
      return;
    }
    const winner = this.match.playerName(this.match.result[0]);
    this.showBanner(`🏆 ¡${winner} llegó primero! ¡Sigue hasta la meta!`, 2400);
  }

  showPodium() {
    this.loop.stop();
    this.music.stop();
    this.podiumOpen = true;
    clearTimeout(this.podiumRefreshTimer);
    const rematchIn = showRacePodium({
      match: this.match,
      extraMessage: this.achievementLines(this.raceAchievements),
      trophies: getGameData('geo').raceWins,
      onRematch: () => this.requestRematch(),
      exitPath: '/geo',
    });
    // Si aún hay alguien corriendo, el podio se actualiza solo cuando ya se pueda pedir la revancha.
    if (Number.isFinite(rematchIn) && rematchIn > 0) this.podiumRefreshTimer = setTimeout(() => this.refreshPodium(), rematchIn + 50);
  }

  /** Si el podio está abierto y llega alguien más, se actualiza la tabla. */
  refreshPodium() {
    if (this.podiumOpen && this.status === 'won') this.showPodium();
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
      this.music.stop();
      showRaceEnded({
        title: 'Se fueron todos',
        message: 'Se cortó la conexión. Pueden crear otra sala cuando quieran.',
        newRacePath: `/geo/carrera?nivel=${this.levelIndex}`,
        exitPath: '/geo',
      });
      return;
    }
    if (this.status === 'won' && !this.match.result) {
      clearTimeout(this.timer);
      this.showRaceAlone();
    } else if (this.podiumOpen) {
      this.showPodium();
    }
  }

  showRaceAlone() {
    this.loop.stop();
    this.music.stop();
    showRaceEnded({
      title: this.status === 'won' ? '¡Llegaste a la meta!' : 'Se fueron todos',
      message: 'Ya no queda nadie en la sala, así que esta vez no hay copa.',
      stats: this.match.hasFinished() ? [{ label: 'Tiempo', value: formatRaceTime(this.match.finishes.get(this.match.myId)) }] : [],
      newRacePath: `/geo/carrera?nivel=${this.levelIndex}`,
      exitPath: '/geo',
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
    achievements.forEach(({ id, title }) => trackEvent(`geo-reto-${id}`, `Geo · reto: ${title}`));
    sounds.achievement();
  }

  announceAchievements(achievements) {
    if (!achievements.length) return;
    this.saveAchievements(achievements);
    this.showBanner(`🏅 ¡Reto: ${achievements[0].title}!`, 2200);
  }

  updateHud() {
    const percent = Math.floor(progressOf(this.state, this.level) * 100);
    if (this.race) {
      const finishMs = this.match.finishes.get(this.match.myId);
      const myTime = finishMs ?? (this.raceStartedAt ? performance.now() - this.raceStartedAt : 0);
      // El puesto usa la última posición recibida (sin adelantar), para no dar ventaja por la predicción.
      const place = this.match.placeOf(progressOf(this.state, this.level), (rival) => (rival.pos ? rival.pos.x / this.level.endX : 0));
      this.header.set('progress', `${percent}%`);
      this.header.set('place', this.raceStartedAt ? placeLabel(place) : '—');
      this.header.set('time', `${Math.floor(myTime / 1000)} s`);
      return;
    }
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
    let targetTilt = 0;
    if (state.mode === 'rocket' || state.mode === 'plane') targetTilt = clamp(-Math.atan2(state.vy, this.level.speed), -MAX_TILT, MAX_TILT);
    if (state.mode === 'wave') targetTilt = -Math.atan2(state.vy, this.currentSpeed);
    this.tilt += (targetTilt - this.tilt) * Math.min(1, delta * 14);

    const targetCameraY = this.hasCeiling ? 0 : Math.max(0, state.y - CAMERA_LIFT_FROM);
    this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, delta * 5);
    const targetCeiling = this.hasCeiling ? 1 : 0;
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
    const kinds = { sparkle: 'star', bubbles: 'bubble', hearts: 'heart', shooting: 'star', notes: 'note', fire: 'dot' };
    const colors = {
      sparkle: '#ffd93d',
      bubbles: '#ffffff',
      hearts: '#ff5fa2',
      shooting: pick(['#ffffff', '#ffd93d', '#9fd0ff']),
      notes: pick(['#ff5fa2', '#5ab0ff', '#b57bff']),
      fire: pick(['#ff5a1f', '#ff9f43', '#ffd93d']),
    };
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
        x: random(0, this.viewWidth),
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

  /** Velocidad horizontal actual (incluye el turbo y los portales de velocidad) para animaciones. */
  get currentSpeed() {
    return this.level.speed * this.state.speedFactor * (this.turboHeld && this.status === 'running' ? TURBO_FACTOR : 1);
  }

  /** Solo el cubo con la gravedad normal va sin techo (y con la cámara que lo sigue al subir). */
  get hasCeiling() {
    return this.state.mode !== 'cube' || this.state.gravityDir === -1;
  }

  get view() {
    const cameraX = this.status === 'won' ? this.winCameraX : this.state.x - this.playerScreenX;
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
      savedCoins: this.recordsProgress ? this.savedCoins : [],
      viewWidth: this.viewWidth,
    });
    drawFinish(ctx, this.level.endX, view, VIEW_HEIGHT);
    this.drawCheckpoints(view);
    this.drawAttemptLabel(view);
    if (this.race) this.rivalList.forEach((rival, index) => this.drawRival(rival, index, view));
    this.drawRainbowTrail(view);
    if (this.status !== 'dying') this.drawPlayer(view);
    this.drawParticles(view);
    this.drawGround(view);
    this.drawFlash();
    this.drawConfetti();
    this.drawProgress();
    this.drawCountdown();
    ctx.restore();
  }

  drawSky() {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, this.palette.skyTop);
    sky.addColorStop(1, this.palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, this.viewWidth + 20, VIEW_HEIGHT + 20);
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
      case 'planet':
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.8, size * 0.2, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'ring':
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'disco': {
        // Bolas de discoteca que cambian de color con el ritmo.
        ctx.fillStyle = RAINBOW[Math.floor(this.time * 2 + item.phase * 3) % RAINBOW.length];
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, 0);
        ctx.lineTo(size * 0.5, 0);
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(0, size * 0.5);
        ctx.stroke();
        ctx.fillStyle = this.palette.decor;
        break;
      }
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
    ctx.fillRect(0, -10, this.viewWidth, ceilingY + 10);
    ctx.fillStyle = this.palette.groundDark;
    const offset = wrap(view.x, 80);
    for (let x = -offset; x < this.viewWidth; x += 80) ctx.fillRect(x, -10, 40, ceilingY + 10);
    ctx.fillStyle = this.palette.line;
    ctx.fillRect(0, ceilingY - 4, this.viewWidth, 4);
    ctx.globalAlpha = 1;
  }

  drawGround(view) {
    const ctx = this.ctx;
    const groundY = view.floor + view.y;
    if (groundY > VIEW_HEIGHT) return;
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(-10, groundY, this.viewWidth + 20, VIEW_HEIGHT - groundY + 10);
    ctx.fillStyle = this.palette.groundDark;
    const offset = wrap(view.x, 80);
    for (let x = -offset; x < this.viewWidth; x += 80) ctx.fillRect(x, groundY, 40, VIEW_HEIGHT - groundY + 10);
    if (this.palette.rainbow) {
      const stripe = ctx.createLinearGradient(0, 0, this.viewWidth, 0);
      RAINBOW.forEach((color, index) => stripe.addColorStop(index / (RAINBOW.length - 1), color));
      ctx.fillStyle = stripe;
    } else {
      ctx.fillStyle = this.palette.line;
    }
    ctx.fillRect(-10, groundY, this.viewWidth + 20, 5);
  }

  drawCheckpoints(view) {
    if (!this.useCheckpoints) return;
    const ctx = this.ctx;
    this.checkpoints.forEach((checkpoint) => {
      const x = checkpoint.x + PLAYER_SIZE / 2 - view.x;
      const y = view.floor - (checkpoint.y + PLAYER_SIZE / 2 - view.y);
      if (x < -20 || x > this.viewWidth + 20) return;
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
    // En carrera el cartel solo sale tras la cuenta atrás, para no taparla.
    if (this.race && (this.attempts > 1 || !this.raceStartedAt)) return;
    const x = this.attemptStartX + 160 - view.x;
    if (x < -300) return;
    const ctx = this.ctx;
    ctx.font = '700 34px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(43, 33, 64, 0.35)';
    ctx.fillStyle = '#ffffff';
    let text = `Intento ${this.attempts}`;
    if (this.race) text = '🏁 ¡A correr!';
    else if (this.practice) text = `Práctica · Intento ${this.attempts}`;
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

  /** Cada rival se ve como un fantasma semitransparente; si va fuera de la pantalla, una flecha en el borde. */
  drawRival(rival, index, view) {
    if (!rival.shown || rival.gone || rival.pos?.dead) return;
    const ctx = this.ctx;
    const x = rival.shown.x + PLAYER_SIZE / 2 - view.x;
    const y = view.floor - (rival.shown.y + PLAYER_SIZE / 2 - view.y);
    ctx.font = '700 15px Fredoka, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    if (x < -PLAYER_SIZE || x > this.viewWidth + PLAYER_SIZE) {
      const isAhead = x > 0;
      const edgeX = isAhead ? this.viewWidth - 44 : 44;
      // Si hay varios fuera de la pantalla, se apilan para que no se tapen.
      const edgeY = clamp(y, 60, FLOOR_Y - 20) + index * 36 * (y > VIEW_HEIGHT / 2 ? -1 : 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(edgeX - 36, edgeY - 16, 72, 32, 16);
      ctx.fill();
      ctx.fillStyle = this.palette.text;
      ctx.textAlign = 'center';
      ctx.fillText(isAhead ? `${rival.avatar} ▶` : `◀ ${rival.avatar}`, edgeX, edgeY + 1);
      return;
    }
    const target = rival.pos ?? { mode: 'cube', angle: 0, tilt: 0, gravityDir: 1 };
    ctx.save();
    ctx.globalAlpha = RIVAL_ALPHA;
    drawPlayer(ctx, rival.skin, {
      x,
      y,
      size: PLAYER_SIZE,
      mode: target.mode,
      angle: target.angle,
      tilt: target.tilt,
      time: this.time,
      flipped: target.gravityDir === -1,
    });
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(43, 33, 64, 0.45)';
    ctx.fillStyle = '#ffffff';
    const label = `${rival.avatar} ${rival.name}`;
    ctx.strokeText(label, x, y - PLAYER_SIZE);
    ctx.fillText(label, x, y - PLAYER_SIZE);
  }

  drawCountdown() {
    if (!this.race) return;
    let text = null;
    if (this.status === 'countdown' || (this.status === 'paused' && this.pausedFrom === 'countdown')) text = String(Math.max(1, Math.ceil(this.countdown)));
    else if (this.goLabelTime > 0) text = '¡YA!';
    if (!text) return;
    const ctx = this.ctx;
    ctx.font = '700 110px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(43, 33, 64, 0.4)';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(text, this.viewWidth / 2, VIEW_HEIGHT / 2 - 20);
    ctx.fillText(text, this.viewWidth / 2, VIEW_HEIGHT / 2 - 20);
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
      } else if (particle.kind === 'note') {
        ctx.font = `bold ${size * 3}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', x, y);
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
      const x = this.viewWidth - wrap(line.x + shift, this.viewWidth + line.length);
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
    ctx.fillRect(-10, -10, this.viewWidth + 20, VIEW_HEIGHT + 20);
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
    const trackX = (this.viewWidth - trackWidth) / 2;
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
    if (this.race) {
      this.rivalList
        .filter((rival) => !rival.gone)
        .forEach((rival) => this.drawTrackMarker(trackX + trackWidth * this.rivalProgress(rival), trackY + 6, rival.avatar, rival.skin.color.primary));
      this.drawTrackMarker(trackX + trackWidth * progress, trackY + 6, getActivePlayer()?.avatar ?? '⭐', this.skin.color.primary);
    }
  }

  drawTrackMarker(x, y, emoji, color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y + 1);
  }

  destroy() {
    clearTimeout(this.timer);
    if (this.race) {
      clearTimeout(this.podiumTimer);
      clearTimeout(this.podiumRefreshTimer);
      this.match.destroy();
      leaveRoom();
    }
    this.music.stop();
    this.flushTotals();
    closeModal();
    this.loop.destroy();
    this.unbinders.forEach((unbind) => unbind());
    this.stageFit.destroy();
    this.closeRotateHint();
    exitFullscreen();
  }
}

export function mountGeoGame(root, params) {
  const game = new GeoGame(root, params);
  return () => game.destroy();
}
