/**
 * Conexión entre dos navegadores para las carreras (WebRTC con PeerJS).
 * El servidor público de PeerJS solo sirve para que los dos se encuentren con el código de sala;
 * los mensajes viajan directos. La librería se descarga solo al entrar en modo carrera.
 * La sesión vive en el módulo para sobrevivir al cambio de ruta (sala de espera → juego).
 */

// Sin letras ni números que se confundan (0/O, 1/I/L, 5/S, 8/B…).
const CODE_CHARS = 'ACDEFHJKMNPRTWXY34679';
export const CODE_LENGTH = 4;
const MAX_CREATE_TRIES = 4;
const CONNECT_TIMEOUT_MS = 12000;
const MAX_MESSAGE_KEYS = 12;
// Latido: si la otra tablet se apaga o pierde internet, WebRTC tarda mucho en notarlo.
const HEARTBEAT_MS = 2000;
const SILENCE_LIMIT_MS = 8000;
// Da tiempo a que el "adiós" salga antes de cerrar.
const CLOSE_DELAY_MS = 150;

let session = null;

const peerId = (game, code) => `freegames-${game}-${code}`;

function randomCode() {
  return Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

/** Limpia lo que escribe la jugadora: mayúsculas y solo caracteres válidos. */
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
    conn: null,
    // Datos libres del juego (rival, configuración de la carrera…).
    meta: {},
    listeners: { message: new Set(), connect: new Set(), disconnect: new Set() },
  };
  return session;
}

function emit(kind, payload) {
  session?.listeners[kind].forEach((listener) => listener(payload));
}

function attachConnection(current, conn) {
  current.conn = conn;
  let lastSeen = Date.now();
  const handleClose = () => {
    if (session !== current || current.conn !== conn) return;
    clearInterval(current.heartbeat);
    current.conn = null;
    conn.close();
    emit('disconnect');
  };
  conn.on('data', (data) => {
    if (session !== current || current.conn !== conn) return;
    lastSeen = Date.now();
    // Solo objetos pequeños con un tipo: lo demás se ignora.
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
    if (Object.keys(data).length > MAX_MESSAGE_KEYS) return;
    if (data.type === 'ping') return;
    if (data.type === 'bye') {
      handleClose();
      return;
    }
    emit('message', data);
  });
  conn.on('close', handleClose);
  conn.on('error', handleClose);
  clearInterval(current.heartbeat);
  current.heartbeat = setInterval(() => {
    if (Date.now() - lastSeen > SILENCE_LIMIT_MS) handleClose();
    else if (conn.open) conn.send({ type: 'ping' });
  }, HEARTBEAT_MS);
  emit('connect');
}

/** La anfitriona abre una sala y espera a su amiga. Devuelve el código. */
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
        // Solo cabe una amiga por sala.
        if (current.conn) {
          conn.on('open', () => conn.close());
          return;
        }
        conn.on('open', () => {
          if (session === current && !current.conn) attachConnection(current, conn);
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

/** La invitada se une a una sala con el código. */
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
      peer.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      conn.on('open', () => {
        clearTimeout(timer);
        attachConnection(current, conn);
        resolve();
      });
    });
  } catch (error) {
    if (session === current) leaveRoom();
    throw error;
  }
  return code;
}

export function getSession() {
  return session;
}

export function isConnected() {
  return Boolean(session?.conn?.open);
}

export function send(message) {
  if (session?.conn?.open) session.conn.send(message);
}

function subscribe(kind, listener) {
  const current = session;
  current?.listeners[kind].add(listener);
  return () => current?.listeners[kind].delete(listener);
}

export const onMessage = (listener) => subscribe('message', listener);
export const onConnect = (listener) => subscribe('connect', listener);
export const onDisconnect = (listener) => subscribe('disconnect', listener);

/** Cierra la sala. No avisa a los oyentes propios: quien sale ya lo sabe. */
export function leaveRoom() {
  if (!session) return;
  const current = session;
  session = null;
  clearInterval(current.heartbeat);
  if (current.conn?.open) current.conn.send({ type: 'bye' });
  setTimeout(() => current.peer.destroy(), CLOSE_DELAY_MS);
}

// Al cerrar la pestaña o la app, se avisa a la amiga para que no se quede esperando.
window.addEventListener('pagehide', leaveRoom);
