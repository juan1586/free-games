import { createGameLoop } from '../../core/gameLoop.js';
import { roundRect, setupCanvas } from '../../core/canvas.js';
import { bindHoldButton, bindKeyboard, bindTouchGestures } from '../../core/input.js';
import { sounds } from '../../core/audio.js';
import { getGameData, updateGameData } from '../../core/player.js';
import { createBanner, createGameHeader } from '../../ui/hud.js';
import { closeModal, showModal } from '../../ui/modal.js';
import { el, navigate } from '../../ui/dom.js';
import { LINES_PER_LEVEL, TETRIS_WORLDS, calculateStars, getFallInterval } from './levels.js';

const COLS = 10;
const VISIBLE_ROWS = 20;
const HIDDEN_ROWS = 2;
const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;
const CELL = 30;
const BOARD_X = 10;
const BOARD_Y = 10;
const PANEL_X = BOARD_X + COLS * CELL + 16;
const VIEW_WIDTH = PANEL_X + 140;
const VIEW_HEIGHT = BOARD_Y * 2 + VISIBLE_ROWS * CELL;
const PREVIEW_COUNT = 3;

const LOCK_DELAY_SECONDS = 0.5;
const MAX_LOCK_RESETS = 15;
const CLEAR_ANIMATION_SECONDS = 0.3;
const DAS_SECONDS = 0.16;
const ARR_SECONDS = 0.05;
const SOFT_DROP_INTERVAL = 0.035;
const LINE_SCORES = [0, 100, 300, 500, 800];
const LINE_NAMES = ['', '¡Bien!', '¡Doble!', '¡Triple!', '¡TETRIS!'];

// Orden: I, J, L, O, S, T, Z (coincide con los colores de cada mundo).
const SHAPES = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  [[1, 1], [1, 1]],
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
];
const PIECE_I = 0;
const PIECE_O = 3;

// Tablas de wall-kick SRS (x a la derecha, y hacia arriba como en la especificación).
const KICKS_JLSTZ = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

function rotateMatrix(matrix, direction) {
  const size = matrix.length;
  return matrix.map((row, y) =>
    row.map((_, x) => (direction > 0 ? matrix[size - 1 - x][y] : matrix[x][size - 1 - y])),
  );
}

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function shuffledBag() {
  const bag = [0, 1, 2, 3, 4, 5, 6];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swap]] = [bag[swap], bag[index]];
  }
  return bag;
}

