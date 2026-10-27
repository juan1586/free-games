/**
 * Conexión entre navegadores para las carreras (WebRTC con PeerJS), hasta 4 jugadores.
 * Quien crea la sala hace de centro: cada invitado se conecta solo con ella, y ella reenvía
 * a los demás lo que recibe (sellado con `from`, el id de quien lo envió).
 * El servidor público de PeerJS solo sirve para encontrarse con el código de sala; los mensajes
 * viajan directos. La librería se descarga solo al entrar en modo carrera.
 * La sesión vive en el módulo para sobrevivir al cambio de ruta (sala de espera → juego).
 */

// Sin letras ni números que se confundan (0/O, 1/I/L, 5/S, 8/B…).
const CODE_CHARS = 'ACDEFHJKMNPRTWXY34679';
export const CODE_LENGTH = 4;
export const MAX_PLAYERS = 4;
export const HOST_ID = 'h';
const PLAYER_ID_PATTERN = /^(h|g\d{1,3})$/;
const MAX_CREATE_TRIES = 4;
// Abrir la conexión con el servidor de PeerJS (a veces tarda o no responde).
const OPEN_TIMEOUT_MS = 10000;
// Cada intento de entrar en una sala: conexión directa + bienvenida de la anfitriona.
const ATTEMPT_TIMEOUT_MS = 10000;
const MAX_JOIN_TRIES = 3;
const RETRY_PAUSE_MS = 800;
// Si la anfitriona pierde el servidor (app en segundo plano, wifi que parpadea), se vuelve a registrar.
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 10000;
const NETWORK_ERRORS = ['server-timeout', 'network', 'server-error', 'socket-error', 'socket-closed'];
// Fallos con los que vale la pena volver a intentar entrar. 'peer-unavailable' (código que no existe) no:
// el servidor solo lo avisa una vez y el reintento se quedaría esperando hasta el tiempo límite.
const RETRY_JOIN_ERRORS = ['timeout', 'connect-failed', 'negotiation-failed', ...NETWORK_ERRORS];
const MAX_MESSAGE_KEYS = 12;
// Latido: si otra tablet se apaga o pierde internet, WebRTC tarda mucho en notarlo.
const HEARTBEAT_MS = 2000;
const SILENCE_LIMIT_MS = 8000;
// Da tiempo a que el "adiós" salga antes de cerrar.
const CLOSE_DELAY_MS = 150;
// Mensajes que maneja este módulo y no llegan al juego.
const TRANSPORT_TYPES = ['ping', 'bye', 'welcome', 'full', 'left'];

let session = null;
// Marca de la sala que se está abriendo: si cambia (salir, otro intento), lo que estaba a medias se descarta.
let opening = null;
let peerClassPromise = null;

const peerId = (game, code) => `freegames-${game}-${code}`;

export const isPlayerId = (value) => typeof value === 'string' && PLAYER_ID_PATTERN.test(value);

