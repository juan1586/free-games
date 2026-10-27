import { el, navigate } from './dom.js';
import { getActivePlayer, getGameData, getPlayers, isMuted, setActivePlayer, setMuted } from '../core/player.js';
import { sounds } from '../core/audio.js';
import { DINO_WORLDS } from '../games/dino/worlds.js';
import { TETRIS_WORLDS } from '../games/tetris/levels.js';

function countStars(starsByWorld) {
  return Object.values(starsByWorld).reduce((total, stars) => total + stars, 0);
}

function renderPlayerSwitcher() {
  const active = getActivePlayer();
  const chips = getPlayers().map((player) =>
    el(
      'button',
      {
        className: `player-chip ${player.id === active?.id ? 'is-active' : ''}`,
        attrs: { type: 'button', 'aria-pressed': String(player.id === active?.id) },
        on: {
          click: () => {
            sounds.click();
            setActivePlayer(player.id);
          },
        },
      },
      [el('span', { className: 'player-chip__avatar', text: player.avatar }), el('span', { text: player.name })],
    ),
  );

  return el('nav', { className: 'player-switcher', attrs: { 'aria-label': 'Jugadores' } }, [
    ...chips,
    el('button', {
      className: 'player-chip player-chip--add',
      text: '＋ Nuevo',
      attrs: { type: 'button' },
      on: { click: () => navigate('/perfil') },
    }),
  ]);
}

function renderGameCard({ path, title, tagline, art, theme, records }) {
  return el(
    'a',
    { className: `game-card game-card--${theme}`, attrs: { href: `#${path}` }, on: { click: () => sounds.click() } },
    [
      el('div', { className: 'game-card__art', attrs: { 'aria-hidden': 'true' } }, art),
      el('div', { className: 'game-card__body' }, [
        el('h2', { className: 'game-card__title', text: title }),
        el('p', { className: 'game-card__tagline', text: tagline }),
        el(
          'ul',
          { className: 'game-card__records' },
          records.map(({ icon, label, value }) =>
            el('li', {}, [el('span', { text: icon, attrs: { 'aria-hidden': 'true' } }), el('span', { text: `${label}: ${value}` })]),
          ),
        ),
        el('span', { className: 'btn btn--play', text: '¡Jugar! ▶' }),
      ]),
    ],
  );
}

function renderDinoArt() {
  return [
    el('span', { className: 'art-sun' }),
    el('span', { className: 'art-dino', text: '🦖' }),
    el('span', { className: 'art-cactus', text: '🌵' }),
    el('span', { className: 'art-ground' }),
  ];
}

function renderTetrisArt() {
  const colors = ['#ff5fa2', '#ffd93d', '#4dd4ac', '#5ab0ff', '#b57bff'];
  return Array.from({ length: 5 }, (_, index) =>
    el('span', {
      className: 'art-block',
      style: { background: colors[index], animationDelay: `${index * 0.35}s`, left: `${12 + index * 16}%` },
    }),
  );
}

export function mountMenu(root) {
  const player = getActivePlayer();
  const dino = getGameData('dino');
  const tetris = getGameData('tetris');

  const muteButton = el('button', {
    className: 'icon-btn',
    text: isMuted() ? '🔇' : '🔊',
    attrs: { type: 'button', 'aria-label': 'Sonido' },
    on: {
      click: () => {
        setMuted(!isMuted());
        muteButton.textContent = isMuted() ? '🔇' : '🔊';
        sounds.click();
      },
    },
  });

  const header = el('header', { className: 'menu-header' }, [
    el('div', { className: 'menu-header__greeting' }, [
      el('span', { className: 'menu-header__avatar', text: player.avatar, attrs: { 'aria-hidden': 'true' } }),
      el('div', {}, [
        el('p', { className: 'menu-header__hello', text: '¡Hola,' }),
        el('h1', { className: 'menu-header__name', text: `${player.name}!` }),
      ]),
    ]),
    el('div', { className: 'menu-header__actions' }, [
      el('button', {
        className: 'icon-btn',
        text: '✏️',
        attrs: { type: 'button', 'aria-label': 'Editar jugador' },
        on: { click: () => navigate('/perfil/editar') },
      }),
      muteButton,
    ]),
  ]);

  const cards = el('section', { className: 'game-grid', attrs: { 'aria-label': 'Juegos' } }, [
    renderGameCard({
      path: '/dino',
      title: 'Dino Corre',
      tagline: 'Elige tu dinosaurio y corre por 5 mundos.',
      theme: 'dino',
      art: renderDinoArt(),
      records: [
        { icon: '🏆', label: 'Récord', value: dino.bestScore },
        { icon: '🪙', label: 'Monedas', value: dino.coins },
        { icon: '🗺️', label: 'Mundos', value: `${Math.min(dino.unlockedWorld + 1, DINO_WORLDS.length)}/${DINO_WORLDS.length}` },
      ],
    }),
    renderGameCard({
      path: '/tetris',
      title: 'Bloques Mágicos',
      tagline: 'Encaja piezas de colores y gana estrellas.',
      theme: 'tetris',
      art: renderTetrisArt(),
      records: [
        { icon: '🏆', label: 'Récord', value: tetris.bestScore },
        { icon: '⭐', label: 'Estrellas', value: `${countStars(tetris.stars)}/${TETRIS_WORLDS.length * 3}` },
        { icon: '🧱', label: 'Líneas', value: tetris.bestLines },
      ],
    }),
  ]);

  root.append(el('main', { className: 'page menu' }, [header, renderPlayerSwitcher(), cards]));
}
