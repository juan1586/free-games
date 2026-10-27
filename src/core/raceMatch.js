/**
 * Lógica común de una carrera (Dino y Salto Geométrico) sobre la conexión de core/race.js:
 * jugadores, cuenta atrás sincronizada, posiciones de los rivales, llegadas, resultado y revancha.
 * No toca el DOM: cada juego escucha los eventos y decide cómo mostrarlos.
 *
 * Protocolo de juego: `ready` → `go` {seed} (cuenta atrás) → `pos` → `finish` {ms} → `result` {winners}
 * y `rematch`. La anfitriona da la salida cuando todos están listos y decide quién ganó,
 * para que todos vean lo mismo. Cada tiempo se mide desde la salida local de cada uno,
 * así la demora de internet no cuenta.
 */
import { AVATARS, getActivePlayer, sanitizeName } from './player.js';
import { HOST_ID, MAX_PLAYERS, getSession, isPlayerId, onDisconnect, onLeave, onMessage, send } from './race.js';
import { MAX_SEED, randomSeed } from './random.js';

// Tras la primera llegada se espera un poco por si alguien llegó antes en su propio reloj.
const RESULT_GRACE_MS = 1200;
const MAX_RACE_MS = 60 * 60 * 1000;
// La revancha reinicia a todos: se ofrece cuando llegaron todos, o pasado un rato para no esperar eternamente.
const REMATCH_WAIT_MS = 30000;

// ---------- Mensajes de la sala (también los usa la sala de espera) ----------

/** Presentación del jugador activo; `look` es lo propio de cada juego (figura, dino…). */
export function createHello(look) {
  const player = getActivePlayer();
  return { type: 'hello', name: player?.name ?? 'Rival', avatar: player?.avatar ?? AVATARS[0], look };
}

/** Limpia los datos de un jugador que llegan de otra tablet. */
export function parsePlayer(raw, parseLook) {
  if (!raw || typeof raw !== 'object') return null;
  const look = raw.look && typeof raw.look === 'object' ? raw.look : {};
  return {
    name: sanitizeName(raw.name) || 'Rival',
    avatar: AVATARS.includes(raw.avatar) ? raw.avatar : AVATARS[0],
    look: parseLook(look),
  };
}

export function parseRoster(raw, parseLook) {
  if (!Array.isArray(raw?.players) || raw.players.length > MAX_PLAYERS) return null;
  const players = [];
  for (const item of raw.players) {
    if (!isPlayerId(item?.id) || players.some((player) => player.id === item.id)) return null;
    players.push({ id: item.id, ...parsePlayer(item, parseLook) });
  }
  return players;
}

const parseSeed = (value) => (Number.isInteger(value) && value >= 0 && value <= MAX_SEED ? value : 1);

// ---------- Partida ----------

export class RaceMatch {
  /** parsePos(raw): valida la posición que manda cada juego; devuelve null si no sirve. */
  constructor({ parsePos }) {
    const session = getSession();
    this.parsePos = parsePos;
    this.myId = session.myId;
    this.isHost = session.role === 'host';
    this.players = session.meta.players;
    this.me = this.players.find((player) => player.id === this.myId);
    this.rivals = new Map(
      this.players.filter((player) => player.id !== this.myId).map((player) => [player.id, { ...player, pos: null, receivedAt: 0, gone: false }]),
    );
    this.handlers = new Map();
    this.state = 'waiting';
    this.finishes = new Map();
    this.result = null;
    this.readyIds = new Set();
    this.unsubscribers = [
      onMessage((message) => this.handleMessage(message)),
      onLeave((id) => this.handleLeave(id)),
      onDisconnect(() => this.handleClosed()),
    ];
  }

  /**
   * Eventos: countdown(seed), finish(id), result(winners), rematch(), left(rival) y closed()
   * (para invitados: la sala se cerró).
   */
  on(event, handler) {
    this.handlers.set(event, handler);
    return this;
  }

  emit(event, payload) {
    this.handlers.get(event)?.(payload);
  }

  get activeRivals() {
    return [...this.rivals.values()].filter((rival) => !rival.gone);
  }

  /** Vuelve a la salida y avisa de que este jugador está listo. */
  reset() {
    clearTimeout(this.resultTimer);
    this.resultTimer = null;
    this.state = 'waiting';
    this.finishes = new Map();
    this.result = null;
    this.readyIds = new Set();
    this.rivals.forEach((rival) => Object.assign(rival, { pos: null, receivedAt: 0 }));
    send({ type: 'ready' });
  }

  requestRematch() {
    send({ type: 'rematch' });
  }

  sendPos(pos) {
    send({ type: 'pos', ...pos });
  }

  finish(ms) {
    if (this.finishes.has(this.myId)) return;
    this.finishes.set(this.myId, ms);
    send({ type: 'finish', ms });
    if (this.isHost) this.considerResult();
  }

  hasFinished(id = this.myId) {
    return this.finishes.has(id);
  }

  didWin(id = this.myId) {
    return Boolean(this.result?.includes(id));
  }

