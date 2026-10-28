import './styles/tokens.css';
import './styles/base.css';
import './styles/menu.css';
import './styles/games.css';

import { getActivePlayer, onPlayersChange } from './core/player.js';
import { closeModal } from './ui/modal.js';
import { el, navigate } from './ui/dom.js';
import { mountMenu } from './ui/menu.js';
import { mountProfile } from './ui/profile.js';
import { mountDinoSetup } from './games/dino/setup.js';
import { mountDinoGame } from './games/dino/DinoGame.js';
import { mountDinoRaceLobby } from './games/dino/raceLobby.js';
import { mountTetrisSetup } from './games/tetris/setup.js';
import { mountTetrisGame } from './games/tetris/TetrisGame.js';
import { mountGeoSetup } from './games/geo/setup.js';
import { mountGeoGame } from './games/geo/GeoGame.js';
import { mountGeoRaceLobby } from './games/geo/raceLobby.js';
import { mountParkSetup } from './games/park/setup.js';
import { mountParkFriendsLobby } from './games/park/raceLobby.js';
import { getSession, isConnected } from './core/race.js';
import { trackPage } from './core/analytics.js';
import { mountAlbum } from './album/album.js';
import { syncStickers } from './album/stickers.js';

const app = document.getElementById('app');

const parseWorld = (query) => {
  const value = Number.parseInt(query.get('mundo') ?? '0', 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const parseLevel = (query) => {
  const value = Number.parseInt(query.get('nivel') ?? '0', 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

/**
 * Pantalla pesada que se descarga solo al entrar (el parque 3D trae three.js). Mientras llega se ve
 * un aviso de carga; si se sale antes de que termine, no se monta.
 */
function mountLazy(load, mount) {
  const message = el('p', { className: 'lazy-loading__text', text: 'Cargando el parque… 🎡' });
  const loading = el('main', { className: 'page lazy-loading' }, [message]);
  app.append(loading);
  let cleanup = null;
  let cancelled = false;
  load()
    .then((module) => {
      if (cancelled) return;
      loading.remove();
      cleanup = mount(module);
    })
    .catch(() => {
      if (!cancelled) message.textContent = '😢 No se pudo cargar. Revisa la conexión y vuelve a intentarlo.';
    });
  return () => {
    cancelled = true;
    cleanup?.();
  };
}

/** ¿Hay una carrera lista para jugar? (Al recargar la página se pierde la sala.) */
const hasRaceReady = () => isConnected() && Boolean(getSession().meta.config) && getSession().meta.players?.length >= 2;

const ROUTES = {
  '/': () => mountMenu(app),
  '/perfil': () => mountProfile(app, { mode: 'create' }),
  '/perfil/editar': () => mountProfile(app, { mode: 'edit' }),
  '/dino': () => mountDinoSetup(app),
  '/dino/carrera': (query) => mountDinoRaceLobby(app, { worldIndex: parseWorld(query) }),
  '/dino/jugar': (query) => {
    const race = query.get('carrera') === '1';
    if (race && !hasRaceReady()) {
      navigate(`/dino/carrera?mundo=${parseWorld(query)}`);
      return null;
    }
    return mountDinoGame(app, { worldIndex: parseWorld(query), race });
  },
  '/album': () => mountAlbum(app),
  '/tetris': () => mountTetrisSetup(app),
  '/tetris/jugar': (query) => mountTetrisGame(app, { worldIndex: parseWorld(query) }),
  '/geo': () => mountGeoSetup(app),
  '/geo/carrera': (query) => mountGeoRaceLobby(app, { levelIndex: parseLevel(query) }),
  '/geo/jugar': (query) => {
    const race = query.get('carrera') === '1';
    if (race && !hasRaceReady()) {
      navigate(`/geo/carrera?nivel=${parseLevel(query)}`);
      return null;
    }
    return mountGeoGame(app, { levelIndex: parseLevel(query), practice: query.get('practica') === '1', race });
  },
  '/parque': () => mountParkSetup(app),
  '/parque/amigos': (query) => mountParkFriendsLobby(app, { worldIndex: parseWorld(query) }),
  '/parque/jugar': (query) => {
    const friends = query.get('amigos') === '1';
    if (friends && !hasRaceReady()) {
      navigate(`/parque/amigos?mundo=${parseWorld(query)}`);
      return null;
    }
    return mountLazy(
      () => import('./games/park/ParkGame.js'),
      (module) => module.mountParkGame(app, { worldIndex: parseWorld(query), friends }),
    );
  },
};

// Nombres legibles en el panel de estadísticas.
const PAGE_TITLES = {
  '/': 'Menú',
  '/perfil': 'Crear jugador',
  '/perfil/editar': 'Editar jugador',
  '/dino': 'Dino Corre',
  '/dino/carrera': 'Dino · sala de carrera',
  '/dino/jugar': 'Dino · jugando',
  '/album': 'Álbum de pegatinas',
  '/tetris': 'Bloques Mágicos',
  '/tetris/jugar': 'Bloques · jugando',
  '/geo': 'Salto Geométrico',
  '/geo/carrera': 'Geo · sala de carrera',
  '/geo/jugar': 'Geo · jugando',
  '/parque': 'Parque Mágico',
  '/parque/amigos': 'Parque · sala de amigas',
  '/parque/jugar': 'Parque · paseando',
};
// Solo estos parámetros llegan a las estadísticas (todos son números o banderas).
const TRACKED_PARAMS = ['mundo', 'nivel', 'practica', 'carrera', 'amigos'];

function trackRoute(path, query) {
  const params = new URLSearchParams();
  TRACKED_PARAMS.forEach((key) => query.has(key) && params.set(key, query.get(key)));
  const search = params.toString();
  trackPage(search ? `${path}?${search}` : path, PAGE_TITLES[path]);
}

let cleanupCurrentView = null;
let currentPath = null;
let isRendering = false;

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryString = ''] = raw.split('?');
  return { path, query: new URLSearchParams(queryString) };
}

function render() {
  const { path, query } = parseHash();

  if (!getActivePlayer() && path !== '/perfil') {
    navigate('/perfil');
    return;
  }
  if (path === '/perfil/editar' && !getActivePlayer()) {
    navigate('/perfil');
    return;
  }
  const route = ROUTES[path];
  if (!route) {
    navigate('/');
    return;
  }

  isRendering = true;
  // Al cambiar de pantalla se revisa si lo jugado ya da pegatinas nuevas.
  syncStickers();
  isRendering = false;

  closeModal();
  cleanupCurrentView?.();
  cleanupCurrentView = null;
  app.replaceChildren();
  window.scrollTo(0, 0);

  currentPath = path;
  document.body.dataset.route = path;
  cleanupCurrentView = route(query) ?? null;
  // Si la ruta redirigió a otra, ya se contará esa.
  if (parseHash().path === path) trackRoute(path, query);
}

// El menú refleja al instante el cambio de jugador activo.
onPlayersChange(() => {
  if (currentPath === '/' && !isRendering) render();
});

// Safari (iPhone/iPad) no respeta del todo touch-action con el pellizco: dentro de los juegos se bloquea aquí.
document.addEventListener(
  'gesturestart',
  (event) => {
    if (event.target.closest?.('.stage, .touch-controls, .game-page .game-header')) event.preventDefault();
  },
  { passive: false },
);

window.addEventListener('hashchange', render);
render();
