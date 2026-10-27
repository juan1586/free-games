import { el, navigate } from './dom.js';
import { getActivePlayer, getGameData, getPlayers, isMuted, setActivePlayer, setMuted } from '../core/player.js';
import { sounds } from '../core/audio.js';
import { showModal } from './modal.js';
import { STICKERS, canOpenChest, openChest } from '../album/stickers.js';
import { trackEvent } from '../core/analytics.js';
import { DINO_WORLDS } from '../games/dino/worlds.js';
import { TETRIS_WORLDS } from '../games/tetris/levels.js';
import { GEO_WORLDS, MAIN_LEVELS } from '../games/geo/levels.js';
import { ACHIEVEMENTS, MAX_STARS, countCompleted, countStars as countGeoStars } from '../games/geo/achievements.js';
import { GOLDEN_BEANS } from '../games/park/worlds.js';

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

const CHEST_OPEN_MS = 900;

/** Álbum de pegatinas y cofre sorpresa del día. */
function renderTreasureBar() {
  const album = getGameData('album');
  const freshCount = album.fresh.length;
  const albumLink = el('a', { className: 'treasure-btn treasure-btn--album', attrs: { href: '#/album' }, on: { click: () => sounds.click() } }, [
    el('span', { className: 'treasure-btn__icon', text: '📒', attrs: { 'aria-hidden': 'true' } }),
    el('span', {}, [
      el('strong', { text: 'Mi álbum' }),
      el('small', { text: `${album.stickers.length}/${STICKERS.length} pegatinas` }),
    ]),
    freshCount ? el('span', { className: 'treasure-btn__badge', text: `¡${freshCount} ${freshCount === 1 ? 'nueva' : 'nuevas'}!` }) : null,
  ].filter(Boolean));

  const isReady = canOpenChest();
  const chestIcon = el('span', { className: 'treasure-btn__icon', text: '🎁', attrs: { 'aria-hidden': 'true' } });
  const chestButton = el(
    'button',
    {
      className: `treasure-btn treasure-btn--chest ${isReady ? 'is-ready' : ''}`,
      attrs: { type: 'button', disabled: !isReady },
      on: { click: () => openDailyChest() },
    },
    [
      chestIcon,
      el('span', {}, [
        el('strong', { text: 'Cofre del día' }),
        el('small', { text: isReady ? '¡Ábrelo!' : 'Vuelve mañana 🌙' }),
      ]),
    ],
  );

  function openDailyChest() {
    if (!canOpenChest() || chestButton.classList.contains('is-opening')) return;
    sounds.click();
    chestButton.classList.add('is-opening');
    setTimeout(() => {
      const reward = openChest();
      trackEvent('cofre-abierto', 'Cofre del día abierto');
      sounds.achievement();
      showModal({
        emoji: reward.sticker ? reward.sticker.icon : '🪙',
        title: '¡Sorpresa!',
        message: reward.sticker
          ? `¡Una pegatina nueva para tu álbum: ${reward.sticker.name}!`
          : `¡${reward.coins} monedas para gastar en la tienda de Dino!`,
        tone: 'success',
        actions: [
          reward.sticker ? { label: 'Ver mi álbum 📒', variant: 'primary', onClick: () => navigate('/album') } : null,
          { label: '¡Genial!', variant: reward.sticker ? 'secondary' : 'primary' },
        ].filter(Boolean),
      });
    }, CHEST_OPEN_MS);
  }

  return el('section', { className: 'treasure-bar', attrs: { 'aria-label': 'Premios' } }, [albumLink, chestButton]);
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

function renderParkArt() {
  return [
    el('span', { className: 'art-park-wheel' }),
    el('span', { className: 'art-park-coaster', text: '🎢' }),
    el('span', { className: 'art-park-cup', text: '☕' }),
    el('span', { className: 'art-park-ground' }),
  ];
}

function renderGeoArt() {
  return [
    el('span', { className: 'art-geo-cube' }),
    el('span', { className: 'art-geo-spike' }),
    el('span', { className: 'art-geo-ground' }),
  ];
}

export function mountMenu(root) {
  const player = getActivePlayer();
  const dino = getGameData('dino');
  const tetris = getGameData('tetris');
  const geo = getGameData('geo');
  const park = getGameData('park');

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
      tagline: `Elige tu dinosaurio y corre por ${DINO_WORLDS.length} mundos.`,
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
    renderGameCard({
      path: '/geo',
      title: 'Salto Geométrico',
      tagline: `Salta, vuela y gira por ${GEO_WORLDS.length - 1} mundos de figuras… ¡y uno secreto!`,
      theme: 'geo',
      art: renderGeoArt(),
      records: [
        { icon: '🏁', label: 'Niveles', value: `${countCompleted(geo)}/${MAIN_LEVELS.length}` },
        { icon: '⭐', label: 'Estrellas', value: `${countGeoStars(geo)}/${MAX_STARS}` },
        { icon: '🏅', label: 'Retos', value: `${geo.achievements.length}/${ACHIEVEMENTS.length}` },
      ],
    }),
    renderGameCard({
      path: '/parque',
      title: 'Parque Mágico',
      tagline: 'Pasea en 3D por el Parque del Café, haz fila y monta en el Krater.',
      theme: 'park',
      art: renderParkArt(),
      records: [
        { icon: '🪙', label: 'Monedas', value: park.coins },
        { icon: '🎢', label: 'Viajes', value: park.totalRides },
        { icon: '🌟', label: 'Granos', value: `${park.goldenBeans.length}/${GOLDEN_BEANS.length}` },
      ],
    }),
  ]);

  root.append(el('main', { className: 'page menu' }, [header, renderPlayerSwitcher(), renderTreasureBar(), cards]));
}
