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
const CONNECT_TIMEOUT_MS = 12000;
const MAX_MESSAGE_KEYS = 12;
// Latido: si otra tablet se apaga o pierde internet, WebRTC tarda mucho en notarlo.
const HEARTBEAT_MS = 2000;
const SILENCE_LIMIT_MS = 8000;
// Da tiempo a que el "adiós" salga antes de cerrar.
const CLOSE_DELAY_MS = 150;
// Mensajes que maneja este módulo y no llegan al juego.
const TRANSPORT_TYPES = ['ping', 'bye', 'welcome', 'full', 'left'];

let session = null;

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
    case 'timeout':
      return 'No encontramos esa sala. Revisa el código. 🔍';
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

async function loadPeerClass() {
  const module = await import('peerjs');
  return module.Peer ?? module.default;
}

function openPeer(Peer, id) {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id) : new Peer();
    const handleError = (error) => {
      peer.destroy();
      reject(error);
    };
    peer.once('open', () => {
      peer.off('error', handleError);
      resolve(peer);
    });
    peer.once('error', handleError);
  });
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
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    conn.close();
    if (session === current) onClose();
  };
  const heartbeat = setInterval(() => {
    if (Date.now() - lastSeen > SILENCE_LIMIT_MS) close();
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

/** Abre una sala y espera a los demás. Devuelve el código. */
export async function createRoom(game) {
  leaveRoom();
  const Peer = await loadPeerClass();
  let lastError = null;
  for (let attempt = 0; attempt < MAX_CREATE_TRIES; attempt += 1) {
    const code = randomCode();
    try {
      const peer = await openPeer(Peer, peerId(game, code));
      const current = startSession(peer, 'host', code);
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
  throw lastError;
}

/** Con la sala cerrada no entra nadie más (p. ej. cuando la carrera ya empezó). */
export function lockRoom(isLocked) {
  if (session?.role === 'host') session.locked = isLocked;
}

// ---------- Invitado ----------

/** Se une a una sala con el código. Resuelve cuando la anfitriona le da su id. */
export async function joinRoom(game, rawCode) {
  leaveRoom();
  const code = normalizeCode(rawCode);
  const Peer = await loadPeerClass();
  const peer = await openPeer(Peer);
  const current = startSession(peer, 'guest', code);
  try {
    await new Promise((resolve, reject) => {
      const conn = peer.connect(peerId(game, code), { reliable: true });
      const timer = setTimeout(() => reject({ type: 'timeout' }), CONNECT_TIMEOUT_MS);
      const fail = (error) => {
        clearTimeout(timer);
        reject(error);
      };
      peer.once('error', fail);
      conn.on('open', () => {
        const close = watchLink(current, conn, {
          onData: (data) => {
            if (data.type === 'welcome' && isPlayerId(data.id) && !current.myId) {
              clearTimeout(timer);
              current.myId = data.id;
              current.links.set(HOST_ID, { conn, close });
              resolve();
            } else if (data.type === 'full') {
              fail({ type: 'room-full' });
            } else if (data.type === 'left') {
              if (isPlayerId(data.id)) emit(current, 'leave', data.id);
            } else if (current.myId && isPlayerId(data.from) && !TRANSPORT_TYPES.includes(data.type)) {
              emit(current, 'message', data);
            }
          },
          onClose: () => {
            current.links.clear();
            if (!current.myId) fail({ type: 'peer-unavailable' });
            else emit(current, 'disconnect');
          },
        });
      });
    });
  } catch (error) {
    if (session === current) leaveRoom();
    throw error;
  }
  return code;
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
  if (!session) return;
  const current = session;
  session = null;
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