export class TetrisGame {
  constructor(root, { worldIndex }) {
    const data = getGameData('tetris');
    this.worldIndex = Math.max(0, Math.min(worldIndex, data.unlockedWorld, TETRIS_WORLDS.length - 1));
    this.world = TETRIS_WORLDS[this.worldIndex];
    this.best = data.bestScore;

    this.buildDom(root);
    this.ctx = setupCanvas(this.canvas, VIEW_WIDTH, VIEW_HEIGHT);
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
      backPath: '/tetris',
      onPause: () => this.pause(),
      items: [
        { key: 'score', label: 'Puntos', icon: '⭐', value: 0 },
        { key: 'lines', label: 'Líneas', icon: '🧱', value: `0/${this.world.goalLines}` },
        { key: 'level', label: 'Nivel', icon: '🚀', value: this.world.startLevel },
        { key: 'best', label: 'Récord', icon: '🏆', value: this.best },
      ],
    });

    this.canvas = el('canvas', {
      className: 'stage__canvas stage__canvas--tetris',
      attrs: { width: VIEW_WIDTH, height: VIEW_HEIGHT, 'aria-label': 'Tablero de bloques' },
    });
    const stage = el('div', { className: 'stage stage--tetris' }, [this.canvas]);
    this.showBanner = createBanner(stage);

    const makeButton = (label, className, ariaLabel) =>
      el('button', { className: `touch-btn ${className}`, text: label, attrs: { type: 'button', 'aria-label': ariaLabel } });
    this.buttons = {
      left: makeButton('◀', 'touch-btn--move', 'Izquierda'),
      right: makeButton('▶', 'touch-btn--move', 'Derecha'),
      rotate: makeButton('⟳', 'touch-btn--rotate', 'Girar'),
      down: makeButton('▼', 'touch-btn--move', 'Bajar'),
      drop: makeButton('⤓', 'touch-btn--drop', 'Soltar'),
      hold: makeButton('💾', 'touch-btn--hold', 'Guardar pieza'),
    };
    const { left, right, rotate, down, drop, hold } = this.buttons;
    const touchControls = el('div', { className: 'touch-controls touch-controls--tetris' }, [
      el('div', { className: 'touch-controls__group' }, [hold, left, down, right]),
      el('div', { className: 'touch-controls__group' }, [drop, rotate]),
    ]);

    const page = el('main', { className: `page game-page game-page--tetris tetris-world--${this.world.id}` }, [
      this.header.element,
      el('div', { className: 'tetris-layout' }, [stage, el('p', { className: 'tetris-help', text: '← → mover · ↑ girar · ↓ bajar · Espacio soltar · C guardar · P pausa' })]),
      touchControls,
    ]);
    page.style.background = this.world.theme.background;
    page.style.setProperty('--world-text', this.world.theme.text);
    root.append(page);
  }

  bindControls() {
    const onPress = (action) => {
      if (this.status !== 'running') {
        if (action === 'pause') this.pause();
        return;
      }
      switch (action) {
        case 'left':
        case 'right': {
          const direction = action === 'left' ? -1 : 1;
          this.keys.horizontal = direction;
          this.keys.dasTimer = 0;
          this.keys.arrTimer = 0;
          this.move(direction);
          break;
        }
        case 'down':
          this.keys.softDrop = true;
          this.softDrop();
          break;
        case 'rotate':
          this.rotate(1);
          break;
        case 'rotateBack':
          this.rotate(-1);
          break;
        case 'drop':
          this.hardDrop();
          break;
        case 'hold':
          this.holdPiece();
          break;
        case 'pause':
          this.pause();
          break;
        default:
      }
    };
    const onRelease = (action) => {
      if ((action === 'left' && this.keys.horizontal === -1) || (action === 'right' && this.keys.horizontal === 1)) {
        this.keys.horizontal = 0;
      }
      if (action === 'down') this.keys.softDrop = false;
    };

    const whenRunning = (callback) => () => this.status === 'running' && callback();
    const { left, right, rotate, down, drop, hold } = this.buttons;

    return [
      bindKeyboard(
        {
          left: ['ArrowLeft', 'KeyA'],
          right: ['ArrowRight', 'KeyD'],
          down: ['ArrowDown', 'KeyS'],
          rotate: ['ArrowUp', 'KeyX', 'KeyW'],
          rotateBack: ['KeyZ'],
          drop: ['Space'],
          hold: ['KeyC', 'ShiftLeft', 'ShiftRight'],
          pause: ['KeyP', 'Escape'],
        },
        { onPress: (action, repeat) => !repeat && onPress(action), onRelease },
      ),
      bindTouchGestures(this.canvas, {
        onTap: whenRunning(() => this.rotate(1)),
        onSwipe: (direction) => {
          if (this.status !== 'running') return;
          if (direction === 'left') this.move(-1);
          if (direction === 'right') this.move(1);
          if (direction === 'down') this.hardDrop();
          if (direction === 'up') this.holdPiece();
        },
      }),
      bindHoldButton(left, { onPress: whenRunning(() => this.move(-1)), repeatMs: 80 }),
      bindHoldButton(right, { onPress: whenRunning(() => this.move(1)), repeatMs: 80 }),
      bindHoldButton(down, { onPress: whenRunning(() => this.softDrop()), repeatMs: 45 }),
      bindHoldButton(rotate, { onPress: whenRunning(() => this.rotate(1)) }),
      bindHoldButton(drop, { onPress: whenRunning(() => this.hardDrop()) }),
      bindHoldButton(hold, { onPress: whenRunning(() => this.holdPiece()) }),
    ];
  }

  reset() {
    this.board = createEmptyBoard();
    this.queue = [...shuffledBag(), ...shuffledBag()];
    this.holdType = null;
    this.holdUsed = false;
    this.score = 0;
    this.lines = 0;
    this.level = this.world.startLevel;
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.clearingRows = [];
    this.clearTimer = 0;
    this.goalReached = false;
    this.progressSaved = false;
    this.time = 0;
    this.keys = { horizontal: 0, dasTimer: 0, arrTimer: 0, softDrop: false };
    this.status = 'running';
    this.spawnPiece();
    this.updateHud();
    this.showBanner(`${this.world.emoji} ¡Haz ${this.world.goalLines} líneas!`, 1800);
  }

  // ---------- Lógica de piezas ----------

  takeNextType() {
    const type = this.queue.shift();
    if (this.queue.length < 7) this.queue.push(...shuffledBag());
    return type;
  }

  spawnPiece(type = this.takeNextType()) {
    const matrix = SHAPES[type].map((row) => [...row]);
    this.piece = { type, matrix, rotation: 0, x: Math.floor((COLS - matrix.length) / 2), y: HIDDEN_ROWS - 1 };
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    if (this.collides(matrix, this.piece.x, this.piece.y)) this.gameOver();
  }

  collides(matrix, offsetX, offsetY) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const boardX = offsetX + x;
        const boardY = offsetY + y;
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
        if (boardY >= 0 && this.board[boardY][boardX]) return true;
      }
    }
    return false;
  }

  isGrounded() {
    return this.collides(this.piece.matrix, this.piece.x, this.piece.y + 1);
  }

  /** Mover o girar en el suelo da un poco más de tiempo antes de fijar la pieza. */
  refreshLockDelay() {
    if (this.lockResets < MAX_LOCK_RESETS && this.isGrounded()) {
      this.lockTimer = 0;
      this.lockResets += 1;
    }
  }

  move(direction) {
    if (!this.piece || this.collides(this.piece.matrix, this.piece.x + direction, this.piece.y)) return false;
    this.piece.x += direction;
    sounds.move();
    this.refreshLockDelay();
    return true;
  }

  rotate(direction) {
    const piece = this.piece;
    if (!piece || piece.type === PIECE_O) return;
    const rotated = rotateMatrix(piece.matrix, direction);
    const nextRotation = (piece.rotation + direction + 4) % 4;
    const kicks = (piece.type === PIECE_I ? KICKS_I : KICKS_JLSTZ)[`${piece.rotation}>${nextRotation}`];
    const kick = kicks.find(([kickX, kickY]) => !this.collides(rotated, piece.x + kickX, piece.y - kickY));
    if (!kick) return;
    piece.matrix = rotated;
    piece.rotation = nextRotation;
    piece.x += kick[0];
    piece.y -= kick[1];
    sounds.rotate();
    this.refreshLockDelay();
  }

  softDrop() {
    if (!this.piece) return;
    if (this.isGrounded()) {
      this.lockTimer = LOCK_DELAY_SECONDS;
      return;
    }
    this.piece.y += 1;
    this.score += 1;
    this.fallTimer = 0;
    this.updateHud();
  }

  getGhostY() {
    let ghostY = this.piece.y;
    while (!this.collides(this.piece.matrix, this.piece.x, ghostY + 1)) ghostY += 1;
    return ghostY;
  }

  hardDrop() {
    if (!this.piece) return;
    const ghostY = this.getGhostY();
    this.score += (ghostY - this.piece.y) * 2;
    this.piece.y = ghostY;
    sounds.drop();
    this.lockPiece();
  }

  holdPiece() {
    if (!this.piece || this.holdUsed) return;
    const currentType = this.piece.type;
    const swapType = this.holdType;
    this.holdType = currentType;
    this.holdUsed = true;
    sounds.rotate();
    this.spawnPiece(swapType ?? this.takeNextType());
  }

  lockPiece() {
    const { matrix, x: offsetX, y: offsetY, type } = this.piece;
    let isAboveVisibleArea = true;
    matrix.forEach((row, y) =>
      row.forEach((filled, x) => {
        if (!filled) return;
        const boardY = offsetY + y;
        if (boardY >= HIDDEN_ROWS) isAboveVisibleArea = false;
        if (boardY >= 0) this.board[boardY][offsetX + x] = type + 1;
      }),
    );
    this.piece = null;
    this.holdUsed = false;

    if (isAboveVisibleArea) {
      this.gameOver();
      return;
    }

    this.clearingRows = this.board.reduce((rows, row, index) => (row.every(Boolean) ? [...rows, index] : rows), []);
    if (this.clearingRows.length) {
      this.clearTimer = CLEAR_ANIMATION_SECONDS;
      sounds.lineClear();
    } else {
      this.spawnPiece();
    }
    this.updateHud();
  }

  finishLineClear() {
    const cleared = this.clearingRows.length;
    this.board = this.board.filter((_, index) => !this.clearingRows.includes(index));
    while (this.board.length < ROWS) this.board.unshift(Array(COLS).fill(0));
    this.clearingRows = [];

    this.score += LINE_SCORES[cleared] * this.level;
    this.lines += cleared;
    const newLevel = this.world.startLevel + Math.floor(this.lines / LINES_PER_LEVEL);
    if (cleared === 4) this.showBanner(LINE_NAMES[4], 1200);

    if (newLevel > this.level) {
      this.level = newLevel;
      sounds.levelUp();
      this.showBanner(`🚀 ¡Nivel ${this.level}!`);
    } else if (cleared > 1 && cleared < 4) {
      this.showBanner(LINE_NAMES[cleared], 900);
    }
    this.updateHud();

    if (!this.goalReached && this.lines >= this.world.goalLines) {
      this.winWorld();
      return;
    }
    this.spawnPiece();
  }

  // ---------- Bucle ----------

  update(delta) {
    this.time += delta;
    if (this.status !== 'running') return;

    if (this.clearingRows.length) {
      this.clearTimer -= delta;
      if (this.clearTimer <= 0) this.finishLineClear();
      return;
    }
    if (!this.piece) return;

    this.updateHorizontalRepeat(delta);

    const interval = this.keys.softDrop ? Math.min(SOFT_DROP_INTERVAL, getFallInterval(this.level)) : getFallInterval(this.level);
    if (this.isGrounded()) {
      this.lockTimer += delta;
      if (this.lockTimer >= LOCK_DELAY_SECONDS) this.lockPiece();
      return;
    }
    this.fallTimer += delta;
    while (this.fallTimer >= interval && this.piece && !this.isGrounded()) {
      this.fallTimer -= interval;
      this.piece.y += 1;
      if (this.keys.softDrop) this.score += 1;
    }
    if (this.keys.softDrop) this.updateHud();
  }

  updateHorizontalRepeat(delta) {
    if (!this.keys.horizontal) return;
    this.keys.dasTimer += delta;
    if (this.keys.dasTimer < DAS_SECONDS) return;
    this.keys.arrTimer += delta;
    while (this.keys.arrTimer >= ARR_SECONDS) {
      this.keys.arrTimer -= ARR_SECONDS;
      if (!this.move(this.keys.horizontal)) break;
    }
  }

  updateHud() {
    this.header.set('score', this.score);
    this.header.set('lines', this.goalReached ? this.lines : `${this.lines}/${this.world.goalLines}`);
    this.header.set('level', this.level);
    this.header.set('best', Math.max(this.best, this.score));
  }

  // ---------- Estados ----------

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.loop.stop();
    this.keys.horizontal = 0;
    this.keys.softDrop = false;
    showModal({
      emoji: '⏸️',
      title: 'Pausa',
      message: 'Las piezas te esperan quietecitas.',
      escapeIndex: 0,
      actions: [
        { label: 'Continuar ▶', variant: 'primary', onClick: () => this.resume() },
        { label: 'Reiniciar', onClick: () => this.restart() },
        { label: 'Salir', onClick: () => navigate('/tetris') },
      ],
    });
  }

  resume() {
    this.status = 'running';
    this.loop.start();
  }

  restart() {
    this.saveProgress();
    this.reset();
    this.loop.start();
  }

  /** Guarda récord y líneas una vez por partida. Devuelve true si hubo récord nuevo. */
  saveProgress() {
    if (this.progressSaved) return false;
    this.progressSaved = true;
    const data = getGameData('tetris');
    const isNewRecord = this.score > data.bestScore;
    this.best = Math.max(data.bestScore, this.score);
    updateGameData('tetris', { bestScore: this.best, bestLines: Math.max(data.bestLines, this.lines) });
    return isNewRecord;
  }

  winWorld() {
    this.goalReached = true;
    this.status = 'won';
    this.loop.stop();
    this.render();
    sounds.win();

    const stars = calculateStars(this.world, this.score);
    const data = getGameData('tetris');
    const nextIndex = Math.min(this.worldIndex + 1, TETRIS_WORLDS.length - 1);
    updateGameData('tetris', {
      unlockedWorld: Math.max(data.unlockedWorld, nextIndex),
      stars: { ...data.stars, [this.world.id]: Math.max(data.stars[this.world.id] ?? 0, stars) },
      bestScore: Math.max(data.bestScore, this.score),
      bestLines: Math.max(data.bestLines, this.lines),
    });
    this.best = Math.max(this.best, this.score);
    this.updateHud();

    const nextWorld = TETRIS_WORLDS[this.worldIndex + 1];
    showModal({
      emoji: '🎉',
      title: '¡Mundo superado!',
      stars,
      tone: 'success',
      message: stars < 3 ? `Consigue ${this.world.starScores[stars - 1]} puntos para ganar otra estrella.` : '¡Perfecto! Tres estrellas.',
      stats: [
        { label: 'Puntos', value: this.score },
        { label: 'Líneas', value: this.lines },
        { label: 'Nivel', value: this.level },
      ],
      actions: [
        nextWorld
          ? { label: `Ir a ${nextWorld.name} ${nextWorld.emoji}`, variant: 'primary', onClick: () => navigate(`/tetris/jugar?mundo=${this.worldIndex + 1}`) }
          : { label: 'Elegir mundo', variant: 'primary', onClick: () => navigate('/tetris') },
        { label: 'Seguir jugando', onClick: () => this.continueEndless() },
        { label: 'Repetir 🔁', onClick: () => this.restart() },
      ],
    });
  }

  continueEndless() {
    this.status = 'running';
    this.spawnPiece();
    this.loop.start();
  }

  gameOver() {
    this.status = 'over';
    this.piece = null;
    this.loop.stop();
    this.render();
    const isNewRecord = this.saveProgress();
    if (isNewRecord) sounds.levelUp();
    else sounds.gameOver();
    this.updateHud();

    showModal({
      emoji: this.goalReached ? '🏆' : isNewRecord ? '🌟' : '🧱',
      title: isNewRecord ? '¡Nuevo récord!' : '¡Se llenó el tablero!',
      tone: isNewRecord ? 'success' : 'neutral',
      message: this.goalReached
        ? '¡Superaste el mundo y seguiste jugando!'
        : `Te faltaron ${this.world.goalLines - this.lines} líneas. ¡Tú puedes!`,
      stats: [
        { label: 'Puntos', value: this.score },
        { label: 'Líneas', value: this.lines },
        { label: 'Récord', value: this.best },
      ],
      actions: [
        { label: 'Jugar otra vez 🔁', variant: 'primary', onClick: () => this.restart() },
        { label: 'Elegir mundo', onClick: () => navigate('/tetris') },
      ],
    });
  }

  // ---------- Dibujo ----------

  get colors() {
    return this.world.theme.pieces;
  }

  drawBlock(x, y, color, size = CELL, alpha = 1) {
    const ctx = this.ctx;
    const inset = 1.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, size * 0.22);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    roundRect(ctx, x + inset, y + size * 0.55, size - inset * 2, size * 0.45 - inset, size * 0.2);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, x + inset + 2, y + inset + 1, size - inset * 2 - 4, size * 0.7, size * 0.2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    roundRect(ctx, x + size * 0.2, y + size * 0.14, size * 0.36, size * 0.14, size * 0.07);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawMatrix(matrix, type, originX, originY, size, alpha = 1) {
    matrix.forEach((row, y) =>
      row.forEach((filled, x) => {
        if (filled) this.drawBlock(originX + x * size, originY + y * size, this.colors[type], size, alpha);
      }),
    );
  }

  /** Dibuja una pieza centrada en una caja (para "guardada" y "siguientes"). */
  drawPreview(type, boxX, boxY, boxWidth, boxHeight, size, alpha = 1) {
    if (type === null || type === undefined) return;
    const matrix = SHAPES[type];
    const filledRows = matrix.map((row, index) => (row.some(Boolean) ? index : -1)).filter((index) => index >= 0);
    const filledCols = matrix[0].map((_, col) => (matrix.some((row) => row[col]) ? col : -1)).filter((index) => index >= 0);
    const width = filledCols.length * size;
    const height = filledRows.length * size;
    const originX = boxX + (boxWidth - width) / 2 - filledCols[0] * size;
    const originY = boxY + (boxHeight - height) / 2 - filledRows[0] * size;
    this.drawMatrix(matrix, type, originX, originY, size, alpha);
  }

  render() {
    const ctx = this.ctx;
    const { theme } = this.world;
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Tablero
    ctx.fillStyle = theme.board;
    roundRect(ctx, BOARD_X - 6, BOARD_Y - 6, COLS * CELL + 12, VISIBLE_ROWS * CELL + 12, 16);
    ctx.fill();
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + x * CELL, BOARD_Y);
      ctx.lineTo(BOARD_X + x * CELL, BOARD_Y + VISIBLE_ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 1; y < VISIBLE_ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + y * CELL);
      ctx.lineTo(BOARD_X + COLS * CELL, BOARD_Y + y * CELL);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(BOARD_X, BOARD_Y, COLS * CELL, VISIBLE_ROWS * CELL);
    ctx.clip();
    const toScreenY = (row) => BOARD_Y + (row - HIDDEN_ROWS) * CELL;

    this.board.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell) this.drawBlock(BOARD_X + x * CELL, toScreenY(y), this.colors[cell - 1]);
      }),
    );

    if (this.clearingRows.length) {
      const flash = 0.5 + 0.5 * Math.sin(this.time * 40);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + flash * 0.5})`;
      this.clearingRows.forEach((row) => ctx.fillRect(BOARD_X, toScreenY(row), COLS * CELL, CELL));
    }

    if (this.piece) {
      const { matrix, type, x, y } = this.piece;
      this.drawMatrix(matrix, type, BOARD_X + x * CELL, toScreenY(this.getGhostY()), CELL, 0.22);
      this.drawMatrix(matrix, type, BOARD_X + x * CELL, toScreenY(y), CELL);
    }
    ctx.restore();

    this.renderPanel();
  }

  renderPanel() {
    const ctx = this.ctx;
    const { theme } = this.world;
    const panelWidth = VIEW_WIDTH - PANEL_X - 6;
    const previewSize = 20;

    const drawBox = (title, y, height) => {
      ctx.fillStyle = theme.board;
      ctx.globalAlpha = 0.88;
      roundRect(ctx, PANEL_X, y, panelWidth, height, 14);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 15px Fredoka, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, PANEL_X + panelWidth / 2, y + 22);
      ctx.textAlign = 'start';
    };

    drawBox('Guardada', BOARD_Y - 6, 96);
    this.drawPreview(this.holdType, PANEL_X, BOARD_Y + 22, panelWidth, 64, previewSize, this.holdUsed ? 0.4 : 1);

    const nextTop = BOARD_Y + 104;
    drawBox('Siguientes', nextTop, 32 + PREVIEW_COUNT * 64);
    this.queue.slice(0, PREVIEW_COUNT).forEach((type, index) => {
      this.drawPreview(type, PANEL_X, nextTop + 30 + index * 64, panelWidth, 60, index === 0 ? previewSize : previewSize * 0.8);
    });

    // Barra de progreso hacia la meta del mundo
    const barTop = nextTop + 48 + PREVIEW_COUNT * 64;
    const barHeight = VIEW_HEIGHT - barTop - 6;
    drawBox('Meta', barTop, barHeight);
    const progress = Math.min(1, this.lines / this.world.goalLines);
    const trackX = PANEL_X + panelWidth / 2 - 14;
    const trackY = barTop + 34;
    const trackHeight = barHeight - 70;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    roundRect(ctx, trackX, trackY, 28, trackHeight, 14);
    ctx.fill();
    const fillHeight = Math.max(28 * Math.min(1, progress * 10), trackHeight * progress);
    const gradient = ctx.createLinearGradient(0, trackY + trackHeight, 0, trackY);
    this.colors.forEach((color, index) => gradient.addColorStop(index / (this.colors.length - 1), color));
    ctx.fillStyle = gradient;
    if (progress > 0) {
      roundRect(ctx, trackX, trackY + trackHeight - fillHeight, 28, fillHeight, 14);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.goalReached ? '¡Meta! 🎉' : `${this.lines}/${this.world.goalLines}`, PANEL_X + panelWidth / 2, barTop + barHeight - 14);
    ctx.textAlign = 'start';
  }

  destroy() {
    if (this.status === 'running' || this.status === 'paused') this.saveProgress();
    closeModal();
    this.loop.destroy();
    this.unbinders.forEach((unbind) => unbind());
  }
}

export function mountTetrisGame(root, params) {
  const game = new TetrisGame(root, params);
  return () => game.destroy();
}