function randomCode() {
  return Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

/** Limpia lo que se escribe: mayúsculas y solo caracteres válidos. */
export function normalizeCode(rawCode) {
  return String(rawCode ?? '')
    .toUpperCase()
    .split('')
    .filter((char) => CODE_CHARS.includes(char))
    .join('')
    .slice(0, CODE_LENGTH);
}

export function friendlyError(error) {
  switch (error?.type) {
    case 'peer-unavailable':
      return 'No encontramos esa sala. Revisa el código. 🔍';
    case 'timeout':
    case 'connect-failed':
    case 'negotiation-failed':
      return 'Encontramos la sala, pero no logramos conectar. Inténtalo otra vez. 📶';
    case 'server-timeout':
      return 'El servidor de carreras tarda en responder. Inténtalo otra vez. ⏳';
    case 'room-full':
      return 'Esa sala ya está llena o la carrera ya empezó. 🙈';
    case 'browser-incompatible':
      return 'Este navegador no permite carreras. 😕';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'No hay conexión a internet. 📶';
    default:
      return 'Algo falló. Inténtalo otra vez. 🙏';
  }
}

function loadPeerClass() {
  peerClassPromise ??= import('peerjs')
    .then((module) => module.Peer ?? module.default)
    .catch((error) => {
      peerClassPromise = null;
      throw error;
    });
  return peerClassPromise;
}

/** Descarga la librería de antemano (al entrar en la sala de espera) para que crear/unirse sea más rápido. */
export function preloadRace() {
  loadPeerClass().catch(() => {});
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cancelled = () => ({ type: 'cancelled' });

function openPeer(Peer, id) {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id) : new Peer();
    const handleOpen = () => {
      clearTimeout(timer);
      peer.off('error', handleError);
      resolve(peer);
    };
    const handleError = (error) => {
      clearTimeout(timer);
      peer.off('open', handleOpen);
      peer.off('error', handleError);
      peer.destroy();
      reject(error);
    };
    const timer = setTimeout(() => handleError({ type: 'server-timeout' }), OPEN_TIMEOUT_MS);
    peer.once('open', handleOpen);
    peer.on('error', handleError);
  });
}

/** Como openPeer, pero con un segundo intento si falla la red. */
async function openPeerWithRetry(Peer, id) {
  try {
    return await openPeer(Peer, id);
  } catch (error) {
    if (!NETWORK_ERRORS.includes(error?.type)) throw error;
    await wait(RETRY_PAUSE_MS);
    return openPeer(Peer, id);
  }
}

function startSession(peer, role, code) {
  session = {
    peer,
    role,
    code,
    myId: role === 'host' ? HOST_ID : null,
    // Anfitriona: id → conexión de cada invitado. Invitado: solo la conexión con la anfitriona.
    links: new Map(),
    nextGuestNumber: 1,
    locked: false,
    // Datos libres del juego (jugadores, configuración de la carrera…).
    meta: {},
    cleanups: [],
    listeners: { message: new Set(), leave: new Set(), disconnect: new Set() },
  };
  return session;
}

function emit(current, kind, payload) {
  if (session === current) current.listeners[kind].forEach((listener) => listener(payload));
}

const isValidMessage = (data) =>
  data && typeof data === 'object' && typeof data.type === 'string' && Object.keys(data).length <= MAX_MESSAGE_KEYS;

/**
 * Prepara una conexión abierta: latido, cierre y entrada de datos.
 * onData recibe los mensajes ya validados (sin ping/bye); onClose se llama una sola vez.
 */
function watchLink(current, conn, { onData, onClose }) {
  let lastSeen = Date.now();
  let lastTick = lastSeen;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    conn.close();
    if (session === current) onClose();
  };
  const heartbeat = setInterval(() => {
    const now = Date.now();
    // Si esta pantalla estuvo congelada (app en segundo plano), el silencio fue nuestro: se da otra oportunidad.
    if (now - lastTick > SILENCE_LIMIT_MS) lastSeen = now;
    lastTick = now;
    if (now - lastSeen > SILENCE_LIMIT_MS) close();
    else if (conn.open) conn.send({ type: 'ping' });
  }, HEARTBEAT_MS);
  conn.on('data', (data) => {
    if (closed || session !== current) return;
    lastSeen = Date.now();
    if (!isValidMessage(data) || data.type === 'ping') return;
    if (data.type === 'bye') close();
    else onData(data);
  });
  conn.on('close', close);
  conn.on('error', close);
  return close;
}

// ---------- Anfitriona ----------

