/**
 * Parque Mágico: caminar en 3D por el Parque del Café, hacer fila (o pagar el pase rápido),
 * montar en las atracciones (cada una es un minijuego de rides/) y ganar monedas, granos dorados
 * y misiones del día. Este módulo (con three.js) se carga solo al entrar en el parque.
 */
import * as THREE from 'three';
import { createGameLoop } from '../../core/gameLoop.js';
import { bindHoldButton, bindKeyboard } from '../../core/input.js';
import { createMusicLoop, sounds } from '../../core/audio.js';
import { trackEvent } from '../../core/analytics.js';
import { getActivePlayer, getGameData, sanitizeName, updateGameData } from '../../core/player.js';
import { createRandom, randomSeed } from '../../core/random.js';
import { el, navigate } from '../../ui/dom.js';
import { createBanner, createGameHeader, createTouchButton } from '../../ui/hud.js';
import { closeModal, showModal } from '../../ui/modal.js';
import { syncStickers } from '../../album/stickers.js';
import { at, createKit } from './kit.js';
import { createAvatar } from './avatar.js';
import { currentOutfit } from './outfits.js';
import { PARK_RADIUS, SPAWN } from './parkBase.js';
import { buildPark } from './parks.js';
import { PERSON_RADIUS, createCrowd } from './crowd.js';
import { groundHeight, isBlocked, resolveCollisions } from './collision.js';
import { MAX_QUEUE, slotPosition, waitSeconds } from './queue.js';
import { ALL_MISSIONS_BONUS, MISSION_COINS, describeMissions, recordMission, todaysMissions } from './missions.js';
import { FIRST_RIDE_BONUS, PARK_WORLDS, SNITCH_COINS, WELCOME_COINS, getRide, isWorldOpen } from './worlds.js';
import { RIDE_FACTORIES } from './rides/index.js';
import { createJoystick } from './joystick.js';
import { createFriends } from './friends.js';
import { EMOTES, SAYINGS } from './race.js';

const WALK_SPEED = 6;
const RUN_FACTOR = 1.5;
const JUMP_SPEED = 8.2;
const GRAVITY = 22;
/** Margen para saltar justo después de salir de un borde. */
const COYOTE_SECONDS = 0.12;
const PLAYER_RADIUS = 0.45;
/** Modos de cámara (botón 🎥 o tecla C): distancia detrás de la jugadora; `first` = primera persona. */
const CAMERA_MODES = [
  { id: 'normal', icon: '🎥', label: 'Normal', distance: 9 },
  { id: 'near', icon: '🔍', label: 'Cerca', distance: 5 },
  { id: 'far', icon: '🔭', label: 'Lejos', distance: 15 },
  { id: 'first', icon: '👀', label: 'Mis ojos', distance: 0 },
];
/** Altura de los ojos en primera persona. */
const EYE_HEIGHT = 2;
/** En primera persona, ◀ ▶ (o el joystick a los lados) giran la mirada a esta velocidad (rad/s). */
const FIRST_PERSON_TURN = 2.4;
/** Pantalla pequeña (celular): las misiones empiezan plegadas. Es la misma condición que en games.css. */
const COMPACT_QUERY = '(max-height: 560px), (max-width: 700px)';
/** En pantallas altas (celular en vertical) se abre el ángulo de la cámara para ver más. */
const MAX_FOV = 85;
const CAMERA_FOLLOW_RATE = 1.6;
const DRAG_HOLD_SECONDS = 2;
const COIN_COUNT = 30;
const COIN_RESPAWN_SECONDS = 25;
const PICK_RADIUS = 1.3;
const BEAN_COINS = 10;
const QUEUE_PROMPT_DISTANCE = 2.6;
const QUEUE_WALK_SPEED = 3.2;
/** Si se mantiene la dirección este tiempo estando en la fila, se sale de ella. */
const LEAVE_QUEUE_SECONDS = 0.7;
const CUTTER_ALERT_SECONDS = 7;
const RESULT_ARM_MS = 700;
const HINT_SECONDS = 9;
const TOAST_MS = 2200;
const BUBBLE_SECONDS = 2.2;
const DANCE_SECONDS = 2;
/** Tiempo mínimo entre dos saludos (para no llenar la pantalla de burbujas). */
const EMOTE_COOLDOWN = 0.8;
const FRIENDS_PANEL_EVERY = 0.3;
/** Cada cuánto se manda la posición dentro de una atracción a las amigas que van juntas. */
const RIDE_STATE_EVERY = 0.1;
/** Si dos amigas suben a la vez, se sigue a la de id menor si llega en este tiempo (ms). */
const BOARD_MERGE_MS = 2500;
/** Semilla fija: el parque se ve siempre igual (mismas palmas, mismo cafetal). */
const PARK_LAYOUT_SEED = 2024;

