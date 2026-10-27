import './styles/tokens.css';
import './styles/base.css';
import './styles/menu.css';
import './styles/games.css';

import { getActivePlayer, onPlayersChange } from './core/player.js';
import { closeModal } from './ui/modal.js';
import { navigate } from './ui/dom.js';
import { mountMenu } from './ui/menu.js';
import { mountProfile } from './ui/profile.js';
import { mountDinoSetup } from './games/dino/setup.js';
import { mountDinoGame } from './games/dino/DinoGame.js';
import { mountTetrisSetup } from './games/tetris/setup.js';
import { mountTetrisGame } from './games/tetris/TetrisGame.js';
import { mountGeoSetup } from './games/geo/setup.js';
import { mountGeoGame } from './games/geo/GeoGame.js';

const app = document.getElementById('app');

const parseWorld = (query) => {
  const value = Number.parseInt(query.get('mundo') ?? '0', 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const parseLevel = (query) => {
  const value = Number.parseInt(query.get('nivel') ?? '0', 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const ROUTES = {
  '/': () => mountMenu(app),
  '/perfil': () => mountProfile(app, { mode: 'create' }),
  '/perfil/editar': () => mountProfile(app, { mode: 'edit' }),
  '/dino': () => mountDinoSetup(app),
  '/dino/jugar': (query) => mountDinoGame(app, { worldIndex: parseWorld(query) }),
  '/tetris': () => mountTetrisSetup(app),
  '/tetris/jugar': (query) => mountTetrisGame(app, { worldIndex: parseWorld(query) }),
  '/geo': () => mountGeoSetup(app),
  '/geo/jugar': (query) => mountGeoGame(app, { levelIndex: parseLevel(query), practice: query.get('practica') === '1' }),
};

let cleanupCurrentView = null;
let currentPath = null;

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

  closeModal();
  cleanupCurrentView?.();
  cleanupCurrentView = null;
  app.replaceChildren();
  window.scrollTo(0, 0);

  currentPath = path;
  document.body.dataset.route = path;
  cleanupCurrentView = route(query) ?? null;
}

// El menú refleja al instante el cambio de jugador activo.
onPlayersChange(() => {
  if (currentPath === '/') render();
});

window.addEventListener('hashchange', render);
render();