function acceptGuest(current, conn) {
  const isFull = current.links.size >= MAX_PLAYERS - 1;
  if (current.locked || isFull) {
    conn.send({ type: 'full' });
    setTimeout(() => conn.close(), CLOSE_DELAY_MS);
    return;
  }
  const id = `g${current.nextGuestNumber}`;
  current.nextGuestNumber += 1;
  const close = watchLink(current, conn, {
    onData: (data) => {
      if (TRANSPORT_TYPES.includes(data.type)) return;
      const message = { ...data, from: id };
      // Se reenvía a los demás invitados y se entrega al juego de la anfitriona.
      current.links.forEach((link, otherId) => {
        if (otherId !== id && link.conn.open) link.conn.send(message);
      });
      emit(current, 'message', message);
    },
    onClose: () => {
      current.links.delete(id);
      current.links.forEach((link) => link.conn.open && link.conn.send({ type: 'left', id }));
      emit(current, 'leave', id);
    },
  });
  current.links.set(id, { conn, close });
  conn.send({ type: 'welcome', id });
}

/**
 * La anfitriona tiene que seguir registrada en el servidor para que la encuentren con el código.
 * Si se pierde (p. ej. al cambiar a otra app para compartir el código), se vuelve a registrar sola.
 */
function keepRegistered(current) {
  const { peer } = current;
  let retryTimer = null;
  let delay = RECONNECT_MIN_MS;
  const reconnect = () => {
    clearTimeout(retryTimer);
    retryTimer = null;
    if (session === current && peer.disconnected && !peer.destroyed) peer.reconnect();
  };
  const handleVisible = () => {
    if (document.visibilityState === 'visible') reconnect();
  };
  peer.on('disconnected', () => {
    if (session !== current || peer.destroyed) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(reconnect, delay);
    delay = Math.min(delay * 2, RECONNECT_MAX_MS);
  });
  peer.on('open', () => {
    delay = RECONNECT_MIN_MS;
  });
  document.addEventListener('visibilitychange', handleVisible);
  window.addEventListener('online', reconnect);
  current.cleanups.push(() => {
    clearTimeout(retryTimer);
    document.removeEventListener('visibilitychange', handleVisible);
    window.removeEventListener('online', reconnect);
  });
}

/** Abre una sala y espera a los demás. Devuelve el código. */
export async function createRoom(game) {
  leaveRoom();
  const token = {};
  opening = token;
  const Peer = await loadPeerClass();
  let lastError = null;
  for (let attempt = 0; attempt < MAX_CREATE_TRIES; attempt += 1) {
    if (opening !== token) throw cancelled();
    const code = randomCode();
    try {
      const peer = await openPeerWithRetry(Peer, peerId(game, code));
      if (opening !== token) {
        peer.destroy();
        throw cancelled();
      }
      opening = null;
      const current = startSession(peer, 'host', code);
      keepRegistered(current);
      peer.on('connection', (conn) => {
        conn.on('open', () => {
          if (session === current) acceptGuest(current, conn);
          else conn.close();
        });
      });
      return code;
    } catch (error) {
      lastError = error;
      if (error?.type !== 'unavailable-id') break;
    }
  }
  if (opening === token) opening = null;
  throw lastError;
}

/** Con la sala cerrada no entra nadie más (p. ej. cuando la carrera ya empezó). */
export function lockRoom(isLocked) {
  if (session?.role === 'host') session.locked = isLocked;
}

// ---------- Invitado ----------

/**
 * Un intento de conectar con la anfitriona. Resuelve cuando ella da la bienvenida;
 * si la conexión se cae antes o no llega a abrirse a tiempo, falla enseguida para reintentar.
 */
function connectToHost(current, game) {
  return new Promise((resolve, reject) => {
    const { peer } = current;
    const conn = peer.connect(peerId(game, current.code), { reliable: true });
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      peer.off('error', finish);
      if (error) {
        conn.close();
        reject(error);
      } else {
        resolve();
      }
    };
    const timer = setTimeout(() => finish({ type: 'timeout' }), ATTEMPT_TIMEOUT_MS);
    peer.on('error', finish);
    conn.on('error', () => finish({ type: 'connect-failed' }));
    conn.on('close', () => finish({ type: 'connect-failed' }));
    conn.on('open', () => {
      if (settled) return;
      const close = watchLink(current, conn, {
        onData: (data) => {
          if (data.type === 'welcome' && isPlayerId(data.id) && !current.myId) {
            current.myId = data.id;
            current.links.set(HOST_ID, { conn, close });
            finish();
          } else if (data.type === 'full') {
            finish({ type: 'room-full' });
          } else if (data.type === 'left') {
            if (isPlayerId(data.id)) emit(current, 'leave', data.id);
          } else if (current.myId && isPlayerId(data.from) && !TRANSPORT_TYPES.includes(data.type)) {
            emit(current, 'message', data);
          }
        },
        onClose: () => {
          current.links.clear();
          if (!current.myId) finish({ type: 'connect-failed' });
          else emit(current, 'disconnect');
        },
      });
    });
  });
}