  /** Milisegundos que faltan para poder ofrecer la revancha (0 = ya se puede). */
  rematchReadyIn() {
    if (!this.result) return Infinity;
    const everyoneArrived = this.activeRivals.every((rival) => this.finishes.has(rival.id)) && this.finishes.has(this.myId);
    if (everyoneArrived) return 0;
    return Math.max(0, this.resultAt + REMATCH_WAIT_MS - performance.now());
  }

  playerName(id) {
    return this.players.find((player) => player.id === id)?.name ?? 'Rival';
  }

  /** Todos ordenados: primero los que llegaron (por tiempo), luego los que siguen y al final los que se fueron. */
  standings() {
    const rank = (entry) => {
      if (entry.ms !== undefined) return 0;
      return entry.gone ? 2 : 1;
    };
    return this.players
      .map((player) => ({
        ...player,
        isMe: player.id === this.myId,
        ms: this.finishes.get(player.id),
        gone: Boolean(this.rivals.get(player.id)?.gone),
      }))
      .sort((a, b) => rank(a) - rank(b) || (a.ms ?? 0) - (b.ms ?? 0));
  }

  /** Puesto actual (1 = primero). progressOf(rival) da el avance de cada rival entre 0 y 1. */
  placeOf(myProgress, progressOf) {
    const myMs = this.finishes.get(this.myId);
    let place = 1;
    this.rivals.forEach((rival) => {
      const ms = this.finishes.get(rival.id);
      if (rival.gone && ms === undefined) return;
      const isAhead = ms !== undefined ? myMs === undefined || ms < myMs : myMs === undefined && progressOf(rival) > myProgress;
      if (isAhead) place += 1;
    });
    return place;
  }

  handleMessage(message) {
    const { from } = message;
    if (!isPlayerId(from) || from === this.myId) return;
    switch (message.type) {
      case 'ready':
        if (this.isHost) {
          this.readyIds.add(from);
          this.tryGo();
        } else if (from === HOST_ID && this.state === 'waiting') {
          // La anfitriona pregunta: se le contesta por si no oyó el primer "listo".
          send({ type: 'ready' });
        }
        break;
      case 'go':
        if (!this.isHost && from === HOST_ID && this.state === 'waiting') this.startCountdown(parseSeed(message.seed));
        break;
      case 'pos': {
        const rival = this.rivals.get(from);
        const pos = rival && this.parsePos(message);
        if (pos) Object.assign(rival, { pos, receivedAt: performance.now() });
        break;
      }
      case 'finish': {
        const isValid = typeof message.ms === 'number' && message.ms >= 0 && message.ms <= MAX_RACE_MS;
        if (!isValid || !this.rivals.has(from) || this.finishes.has(from)) return;
        this.finishes.set(from, message.ms);
        this.emit('finish', from);
        if (this.isHost) this.considerResult();
        break;
      }
      case 'result': {
        if (this.isHost || from !== HOST_ID || !Array.isArray(message.winners)) return;
        const winners = message.winners.filter((id) => this.players.some((player) => player.id === id)).slice(0, MAX_PLAYERS);
        if (winners.length) this.applyResult(winners);
        break;
      }
      case 'rematch':
        this.emit('rematch');
        break;
      default:
        break;
    }
  }

  tryGo() {
    if (!this.isHost || this.state !== 'waiting') return;
    const rivals = this.activeRivals;
    if (!rivals.length || !rivals.every((rival) => this.readyIds.has(rival.id))) return;
    const seed = randomSeed();
    send({ type: 'go', seed });
    this.startCountdown(seed);
  }

  startCountdown(seed) {
    this.state = 'countdown';
    this.emit('countdown', seed);
  }

  considerResult() {
    if (this.result) return;
    const everyoneArrived = this.activeRivals.every((rival) => this.finishes.has(rival.id)) && this.finishes.has(this.myId);
    if (everyoneArrived) this.decideResult();
    else this.resultTimer ??= setTimeout(() => this.decideResult(), RESULT_GRACE_MS);
  }

  decideResult() {
    clearTimeout(this.resultTimer);
    this.resultTimer = null;
    if (this.result || !this.finishes.size || !this.activeRivals.length) return;
    const best = Math.min(...this.finishes.values());
    const winners = [...this.finishes].filter(([, ms]) => ms === best).map(([id]) => id);
    send({ type: 'result', winners });
    this.applyResult(winners);
  }

  applyResult(winners) {
    if (this.result) return;
    this.result = winners;
    this.resultAt = performance.now();
    this.emit('result', winners);
  }

  handleLeave(id) {
    const rival = this.rivals.get(id);
    if (!rival || rival.gone) return;
    rival.gone = true;
    this.emit('left', rival);
    if (!this.isHost) return;
    // Quien se fue ya no cuenta para dar la salida ni para esperar llegadas.
    this.tryGo();
    if (this.finishes.size && !this.result) this.considerResult();
  }

  handleClosed() {
    this.rivals.forEach((rival) => (rival.gone = true));
    this.emit('closed');
  }

  destroy() {
    clearTimeout(this.resultTimer);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
}