/** Música de cada parque. */
const MUSIC = {
  cafe: {
    bpm: 126,
    melody: 'C5 E5 G5 E5 F5 A5 G5 - E5 G5 C6 G5 A5 G5 E5 - D5 F5 A5 F5 G5 E5 C5 - D5 E5 F5 D5 C5 - - -',
    bass: 'C3 C3 F3 F3 C3 C3 G3 G3 C3 C3 F3 F3 G3 G3 C3 C3',
  },
  // Algo de cumbia y champeta para la costa.
  playa: {
    bpm: 120,
    melody: 'A4 C5 E5 C5 D5 E5 G5 E5 - E5 D5 C5 D5 E5 C5 A4 - A4 C5 E5 G5 A5 G5 E5 - D5 C5 D5 E5 A4 - - -',
    bass: 'A2 A3 A2 A3 F2 F3 F2 F3 C3 C3 G2 G3 A2 A3 E3 E3',
  },
  // Flauta pentatónica y tambores para la selva.
  selva: {
    bpm: 104,
    melody: 'D5 E5 G5 - A5 G5 E5 - D5 E5 G5 A5 B5 - A5 - G5 A5 B5 D6 B5 A5 G5 - E5 G5 A5 G5 E5 D5 - -',
    bass: 'D3 D3 A2 D3 G2 G3 D3 D3 D3 D3 A2 D3 E3 A2 D3 D3',
  },
  panaca: {
    bpm: 138,
    melody: 'G4 G4 C5 C5 E5 E5 C5 - D5 D5 B4 B4 G4 - - - G4 G4 C5 C5 E5 E5 G5 - F5 E5 D5 B4 C5 - - -',
    bass: 'C3 G3 C3 G3 G3 D3 G3 D3 C3 G3 C3 G3 G3 D3 C3 C3',
  },
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function distanceToSegment(point, a, b) {
  const abX = b.x - a.x;
  const abZ = b.z - a.z;
  const t = clamp(((point.x - a.x) * abX + (point.z - a.z) * abZ) / (abX * abX + abZ * abZ), 0, 1);
  return Math.hypot(point.x - (a.x + abX * t), point.z - (a.z + abZ * t));
}

function angleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export class ParkGame {
  constructor(root, { worldIndex = 0, friends = false } = {}) {
    this.kit = createKit();
    this.withFriends = friends;
    // Con amigas manda el parque de la sala (aunque aún no se haya abierto); sola, solo los abiertos.
    const world = PARK_WORLDS[worldIndex] ?? PARK_WORLDS[0];
    this.world = friends || isWorldOpen(world, getGameData('park')) ? world : PARK_WORLDS[0];
    this.rides = this.world.rides;
    this.treasure = this.world.treasure;
    this.buildDom(root);
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    } catch {
      this.showNoWebGl();
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.aspect = 16 / 9;

    this.scene = new THREE.Scene();
    this.park = buildPark(this.kit, this.scene, createRandom(PARK_LAYOUT_SEED), this.world);
    this.crowd = createCrowd({ kit: this.kit, scene: this.scene, random: Math.random, rides: this.rides });
    this.friends = friends ? createFriends({ kit: this.kit, scene: this.scene, onEvent: (event) => this.handleFriendEvent(event) }) : null;
    this.camera = new THREE.PerspectiveCamera(60, this.aspect, 0.1, 500);

    const data = getGameData('park');
    this.look = currentOutfit(data);
    this.avatar = createAvatar(this.kit, this.look);
    const name = sanitizeName(getActivePlayer()?.name) || 'Yo';
    const nameTag = this.kit.label(name, { background: '#ff5fa2', color: '#ffffff', height: 0.45 });
    nameTag.sprite.position.y = 2.95;
    this.avatar.root.add(nameTag.sprite);
    this.bubble = this.kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
    this.bubble.sprite.position.y = 3.6;
    this.bubble.sprite.visible = false;
    this.bubbleTimer = 0;
    this.danceTimer = 0;
    this.emoteCooldown = 0;
    this.friendsPanelTimer = 0;
    this.avatar.root.add(this.bubble.sprite);
    this.scene.add(this.avatar.root, this.avatar.shadow);

    this.player = { x: SPAWN.x, y: 0, z: SPAWN.z, vy: 0, heading: Math.PI, onGround: true, airTime: 0, speed: 0 };
    /** Último sitio seco donde se pisó (para volver si se cae al agua). */
    this.drySpot = { x: SPAWN.x, y: 0, z: SPAWN.z };
    this.cameraYaw = 0;
    this.cameraPitch = 0.42;
    this.lookPitch = 0;
    this.dragHold = 0;
    this.setCameraMode(CAMERA_MODES.find((mode) => mode.id === data.camera) ?? CAMERA_MODES[0]);
    this.camera.position.set(SPAWN.x, 5, SPAWN.z + this.cameraMode.distance);

    this.keys = { forward: false, back: false, left: false, right: false, run: false };
    this.touchSteer = { left: false, right: false, up: false, down: false };
    this.rideInput = { left: false, right: false, up: false, down: false, action: false, actionPressed: false, lookDelta: 0, lookDeltaY: 0 };
    this.status = 'walk';
    this.queueRide = null;
    this.rideRun = null;
    this.toasts = [];
    this.timers = [];
    this.hintTimer = HINT_SECONDS;

    this.buildCoins();
    this.buildBeans();
    this.music = createMusicLoop(MUSIC[this.world.id] ?? MUSIC.cafe);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.resize();

    this.loop = createGameLoop({
      update: (delta) => this.update(delta),
      render: () => this.render(),
      onAutoPause: () => this.pause(),
    });
    this.unbinders = this.bindControls();
    this.setMode('walk');
    this.refreshHud();
    this.refreshMissions();
    this.welcome();
    this.startFriends();
    this.loop.start();
    this.music.start();
  }

  // ---------- Pantalla ----------

  buildDom(root) {
    const data = getGameData('park');
    this.cameraButton = el('button', {
      className: 'icon-btn park-camera-button',
      attrs: { type: 'button', 'aria-label': 'Cambiar la cámara' },
      on: { click: (event) => this.handleButton(event, () => this.cycleCamera()) },
    });
    const extraActions = [this.cameraButton];
    // Pantalla completa (en Android quita las barras del navegador; el iPhone no la tiene).
    if (document.fullscreenEnabled) {
      extraActions.push(
        el('button', {
          className: 'icon-btn park-fullscreen-button',
          text: '⛶',
          attrs: { type: 'button', 'aria-label': 'Pantalla completa', title: 'Pantalla completa' },
          on: { click: (event) => this.handleButton(event, () => this.toggleFullscreen()) },
        }),
      );
    }
    this.header = createGameHeader({
      title: `${this.withFriends ? '👭' : this.world.emoji} ${this.world.name}`,
      backPath: '/parque',
      onPause: () => this.pause(),
      extraActions,
      items: [
        { key: 'coins', label: 'Monedas', icon: '🪙', value: data.coins },
        { key: 'beans', label: this.treasure.name, icon: this.treasure.icon, value: `${(data[this.treasure.key] ?? []).length}/${this.treasure.items.length}` },
        { key: 'rides', label: 'Viajes', icon: '🎢', value: data.totalRides },
      ],
    });

    this.canvas = el('canvas', { className: 'stage__canvas stage__canvas--park', attrs: { 'aria-label': 'Parque en 3D' } });
    this.hint = el('div', { className: 'stage__hint park-hint' }, [
      el('strong', { text: '¡Bienvenida al parque! 🎡' }),
      el('span', { text: 'Camina con WASD / flechas o el joystick · Espacio: saltar · Shift: correr · Arrastra para mirar alrededor' }),
      el('span', { text: 'Acércate a una fila y pulsa E (o el botón) para hacer fila.' }),
    ]);

    this.promptButton = el('button', { className: 'park-prompt', attrs: { type: 'button' }, on: { click: (event) => this.handleButton(event, () => this.interact()) } });
    // Las misiones se pliegan con un toque (en el celular empiezan plegadas para dejar sitio al juego).
    this.missionList = el('ul', {
      className: 'park-missions',
      attrs: { 'aria-label': 'Misiones de hoy' },
      on: {
        click: () => {
          this.missionList.classList.toggle('is-collapsed');
          this.refreshMissions();
        },
      },
    });
    this.missionList.classList.toggle('is-collapsed', window.matchMedia(COMPACT_QUERY).matches);
    this.friendsList = el('ul', { className: 'park-friends', attrs: { 'aria-label': 'Amigas en el parque', hidden: !this.withFriends } });
    // Saludos y gestos (los ven las amigas y los visitantes cercanos contestan).
    this.emoteButtons = EMOTES.map((kind, index) =>
      el('button', {
        className: 'park-emote',
        text: SAYINGS[kind].icon,
        attrs: { type: 'button', title: `${SAYINGS[kind].label} (${index + 1})`, 'aria-label': SAYINGS[kind].label },
        on: { click: (event) => this.handleButton(event, () => this.emote(kind)) },
      }),
    );
    // En el celular los saludos se guardan detrás de un botón para no tapar el juego.
    this.emoteToggle = el('button', {
      className: 'park-emote park-emote--toggle',
      text: '😀',
      attrs: { type: 'button', 'aria-label': 'Saludos', title: 'Saludos' },
      on: { click: (event) => this.handleButton(event, () => this.emoteBar.classList.toggle('is-open')) },
    });
    this.emoteBar = el('div', { className: 'park-emotes' }, [this.emoteToggle, ...this.emoteButtons]);

    // Tarjeta de la fila.
    this.queueText = el('strong', { className: 'park-queue__text' });
    this.fastPassButton = el('button', {
      className: 'btn btn--primary park-queue__fast',
      attrs: { type: 'button' },
      on: { click: (event) => this.handleButton(event, () => this.useFastPass()) },
    });
    this.leaveButton = el('button', {
      className: 'btn btn--secondary park-queue__leave',
      text: '🚶 Salir de la fila',
      attrs: { type: 'button' },
      on: { click: (event) => this.handleButton(event, () => this.leaveQueue()) },
    });
    this.queueCard = el('div', { className: 'park-queue' }, [this.queueText, el('div', { className: 'park-queue__actions' }, [this.fastPassButton, this.leaveButton])]);
    this.cutterButton = el('button', {
      className: 'park-cutter',
      text: '🚨 ¡Alguien se coló! Avisar al vigilante',
      attrs: { type: 'button' },
      on: { click: (event) => this.handleButton(event, () => this.snitch()) },
    });

    // Atracción en marcha.
    this.rideStatus = el('div', { className: 'park-ride-status' });
    this.ridePrompt = el('div', { className: 'park-ride-prompt', attrs: { 'aria-live': 'polite' } });
    this.reticle = el('div', { className: 'park-reticle', attrs: { 'aria-hidden': 'true' } });
    this.exitRideButton = el('button', {
      className: 'park-exit',
      text: '🚪 Bajarme',
      attrs: { type: 'button', title: 'Bajarme de la atracción' },
      on: { click: (event) => this.handleButton(event, () => this.askExitRide()) },
    });
    this.actionButton = el('button', { className: 'park-action', attrs: { type: 'button' } }, [
      el('span', { className: 'park-action__icon' }),
      el('span', { className: 'park-action__label' }),
    ]);

    // Controles táctiles.
    this.joystick = createJoystick();
    this.jumpButton = createTouchButton({ icon: '⬆️', label: 'Saltar', variant: 'jump' });
    this.steerLeft = createTouchButton({ icon: '◀', label: 'Izquierda', variant: 'steer' });
    this.steerRight = createTouchButton({ icon: '▶', label: 'Derecha', variant: 'steer' });
    // Arriba/abajo: solo en las atracciones que apuntan (el cañón del galeón).
    this.steerUp = createTouchButton({ icon: '▲', label: 'Arriba', variant: 'steer' });
    this.steerDown = createTouchButton({ icon: '▼', label: 'Abajo', variant: 'steer' });
    this.steerUp.classList.add('touch-btn--aim');
    this.steerDown.classList.add('touch-btn--aim');
    const touch = el('div', { className: 'park-touch' }, [
      this.joystick.element,
      el('div', { className: 'park-touch__steer' }, [this.steerLeft, this.steerUp, this.steerDown, this.steerRight]),
      this.jumpButton,
    ]);

    this.resultLayer = el('div', { className: 'park-result' });

    this.stage = el('div', { className: 'stage stage--park' }, [
      this.canvas,
      this.missionList,
      this.friendsList,
      this.emoteBar,
      this.rideStatus,
      this.ridePrompt,
      this.reticle,
      this.exitRideButton,
      this.hint,
      this.promptButton,
      this.queueCard,
      this.cutterButton,
      touch,
      this.actionButton,
      this.resultLayer,
    ]);
    this.showBanner = createBanner(this.stage);
    this.page = el('main', { className: 'page game-page park-page' }, [this.header.element, this.stage]);
    root.append(this.page);
  }

  showNoWebGl() {
    this.stage.replaceChildren(
      el('div', { className: 'park-error' }, [
        el('strong', { text: '😢 Este dispositivo no puede mostrar el parque en 3D.' }),
        el('button', { className: 'btn btn--primary', text: 'Volver', attrs: { type: 'button' }, on: { click: () => navigate('/parque') } }),
      ]),
    );
  }

  /** Los botones pierden el foco al pulsarlos: así Espacio sigue siendo «saltar». */
  handleButton(event, action) {
    event.currentTarget.blur();
    sounds.click();
    action();
  }

  setMode(mode) {
    this.stage.dataset.mode = mode;
    this.page.dataset.mode = mode;
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.aspect = width / height;
  }

  // ---------- Controles ----------

  bindControls() {
    const press = (action) => {
      if (action === 'pause') return this.pause();
      if (action === 'camera') return this.cycleCamera();
      if (this.status === 'result') {
        if (['jump', 'interact'].includes(action)) this.closeResult();
        return;
      }
      if (action in this.keys) this.keys[action] = true;
      if (this.status === 'ride') {
        if (['jump', 'interact'].includes(action)) this.pressRideAction();
        return;
      }
      if (action === 'jump') this.requestJump();
      if (action === 'interact') this.interact();
      if (action.startsWith('emote-')) this.emote(EMOTES[Number(action.slice(6))]);
    };
    const release = (action) => {
      if (action in this.keys) this.keys[action] = false;
      if (['jump', 'interact'].includes(action)) this.rideInput.action = false;
    };

    return [
      bindKeyboard(
        {
          forward: ['ArrowUp', 'KeyW'],
          back: ['ArrowDown', 'KeyS'],
          left: ['ArrowLeft', 'KeyA'],
          right: ['ArrowRight', 'KeyD'],
          run: ['ShiftLeft', 'ShiftRight'],
          jump: ['Space'],
          interact: ['KeyE', 'Enter', 'NumpadEnter'],
          pause: ['KeyP', 'Escape'],
          camera: ['KeyC'],
          ...Object.fromEntries(EMOTES.map((_, index) => [`emote-${index}`, [`Digit${index + 1}`, `Numpad${index + 1}`]])),
        },
        { onPress: (action, repeat) => !repeat && press(action), onRelease: release },
      ),
      bindHoldButton(this.jumpButton, { onPress: () => this.requestJump() }),
      bindHoldButton(this.actionButton, { onPress: () => this.pressRideAction(), onRelease: () => (this.rideInput.action = false) }),
      bindHoldButton(this.steerLeft, { onPress: () => (this.touchSteer.left = true), onRelease: () => (this.touchSteer.left = false) }),
      bindHoldButton(this.steerRight, { onPress: () => (this.touchSteer.right = true), onRelease: () => (this.touchSteer.right = false) }),
      bindHoldButton(this.steerUp, { onPress: () => (this.touchSteer.up = true), onRelease: () => (this.touchSteer.up = false) }),
      bindHoldButton(this.steerDown, { onPress: () => (this.touchSteer.down = true), onRelease: () => (this.touchSteer.down = false) }),
      this.bindCameraDrag(),
      () => this.joystick.destroy(),
    ];
  }

  /** Arrastrar sobre el parque gira la cámara (o la mirada, en la rueda). */
  bindCameraDrag() {
    let pointerId = null;
    let lastX = 0;
    let lastY = 0;
    const down = (event) => {
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      this.canvas.setPointerCapture(pointerId);
    };
    const move = (event) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      if (this.status === 'ride') {
        this.rideInput.lookDelta += dx * 0.006;
        this.rideInput.lookDeltaY += dy * 0.004;
        return;
      }
      this.cameraYaw -= dx * 0.008;
      if (this.cameraMode.id === 'first') this.lookPitch = clamp(this.lookPitch - dy * 0.005, -0.8, 0.8);
      else this.cameraPitch = clamp(this.cameraPitch + dy * 0.005, 0.12, 1.1);
      this.dragHold = DRAG_HOLD_SECONDS;
    };
    const up = (event) => {
      if (event.pointerId === pointerId) pointerId = null;
    };
    const events = [
      ['pointerdown', down],
      ['pointermove', move],
      ['pointerup', up],
      ['pointercancel', up],
    ];
    events.forEach(([name, handler]) => this.canvas.addEventListener(name, handler));
    return () => events.forEach(([name, handler]) => this.canvas.removeEventListener(name, handler));
  }

  pressRideAction() {
    if (this.status !== 'ride') return;
    this.rideInput.action = true;
    this.rideInput.actionPressed = true;
  }

  requestJump() {
    if (this.status !== 'walk') return;
    const { player } = this;
    if (!player.onGround && player.airTime > COYOTE_SECONDS) return;
    player.vy = JUMP_SPEED;
    player.onGround = false;
    player.airTime = COYOTE_SECONDS + 1;
    sounds.jump();
    this.progress('jump');
  }

  // ---------- Bucle ----------

  update(delta) {
    this.park.update(delta);
    this.crowd.update(delta);
    this.updateFriends(delta);
    this.animatePickups(delta);
    if (this.hintTimer > 0) {
      this.hintTimer -= delta;
      if (this.hintTimer <= 0) this.hint.hidden = true;
    }

    if (this.status === 'walk') {
      this.updateWalk(delta);
      this.updatePrompt();
    } else if (this.status === 'queue') {
      this.updateQueue(delta);
    } else if (this.status === 'ride') {
      this.updateRide(delta);
      return;
    }
    this.syncAvatar(delta);
    this.updateCamera(delta);
  }

  render() {
    const camera = this.rideRun ? this.rideRun.session.camera : this.camera;
    const scene = this.rideRun?.session.scene ?? this.scene;
    camera.userData.baseFov ??= camera.fov;
    const fov = Math.min(MAX_FOV, camera.userData.baseFov * (1 + Math.max(0, 1.3 - this.aspect) * 0.5));
    if (camera.aspect !== this.aspect || camera.fov !== fov) {
      camera.aspect = this.aspect;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    this.renderer.render(scene, camera);
  }

  movementInput() {
    const { keys, joystick } = this;
    let forward = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) + joystick.vector.y;
    let strafe = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joystick.vector.x;
    const length = Math.hypot(forward, strafe);
    if (length > 1) {
      forward /= length;
      strafe /= length;
    }
    return { forward, strafe, amount: Math.min(1, length) };
  }

  updateWalk(delta) {
    const { player } = this;
    let { forward, strafe, amount } = this.movementInput();
    const firstPerson = this.cameraMode.id === 'first';
    if (firstPerson) {
      // En primera persona, a los lados se gira la mirada y adelante/atrás se camina hacia donde se mira.
      this.cameraYaw -= strafe * FIRST_PERSON_TURN * delta;
      player.heading = this.cameraYaw + Math.PI;
      strafe = 0;
      amount = Math.abs(forward);
    }
    const sin = Math.sin(this.cameraYaw);
    const cos = Math.cos(this.cameraYaw);
    const dirX = -sin * forward + cos * strafe;
    const dirZ = -cos * forward - sin * strafe;
    const speed = WALK_SPEED * (this.keys.run ? RUN_FACTOR : 1);
    player.x += dirX * speed * delta;
    player.z += dirZ * speed * delta;
    player.speed = amount * speed;

    if (amount > 0.1 && this.hintTimer > 0 && this.hintTimer < HINT_SECONDS - 1.5) this.hintTimer = Math.min(this.hintTimer, 0.01);
    if (amount > 0.1 && !firstPerson) {
      const heading = Math.atan2(dirX, dirZ);
      player.heading += angleDiff(heading, player.heading) * Math.min(1, delta * 12);
      // La cámara se pone poco a poco detrás cuando se camina hacia delante.
      if (forward > 0.2 && this.dragHold <= 0) {
        this.cameraYaw += angleDiff(player.heading + Math.PI, this.cameraYaw) * Math.min(1, delta * CAMERA_FOLLOW_RATE * forward);
      }
    }
    this.dragHold -= delta;

    const feetBefore = player.y;
    player.vy -= GRAVITY * delta;
    player.y += player.vy * delta;
    // Para chocar y buscar el suelo se usan los pies de antes de caer: en cada cuadro la gravedad los
    // hunde un poco y un escalón parecería una pared.
    const body = { x: player.x, z: player.z, y: Math.max(player.y, feetBefore) };
    resolveCollisions(this.park.colliders, body, PLAYER_RADIUS);
    player.x = body.x;
    player.z = body.z;
    this.crowd.bodies().forEach((body) => {
      const dx = player.x - body.x;
      const dz = player.z - body.z;
      const distance = Math.hypot(dx, dz);
      const minDistance = PLAYER_RADIUS + PERSON_RADIUS;
      if (distance > 1e-3 && distance < minDistance) {
        player.x = body.x + (dx / distance) * minDistance;
        player.z = body.z + (dz / distance) * minDistance;
      }
    });
    const fromCenter = Math.hypot(player.x, player.z);
    if (fromCenter > PARK_RADIUS) {
      player.x *= PARK_RADIUS / fromCenter;
      player.z *= PARK_RADIUS / fromCenter;
    }
    const ground = groundHeight(this.park.colliders, player.x, player.z, body.y);
    if (player.y <= ground) {
      player.y = ground;
      player.vy = 0;
      player.onGround = true;
      player.airTime = 0;
      if (ground === 0 && this.park.isWater?.(player.x, player.z)) this.fallInWater();
      else Object.assign(this.drySpot, { x: player.x, y: player.y, z: player.z });
    } else {
      player.onGround = false;
      player.airTime += delta;
    }
    this.collectPickups();
  }

  /** Al pisar el agua (río, lago): ¡splash! y se vuelve a la orilla, sin perder nada. */
  fallInWater() {
    const { player, drySpot } = this;
    sounds.splash();
    Object.assign(player, { x: drySpot.x, y: drySpot.y, z: drySpot.z, vy: 0 });
    this.playerSay('💦 ¡Splash!');
  }

  syncAvatar(delta) {
    const { player, avatar } = this;
    avatar.root.position.set(player.x, player.y, player.z);
    this.danceTimer -= delta;
    avatar.root.rotation.y = player.heading + (this.danceTimer > 0 ? (1 - this.danceTimer / DANCE_SECONDS) * Math.PI * 4 : 0);
    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= delta;
      if (this.bubbleTimer <= 0) this.bubble.sprite.visible = false;
    }
    const ground = groundHeight(this.park.colliders, player.x, player.z, player.y);
    avatar.shadow.position.set(player.x, ground + 0.03, player.z);
    avatar.update(delta, { speed: player.speed, airborne: !player.onGround && player.airTime > COYOTE_SECONDS });
  }

  updateCamera(delta) {
    const { player } = this;
    if (this.cameraMode.id === 'first') {
      const cos = Math.cos(this.lookPitch);
      this.camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
      this.camera.lookAt(
        player.x - Math.sin(this.cameraYaw) * cos,
        player.y + EYE_HEIGHT + Math.sin(this.lookPitch),
        player.z - Math.cos(this.cameraYaw) * cos,
      );
      return;
    }
    const distance = this.cameraMode.distance;
    const flat = Math.cos(this.cameraPitch) * distance;
    const target = new THREE.Vector3(player.x, player.y + 1.6, player.z);
    const desired = new THREE.Vector3(
      player.x + Math.sin(this.cameraYaw) * flat,
      player.y + 1.5 + Math.sin(this.cameraPitch) * distance,
      player.z + Math.cos(this.cameraYaw) * flat,
    );
    this.camera.position.lerp(desired, Math.min(1, delta * 10));
    this.camera.lookAt(target);
  }

  cycleCamera() {
    if (!['walk', 'queue'].includes(this.status)) return;
    const index = CAMERA_MODES.indexOf(this.cameraMode);
    const mode = CAMERA_MODES[(index + 1) % CAMERA_MODES.length];
    this.setCameraMode(mode);
    updateGameData('park', { camera: mode.id });
    this.showBanner(`${mode.icon} Cámara: ${mode.label}`, 1200);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.lookPitch = 0;
    // Al pasar a primera persona se mira hacia donde iba la jugadora.
    if (mode.id === 'first' && this.player) this.cameraYaw = this.player.heading + Math.PI;
    this.cameraButton.textContent = mode.icon;
    this.cameraButton.title = `Cámara: ${mode.label} (C)`;
    this.syncAvatarVisibility();
  }

  /** La jugadora no se ve en primera persona ni mientras va en una atracción. */
  syncAvatarVisibility() {
    const visible = this.status !== 'ride' && this.cameraMode.id !== 'first';
    this.avatar.root.visible = visible;
    this.avatar.shadow.visible = visible;
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // ---------- Monedas y granos dorados ----------

  buildCoins() {
    this.coins = Array.from({ length: COIN_COUNT }, () => {
      const coin = new THREE.Group();
      const disc = this.kit.cyl(0.42, 0.42, 0.1, 0xffc21a, 16, { emissive: 0x4a3400 });
      disc.rotation.x = Math.PI / 2;
      coin.add(disc, at(this.kit.cyl(0.25, 0.25, 0.12, 0xffe680, 12), 0, 0, 0));
      coin.children[1].rotation.x = Math.PI / 2;
      this.scene.add(coin);
      const entry = { mesh: coin, respawn: 0 };
      this.placeCoin(entry);
      return entry;
    });
  }

  placeCoin(entry) {
    const queueSegments = this.rides.map((ride) => [slotPosition(ride, -1), slotPosition(ride, MAX_QUEUE + 1)]);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * (PARK_RADIUS - 8);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      if (isBlocked(this.park.colliders, x, z, 1) || this.park.isWater?.(x, z)) continue;
      if (queueSegments.some(([a, b]) => distanceToSegment({ x, z }, a, b) < 1.8)) continue;
      entry.mesh.position.set(x, 1, z);
      entry.mesh.visible = true;
      return;
    }
    entry.mesh.visible = false;
    entry.respawn = COIN_RESPAWN_SECONDS;
  }

  buildBeans() {
    const collected = getGameData('park')[this.treasure.key] ?? [];
    this.beans = this.treasure.items.filter((bean) => !collected.includes(bean.id)).map((bean) => {
      const mesh = at(new THREE.Group(), bean.x, bean.y, bean.z);
      const body = this.kit.sphere(0.4, 0xffd21f, 12, { emissive: 0x6a4a00 });
      body.scale.set(0.8, 1.1, 0.6);
      const halo = this.kit.torus(0.75, 0.05, 0xfff2a8, { emissive: 0x806a00 });
      mesh.add(body, at(this.kit.box(0.06, 0.7, 0.02, 0x8a6200), 0, 0, 0.24), halo);
      this.scene.add(mesh);
      return { bean, mesh, halo };
    });
  }

  animatePickups(delta) {
    this.coins.forEach((entry) => {
      if (!entry.mesh.visible) {
        entry.respawn -= delta;
        if (entry.respawn <= 0) this.placeCoin(entry);
        return;
      }
      entry.mesh.rotation.y += delta * 3;
    });
    this.beans.forEach(({ bean, mesh, halo }) => {
      mesh.rotation.y += delta * 1.5;
      mesh.position.y = bean.y + Math.sin(performance.now() / 400) * 0.15;
      halo.rotation.x += delta * 2;
    });
  }

  collectPickups() {
    const { player } = this;
    const near = (position, radius) =>
      Math.hypot(position.x - player.x, position.z - player.z) < radius && Math.abs(position.y - (player.y + 1)) < 1.6;

    this.coins.forEach((entry) => {
      if (!entry.mesh.visible || !near(entry.mesh.position, PICK_RADIUS)) return;
      entry.mesh.visible = false;
      entry.respawn = COIN_RESPAWN_SECONDS;
      sounds.coin();
      this.addCoins(1);
      this.progress('coin');
    });

    this.beans = this.beans.filter((entry) => {
      if (!near(entry.mesh.position, PICK_RADIUS + 0.2)) return true;
      this.scene.remove(entry.mesh);
      const data = getGameData('park');
      const { key, icon, item, items } = this.treasure;
      const found = [...(data[key] ?? []), entry.bean.id];
      updateGameData('park', { [key]: found, coins: data.coins + BEAN_COINS });
      sounds.achievement();
      this.notify(`${icon} ¡${capitalize(item)}! ${found.length}/${items.length} · +${BEAN_COINS} 🪙`);
      this.friends?.say('bean');
      trackEvent(`parque-tesoro-${this.world.id}`, `Parque · ${item} en ${this.world.name}`);
      this.progress('bean');
      this.refreshHud();
      this.checkStickers();
      return false;
    });
  }

  addCoins(amount) {
    const data = getGameData('park');
    updateGameData('park', { coins: data.coins + amount });
    this.refreshHud();
  }

  // ---------- Filas ----------

  nearestQueue() {
    const { player } = this;
    if (player.y > 1) return null;
    let best = null;
    let bestDistance = QUEUE_PROMPT_DISTANCE;
    this.rides.forEach((ride) => {
      const distance = distanceToSegment(player, slotPosition(ride, -1), slotPosition(ride, MAX_QUEUE));
      if (distance < bestDistance) {
        best = ride;
        bestDistance = distance;
      }
    });
    return best;
  }

  updatePrompt() {
    const ride = this.nearestQueue();
    this.promptRide = ride;
    this.promptButton.hidden = !ride;
    if (!ride) return;
    const people = this.crowd.getQueue(ride.id).people.length;
    const text = `${ride.emoji} Hacer fila: ${ride.name} · 👥 ${people}  (E)`;
    if (this.promptButton.textContent !== text) this.promptButton.textContent = text;
  }

  interact() {
    if (this.status === 'queue') {
      if (this.cutter) this.snitch();
      return;
    }
    if (this.status !== 'walk' || !this.promptRide) return;
    this.joinQueue(this.promptRide);
  }

  joinQueue(ride) {
    if (this.crowd.getQueue(ride.id).people.length >= MAX_QUEUE) {
      this.showBanner('😅 ¡La fila está llena! Prueba en un ratito');
      return;
    }
    sounds.checkpoint();
    this.crowd.joinPlayer(ride.id, (boarded, via) => this.startRide(boarded, via));
    this.queueRide = ride;
    this.status = 'queue';
    this.queueMoveTimer = 0;
    this.cutter = null;
    this.cutterTried = false;
    this.cutterTimer = 4 + Math.random() * 5;
    this.promptButton.hidden = true;
    this.player.vy = 0;
    this.setMode('queue');
    this.hint.hidden = true;
  }

  updateQueue(delta) {
    const ride = this.queueRide;
    const { player } = this;
    const index = this.crowd.playerIndex(ride.id);
    if (index < 0) return;
    const slot = slotPosition(ride, index);
    const dx = slot.x - player.x;
    const dz = slot.z - player.z;
    const distance = Math.hypot(dx, dz);
    player.y = Math.max(0, player.y - delta * 6);
    player.onGround = true;
    if (distance > 0.05) {
      const step = Math.min(distance, QUEUE_WALK_SPEED * delta);
      player.x += (dx / distance) * step;
      player.z += (dz / distance) * step;
      player.speed = QUEUE_WALK_SPEED;
      player.heading += angleDiff(Math.atan2(dx, dz), player.heading) * Math.min(1, delta * 10);
    } else {
      player.speed = 0;
      player.heading += angleDiff(Math.atan2(-ride.queueDir.x, -ride.queueDir.z), player.heading) * Math.min(1, delta * 6);
    }

    const queue = this.crowd.getQueue(ride.id);
    const text = index === 0 ? '¡Te toca ya! 🎉' : `${ride.emoji} ${ride.name} · 👥 Delante: ${index} · ⏳ ${Math.ceil(waitSeconds(queue, index))} s`;
    if (this.queueText.textContent !== text) this.queueText.textContent = text;
    const coins = getGameData('park').coins;
    this.fastPassButton.textContent = `🎟️ Pase rápido · ${ride.fastPassPrice} 🪙`;
    this.fastPassButton.disabled = coins < ride.fastPassPrice;

    // Moverse un rato con las flechas o el joystick saca de la fila.
    this.queueMoveTimer = this.movementInput().amount > 0.5 ? this.queueMoveTimer + delta : 0;
    if (this.queueMoveTimer > LEAVE_QUEUE_SECONDS) {
      this.leaveQueue();
      return;
    }
    this.updateCutter(delta, index);
  }

  updateCutter(delta, index) {
    if (this.cutter) {
      this.cutterAlert -= delta;
      if (this.cutter.state !== 'queue' || this.cutter.rideId !== this.queueRide.id) {
        this.hideCutter();
      } else if (this.cutterAlert <= 0) {
        this.crowd.giveUpCutter(this.cutter);
        this.hideCutter();
      }
      return;
    }
    if (this.cutterTried || index < 2) return;
    this.cutterTimer -= delta;
    if (this.cutterTimer > 0) return;
    this.cutterTried = true;
    if (Math.random() > 0.6) return;
    this.cutter = this.crowd.startCutter(this.queueRide.id);
    if (!this.cutter) return;
    this.cutterAlert = CUTTER_ALERT_SECONDS;
    this.cutterButton.classList.add('is-visible');
    sounds.alert();
  }

  hideCutter() {
    this.cutter = null;
    this.cutterButton.classList.remove('is-visible');
  }

  snitch() {
    if (!this.cutter) return;
    this.crowd.expelCutter(this.cutter);
    this.hideCutter();
    const data = getGameData('park');
    updateGameData('park', { coins: data.coins + SNITCH_COINS, snitches: data.snitches + 1 });
    sounds.levelUp();
    this.notify(`👮 ¡Gracias por avisar! +${SNITCH_COINS} 🪙`);
    this.playerSay(SAYINGS.snitch.text);
    this.friends?.say('snitch', this.queueRide?.id);
    trackEvent('parque-colado', 'Parque · aviso al vigilante');
    this.progress('snitch');
    this.refreshHud();
    this.checkStickers();
  }

  useFastPass() {
    const ride = this.queueRide;
    if (this.status !== 'queue' || !ride) return;
    const data = getGameData('park');
    if (data.coins < ride.fastPassPrice) return;
    updateGameData('park', { coins: data.coins - ride.fastPassPrice, fastPasses: data.fastPasses + 1 });
    sounds.cash();
    this.friends?.say('fastpass', ride.id);
    trackEvent('parque-pase-rapido', 'Parque · pase rápido');
    this.refreshHud();
    this.progress('fastpass');
    this.checkStickers();
    this.crowd.boardPlayerNow(ride.id);
  }

  leaveQueue() {
    if (this.status !== 'queue') return;
    this.crowd.leavePlayer(this.queueRide.id);
    if (this.cutter) this.crowd.giveUpCutter(this.cutter);
    this.hideCutter();
    this.queueRide = null;
    this.status = 'walk';
    this.setMode('walk');
    // Un pasito fuera de la baranda.
    this.player.x += Math.cos(this.player.heading) * 1.4;
    this.player.z -= Math.sin(this.player.heading) * 1.4;
  }

  // ---------- Atracciones ----------

  /**
   * Sube a la atracción. `group` = { mates, seed, leaderId } cuando una amiga se llevó a la jugadora;
   * si no, se lleva a las amigas que estaban en la misma fila.
   */
  startRide(ride, via, group = null) {
    if (!group && this.friends) {
      const mates = this.friends.list().filter((friend) => friend.target?.mode === 'queue' && friend.target.rideId === ride.id);
      if (mates.length) {
        group = { mates, seed: randomSeed(), leaderId: this.friends.myId };
        this.friends.board(ride.id, group.seed, mates.map((friend) => friend.id));
        this.notify(`👭 ¡${mates.map((friend) => friend.name).join(' y ')} ${mates.length > 1 ? 'suben' : 'sube'} contigo!`);
      }
    }
    if (this.cutter) this.crowd.giveUpCutter(this.cutter);
    this.hideCutter();
    this.queueRide = null;
    this.status = 'ride';
    this.syncAvatarVisibility();
    if (via === 'queue') this.progress('queue');
    const session = RIDE_FACTORIES[ride.id]({
      kit: this.kit,
      park: this.park,
      scene: this.scene,
      look: this.look,
      // Juntas, todas usan la misma semilla: la misma caída, los mismos globos, el mismo camino.
      random: group ? createRandom(group.seed) : Math.random,
      mates: (group?.mates ?? []).map(({ id, name, emoji, look }) => ({ id, name, emoji, look })),
      myId: this.friends?.myId ?? 'h',
      // Lo que pasa en la atracción (p. ej. un grito) lo ven las amigas.
      announce: (kind) => this.friends?.say(kind, ride.id),
    });
    this.rideRun = {
      ride,
      via,
      session,
      mateIds: new Set((group?.mates ?? []).map((friend) => friend.id)),
      leaderId: group?.leaderId ?? null,
      startedAt: performance.now(),
      stateTimer: 0,
    };
    Object.assign(this.rideInput, { action: false, actionPressed: false, lookDelta: 0, lookDeltaY: 0 });
    const { action, steer } = session.controls;
    this.actionButton.querySelector('.park-action__icon').textContent = action.icon;
    this.actionButton.querySelector('.park-action__label').textContent = action.label;
    this.stage.classList.toggle('has-steer', steer);
    this.stage.classList.toggle('has-aim', Boolean(session.controls.aim));
    this.stage.classList.toggle('has-reticle', Boolean(session.reticle));
    this.setMode('ride');
    this.showBanner(`${ride.emoji} ${session.intro}`, 3200);
    sounds.levelUp();
    trackEvent(`parque-${ride.id}`, `Parque · ${ride.name}`);
  }

  updateRide(delta) {
    const { session } = this.rideRun;
    this.rideInput.left = this.keys.left || this.touchSteer.left;
    this.rideInput.right = this.keys.right || this.touchSteer.right;
    this.rideInput.up = this.keys.forward || this.touchSteer.up;
    this.rideInput.down = this.keys.back || this.touchSteer.down;
    session.update(delta, this.rideInput);
    if (this.friends && session.mateState && this.rideRun.mateIds.size) {
      this.rideRun.stateTimer -= delta;
      if (this.rideRun.stateTimer <= 0) {
        this.rideRun.stateTimer = RIDE_STATE_EVERY;
        this.friends.rideState(this.rideRun.ride.id, session.mateState());
      }
    }
    this.rideInput.actionPressed = false;
    this.rideInput.lookDelta = 0;
    this.rideInput.lookDeltaY = 0;
    const status = session.status();
    if (this.rideStatus.textContent !== status) this.rideStatus.textContent = status;
    const prompt = session.prompt();
    if (this.ridePrompt.textContent !== prompt) {
      this.ridePrompt.textContent = prompt;
      this.ridePrompt.classList.remove('is-pop');
      void this.ridePrompt.offsetWidth;
      if (prompt) this.ridePrompt.classList.add('is-pop');
    }
    if (session.done) this.finishRide();
  }

  finishRide() {
    const { ride, session } = this.rideRun;
    // Foto del último momento (se lee el canvas justo después de dibujar).
    this.render();
    let photo = '';
    try {
      photo = this.canvas.toDataURL('image/jpeg', 0.75);
    } catch {
      photo = '';
    }
    const result = session.result();
    session.dispose();
    this.rideRun = null;

    const data = getGameData('park');
    const firstTime = !data.ridesDone[ride.id];
    const bonus = firstTime ? FIRST_RIDE_BONUS : 0;
    const wasOpen = PARK_WORLDS.map((world) => isWorldOpen(world, data));
    updateGameData('park', {
      coins: data.coins + result.coins + bonus,
      ridesDone: { ...data.ridesDone, [ride.id]: (data.ridesDone[ride.id] ?? 0) + 1 },
      totalRides: data.totalRides + 1,
    });
    // ¿Este viaje abrió un parque nuevo?
    PARK_WORLDS.forEach((world, index) => {
      if (wasOpen[index] || !isWorldOpen(world, getGameData('park'))) return;
      this.notify(`🗺️ ¡Abriste ${world.emoji} ${world.name}! Búscalo al salir del parque`);
      trackEvent(`parque-abre-${world.id}`, `Parque · abre ${world.name}`);
    });
    this.progress('ride');
    this.progress(`ride-${ride.id}`);
    this.friends?.say('ride', ride.id);

    this.status = 'result';
    this.placeAtRideExit(ride);
    this.setMode('result');
    sounds.win();
    this.refreshHud();
    this.showResult({ ride, result, photo, bonus });
    this.checkStickers();
  }

  /** Sale junto al final de la fila, mirando a la plaza (la cámara queda lejos del arco). */
  placeAtRideExit(ride) {
    const side = { x: -ride.queueDir.z, z: ride.queueDir.x };
    const exit = slotPosition(ride, MAX_QUEUE + 1);
    Object.assign(this.player, {
      x: exit.x + side.x * 2.4,
      z: exit.z + side.z * 2.4,
      y: 0,
      vy: 0,
      speed: 0,
    });
    this.player.heading = Math.atan2(-this.player.x, -this.player.z);
    this.cameraYaw = this.player.heading + Math.PI;
    const distance = this.cameraMode.distance;
    this.camera.position.set(this.player.x - Math.sin(this.player.heading) * distance, 5, this.player.z - Math.cos(this.player.heading) * distance);
    this.syncAvatarVisibility();
  }

  /** Botón 🚪: pregunta antes de bajarse (así un toque sin querer no la saca de la atracción). */
  askExitRide() {
    if (this.status !== 'ride') return;
    this.pause({ exitRide: true });
  }

  /** Bajarse antes de terminar: sin premio ni viaje contado, y de vuelta junto a la fila. */
  exitRide() {
    if (this.status !== 'ride' || !this.rideRun) return;
    const { ride, session } = this.rideRun;
    session.dispose();
    this.rideRun = null;
    this.status = 'walk';
    this.placeAtRideExit(ride);
    this.setMode('walk');
    this.notify(`🚪 Te bajaste de ${ride.emoji} ${ride.name}. ¡Vuelve cuando quieras!`);
  }

  showResult({ ride, result, photo, bonus }) {
    const stats = [
      ...result.stats,
      { label: 'Monedas', value: `+${result.coins} 🪙` },
      bonus ? { label: '¡Primera vez!', value: `+${bonus} 🪙` } : null,
    ].filter(Boolean);
    const closeButton = el('button', {
      className: 'btn btn--primary btn--lg',
      text: '¡Seguir paseando! ▶',
      attrs: { type: 'button' },
      on: { click: (event) => this.handleButton(event, () => this.closeResult(true)) },
    });
    const card = el('div', { className: 'park-result__card', attrs: { role: 'dialog', 'aria-label': result.title } }, [
      el('figure', { className: 'park-photo' }, [
        photo ? el('img', { attrs: { src: photo, alt: `Foto en ${ride.name}` } }) : el('div', { className: 'park-photo__empty', text: result.emoji }),
        el('figcaption', { text: `${ride.emoji} ${ride.name}` }),
      ]),
      el('h2', { className: 'park-result__title', text: result.title }),
      el(
        'dl',
        { className: 'modal__stats' },
        stats.map(({ label, value }) => el('div', { className: 'modal__stat' }, [el('dt', { text: label }), el('dd', { text: value })])),
      ),
      closeButton,
    ]);
    this.resultLayer.replaceChildren(card);
    this.resultShownAt = performance.now();
  }

  closeResult(force = false) {
    if (this.status !== 'result') return;
    if (!force && performance.now() - this.resultShownAt < RESULT_ARM_MS) return;
    this.resultLayer.replaceChildren();
    this.status = 'walk';
    this.setMode('walk');
  }

  // ---------- Premios ----------

  welcome() {
    const data = getGameData('park');
    if (data.welcomed) return;
    updateGameData('park', { welcomed: true, coins: data.coins + WELCOME_COINS });
    this.refreshHud();
    this.notify(`🎁 ¡Regalo de bienvenida! +${WELCOME_COINS} 🪙`);
  }

  /** Suma progreso a las misiones del día y paga las que se completan. */
  progress(event, amount = 1) {
    const data = getGameData('park');
    const { missions, changed, completed, allDone } = recordMission(data, event, amount);
    if (!changed) return;
    const reward = completed.length * MISSION_COINS + (allDone ? ALL_MISSIONS_BONUS : 0);
    updateGameData('park', { missions, coins: data.coins + reward, missionsDone: data.missionsDone + completed.length });
    completed.forEach((mission) => {
      this.notify(`✅ ${mission.icon} ${mission.text} · +${MISSION_COINS} 🪙`);
      trackEvent('parque-mision', 'Parque · misión cumplida');
    });
    if (allDone) this.notify(`🏆 ¡Todas las misiones de hoy! +${ALL_MISSIONS_BONUS} 🪙`);
    if (completed.length) {
      sounds.achievement();
      this.refreshHud();
      this.checkStickers();
    }
    this.refreshMissions();
  }

  refreshMissions() {
    const missions = describeMissions(todaysMissions(getGameData('park')));
    const done = missions.filter((mission) => mission.done).length;
    const collapsed = this.missionList.classList.contains('is-collapsed');
    this.missionList.setAttribute('aria-expanded', String(!collapsed));
    this.missionList.replaceChildren(
      el('li', { className: 'park-missions__title', text: `📋 Misiones ${done}/${missions.length} ${collapsed ? '▸' : '▾'}` }),
      ...missions.map((mission) =>
        el('li', { className: mission.done ? 'is-done' : '' }, [
          el('span', { text: `${mission.done ? '✅' : mission.icon} ${mission.text}` }),
          el('small', { text: mission.done ? '' : `${mission.progress}/${mission.goal}` }),
        ]),
      ),
    );
  }

  refreshHud() {
    const data = getGameData('park');
    this.header.set('coins', data.coins);
    this.header.set('beans', `${(data[this.treasure.key] ?? []).length}/${this.treasure.items.length}`);
    this.header.set('rides', data.totalRides);
  }

  checkStickers() {
    syncStickers().forEach((sticker) => this.notify(`📒 ¡Pegatina nueva! ${sticker.icon} ${sticker.name}`));
  }

  /** Mensajes en fila: se muestran uno detrás de otro. */
  notify(text) {
    this.toasts.push(text);
    if (this.toasts.length === 1) this.showNextToast();
  }

  showNextToast() {
    if (!this.toasts.length) return;
    this.showBanner(this.toasts[0], TOAST_MS);
    this.timers.push(
      setTimeout(() => {
        this.toasts.shift();
        this.showNextToast();
      }, TOAST_MS + 150),
    );
  }

  // ---------- Amigas y saludos ----------

  startFriends() {
    if (!this.withFriends) return;
    if (!this.friends) {
      this.notify('😢 Se perdió la sala de amigas. Sigues jugando sola.');
      return;
    }
    const data = getGameData('park');
    updateGameData('park', { friendVisits: data.friendVisits + 1 });
    trackEvent('parque-amigas', 'Parque · con amigas');
    this.notify('👭 ¡Tus amigas están en el parque! Salúdalas con 👋');
    this.checkStickers();
  }

  /** Burbuja sobre la cabeza de la jugadora. */
  playerSay(text) {
    this.bubble.setText(text);
    this.bubble.sprite.visible = true;
    this.bubbleTimer = BUBBLE_SECONDS;
    // En primera persona no se ve la burbuja: se muestra como letrero.
    if (this.cameraMode.id === 'first') this.showBanner(text, 1200);
  }

  emote(kind) {
    if (!kind || this.emoteCooldown > 0 || !['walk', 'queue'].includes(this.status)) return;
    this.emoteCooldown = EMOTE_COOLDOWN;
    this.emoteBar.classList.remove('is-open');
    this.playerSay(SAYINGS[kind].text);
    if (kind === 'dance') this.danceTimer = DANCE_SECONDS;
    sounds.click();
    this.crowd.reactTo(this.player, kind);
    this.friends?.say(kind);
  }

  updateFriends(delta) {
    this.emoteCooldown -= delta;
    if (!this.friends) return;
    const rideId = this.rideRun?.ride.id ?? this.queueRide?.id ?? '';
    const mode = this.status === 'paused' ? this.pausedFrom : this.status;
    this.friends.update(delta, {
      x: this.player.x,
      y: this.player.y,
      z: this.player.z,
      heading: this.player.heading,
      speed: this.player.speed,
      airborne: !this.player.onGround,
      mode,
      rideId,
    });
    this.friendsPanelTimer -= delta;
    if (this.friendsPanelTimer <= 0) {
      this.friendsPanelTimer = FRIENDS_PANEL_EVERY;
      this.refreshFriends();
    }
  }

  /** Panel con lo que está haciendo cada amiga. */
  refreshFriends() {
    const friends = this.friends?.list() ?? [];
    const rows = friends.map((friend) => {
      const { target } = friend;
      const ride = getRide(target?.rideId);
      let doing = '🔌 Conectando…';
      if (friend.flashTimer > 0) doing = friend.flash;
      else if (target?.mode === 'ride' && ride && this.rideRun?.mateIds.has(friend.id)) doing = `${ride.emoji} ¡Contigo en ${ride.name}!`;
      else if (target?.mode === 'ride' && ride) doing = `${ride.emoji} En ${ride.name}`;
      else if (target?.mode === 'queue' && ride) doing = `⏳ Fila de ${ride.name}`;
      else if (target) doing = target.speed > 0.5 ? '🚶 Paseando' : '🙂 Por aquí';
      return `${friend.emoji} ${friend.name}|${doing}`;
    });
    const key = rows.join('·');
    if (key === this.friendsKey) return;
    this.friendsKey = key;
    this.friendsList.hidden = !rows.length;
    this.friendsList.replaceChildren(
      el('li', { className: 'park-friends__title', text: '👭 Amigas' }),
      ...rows.map((row) => {
        const [name, doing] = row.split('|');
        return el('li', {}, [el('strong', { text: name }), el('small', { text: doing })]);
      }),
    );
  }

  handleFriendEvent(event) {
    if (event.type === 'closed') {
      this.notify('👋 La sala se cerró. Sigues jugando sola.');
      this.refreshFriends();
      return;
    }
    const { friend } = event;
    const who = `${friend.emoji} ${friend.name}`;
    if (event.type === 'board') {
      this.handleBoard(event);
      return;
    }
    if (event.type === 'rideState') {
      if (this.rideRun?.ride.id === event.rideId && this.rideRun.mateIds.has(friend.id)) this.rideRun.session.onMateState?.(friend.id, event);
      return;
    }
    if (this.rideRun?.mateIds.has(friend.id) && event.rideId === this.rideRun.ride.id) this.rideRun.session.onMateSay?.(friend.id, event.kind);
    if (event.type === 'left') {
      this.notify(`👋 ${who} se fue del parque`);
      this.refreshFriends();
      return;
    }
    const ride = getRide(event.rideId);
    if (event.kind === 'ride' && ride) this.notify(`${ride.emoji} ${who} montó en ${ride.name}`);
    else if (event.kind === 'snitch') this.notify(`👮 ${who} le avisó al vigilante`);
    else if (event.kind === 'bean') this.notify(`${this.treasure.icon} ${who} encontró un tesoro dorado`);
    else if (event.kind === 'follow') this.notify(`🏃 ${who} dice: ¡Sígueme!`);
    if (SAYINGS[event.kind]?.emote) sounds.click();
    this.refreshFriends();
  }

  /** Una amiga subió a una atracción y me llevó con ella (estaba en su misma fila). */
  handleBoard({ friend, rideId, seed, ids }) {
    const myId = this.friends.myId;
    if (!ids.includes(myId)) return;
    const ride = getRide(rideId);
    const mates = [friend, ...this.friends.list().filter((other) => other.id !== friend.id && ids.includes(other.id))];
    const group = { mates, seed, leaderId: friend.id };
    if (this.status === 'queue' && this.queueRide?.id === rideId) {
      this.crowd.leavePlayer(rideId);
      this.notify(`👭 ${friend.emoji} ${friend.name} te guardó puesto`);
      this.startRide(ride, 'queue', group);
      return;
    }
    // Las dos subieron casi a la vez: manda la de id menor, para que todas vean lo mismo.
    const run = this.rideRun;
    if (this.status === 'ride' && run?.ride.id === rideId && performance.now() - run.startedAt < BOARD_MERGE_MS && friend.id < (run.leaderId ?? myId)) {
      run.session.dispose();
      this.rideRun = null;
      // Ya contó como fila al subir la primera vez.
      this.startRide(ride, run.via === 'queue' ? 'merged' : run.via, group);
    }
  }

  // ---------- Pausa y salida ----------

  pause({ exitRide = false } = {}) {
    if (this.status === 'paused' || !this.loop) return;
    this.pausedFrom = this.status;
    this.status = 'paused';
    this.loop.stop();
    this.music.stop();
    Object.keys(this.keys).forEach((key) => (this.keys[key] = false));
    this.rideInput.action = false;
    this.joystick.reset();
    this.emoteBar.classList.remove('is-open');
    if (exitRide) {
      showModal({
        emoji: '🚪',
        title: '¿Bajarte de la atracción?',
        message: 'Si te bajas ahora, este viaje no da monedas.',
        escapeIndex: 0,
        actions: [
          { label: 'Seguir montando ▶', variant: 'primary', onClick: () => this.resume() },
          { label: '🚪 Bajarme', onClick: () => this.resumeAndExitRide() },
        ],
      });
      return;
    }
    const missions = describeMissions(todaysMissions(getGameData('park')));
    showModal({
      emoji: '⏸️',
      title: 'Pausa',
      message: this.pausedFrom === 'ride' ? 'La atracción te espera.' : 'Tus misiones de hoy:',
      stats: missions.map((mission) => ({
        label: `${mission.icon} ${mission.text}`,
        value: mission.done ? '✅' : `${mission.progress}/${mission.goal}`,
      })),
      escapeIndex: 0,
      actions: [
        { label: 'Continuar ▶', variant: 'primary', onClick: () => this.resume() },
        this.pausedFrom === 'ride' ? { label: '🚪 Bajarme de la atracción', onClick: () => this.resumeAndExitRide() } : null,
        { label: 'Salir del parque', onClick: () => navigate('/parque') },
      ].filter(Boolean),
    });
  }

  resumeAndExitRide() {
    this.resume();
    this.exitRide();
  }

  resume() {
    if (this.status !== 'paused') return;
    this.status = this.pausedFrom;
    this.loop.start();
    this.music.start();
  }

  destroy() {
    this.timers.forEach((timer) => clearTimeout(timer));
    closeModal();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (!this.loop) {
      this.kit.dispose();
      this.renderer?.dispose();
      return;
    }
    this.loop.destroy();
    this.music.stop();
    this.unbinders.forEach((unbind) => unbind());
    this.resizeObserver.disconnect();
    this.rideRun?.session.dispose();
    this.friends?.destroy();
    this.scene.traverse((object) => object.isInstancedMesh && object.dispose());
    this.kit.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export function mountParkGame(root, params) {
  const game = new ParkGame(root, params);
  return () => game.destroy();
}