/**
 * Se une a una sala con el código. Resuelve cuando la anfitriona le da su id.
 * Si la conexión falla, reintenta; onRetry(intento, máximo) permite avisarlo en pantalla.
 */
export async function joinRoom(game, rawCode, { onRetry } = {}) {
  leaveRoom();
  const token = {};
  opening = token;
  const code = normalizeCode(rawCode);
  const Peer = await loadPeerClass();
  if (opening !== token) throw cancelled();
  const peer = await openPeerWithRetry(Peer);
  if (opening !== token) {
    peer.destroy();
    throw cancelled();
  }
  opening = null;
  const current = startSession(peer, 'guest', code);
  for (let attempt = 1; ; attempt += 1) {
    try {
      await connectToHost(current, game);
      return code;
    } catch (error) {
      if (session !== current) throw cancelled();
      if (attempt >= MAX_JOIN_TRIES || !RETRY_JOIN_ERRORS.includes(error?.type)) {
        leaveRoom();
        throw error;
      }
    }
    onRetry?.(attempt + 1, MAX_JOIN_TRIES);
    await wait(RETRY_PAUSE_MS);
    if (session !== current) throw cancelled();
    if (current.peer.disconnected || current.peer.destroyed) {
      // Se perdió el servidor: se abre una conexión nueva.
      current.peer.destroy();
      try {
        current.peer = await openPeerWithRetry(Peer);
      } catch (error) {
        if (session === current) leaveRoom();
        throw error;
      }
      if (session !== current) {
        current.peer.destroy();
        throw cancelled();
      }
    }
  }
}

// ---------- Común ----------

export function getSession() {
  return session;
}

/** ¿Hay alguien más en la sala? */
export function isConnected() {
  return Boolean(session && session.links.size > 0);
}

/** Envía a todos (la anfitriona lo manda a cada invitado; el invitado, a la anfitriona para que lo reparta). */
export function send(message) {
  if (!session) return;
  const outgoing = session.role === 'host' ? { ...message, from: HOST_ID } : message;
  session.links.forEach((link) => {
    if (link.conn.open) link.conn.send(outgoing);
  });
}

function subscribe(kind, listener) {
  const current = session;
  current?.listeners[kind].add(listener);
  return () => current?.listeners[kind].delete(listener);
}

export const onMessage = (listener) => subscribe('message', listener);
/** Alguien se fue (recibe su id). */
export const onLeave = (listener) => subscribe('leave', listener);
/** Solo invitado: la sala se cerró o se perdió la conexión con la anfitriona. */
export const onDisconnect = (listener) => subscribe('disconnect', listener);

/** Sale de la sala avisando a los demás. No avisa a los oyentes propios: quien sale ya lo sabe. */
export function leaveRoom() {
  opening = null;
  if (!session) return;
  const current = session;
  session = null;
  current.cleanups.forEach((cleanup) => cleanup());
  current.links.forEach((link) => {
    if (link.conn.open) link.conn.send({ type: 'bye' });
  });
  setTimeout(() => {
    current.links.forEach((link) => link.close());
    current.peer.destroy();
  }, CLOSE_DELAY_MS);
}

// Al cerrar la pestaña o la app, se avisa a los demás para que no se queden esperando.
window.addEventListener('pagehide', leaveRoom);
