import { el, navigate } from '../../ui/dom.js';
import { getGameData } from '../../core/player.js';
import { sounds } from '../../core/audio.js';
import { TETRIS_WORLDS } from './levels.js';

/** Pantalla previa a Tetris: elegir mundo y ver estrellas conseguidas. */
export function mountTetrisSetup(root) {
  const data = getGameData('tetris');

  const worldCards = TETRIS_WORLDS.map((world, index) => {
    const isLocked = index > data.unlockedWorld;
    const earnedStars = data.stars[world.id] ?? 0;
    const swatches = el(
      'div',
      { className: 'tetris-world__swatches', attrs: { 'aria-hidden': 'true' } },
      world.theme.pieces.map((color) => el('span', { style: { background: color } })),
    );
    return el(
      'button',
      {
        className: `tetris-world ${isLocked ? 'is-locked' : ''}`,
        style: { background: world.theme.background, '--world-text': world.theme.text },
        attrs: { type: 'button', disabled: isLocked },
        on: {
          click: () => {
            sounds.coin();
            navigate(`/tetris/jugar?mundo=${index}`);
          },
        },
      },
      [
        el('span', { className: 'tetris-world__emoji', text: isLocked ? '🔒' : world.emoji, attrs: { 'aria-hidden': 'true' } }),
        el('strong', { className: 'tetris-world__name', text: world.name }),
        el('small', { text: isLocked ? 'Supera el mundo anterior' : `Meta: ${world.goalLines} líneas · Nivel ${world.startLevel}` }),
        swatches,
        el('span', {
          className: 'tetris-world__stars',
          text: '★★★'.slice(0, earnedStars) + '☆☆☆'.slice(0, 3 - earnedStars),
          attrs: { 'aria-label': `${earnedStars} de 3 estrellas` },
        }),
      ],
    );
  });

  root.append(
    el('main', { className: 'page' }, [
      el('div', { className: 'setup' }, [
        el('header', { className: 'setup__header' }, [
          el('button', {
            className: 'icon-btn icon-btn--back',
            text: '⬅',
            attrs: { type: 'button', 'aria-label': 'Volver al menú' },
            on: { click: () => navigate('/') },
          }),
          el('h1', { className: 'setup__title', text: '🧱 Bloques Mágicos' }),
        ]),
        el('section', { className: 'card setup__section' }, [
          el('h2', { className: 'setup__subtitle', text: 'Elige un mundo' }),
          el('div', { className: 'tetris-world-grid' }, worldCards),
          el('p', {
            className: 'setup__note',
            text: 'Completa las líneas de la meta para abrir el siguiente mundo. ¡Más puntos = más estrellas!',
          }),
        ]),
      ]),
    ]),
  );
}
