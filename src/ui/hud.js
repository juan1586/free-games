import { el, navigate } from './dom.js';
import { isMuted, setMuted } from '../core/player.js';
import { sounds } from '../core/audio.js';

/**
 * Cabecera de juego: botón volver, título, marcadores y controles de pausa/sonido.
 * items: [{ key, label, icon, value }]. Devuelve { element, set(key, value) }.
 */
export function createGameHeader({ title, backPath = '/', items = [], onPause }) {
  const valueNodes = new Map();

  const stats = items.map(({ key, label, icon, value }) => {
    const valueNode = el('span', { className: 'hud__value', text: value ?? 0 });
    valueNodes.set(key, valueNode);
    return el('div', { className: 'hud__item', attrs: { title: label } }, [
      el('span', { className: 'hud__icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
      el('span', { className: 'hud__label', text: label }),
      valueNode,
    ]);
  });

  const muteButton = el('button', {
    className: 'icon-btn',
    attrs: { type: 'button', 'aria-label': 'Sonido' },
    text: isMuted() ? '🔇' : '🔊',
    on: {
      click: () => {
        setMuted(!isMuted());
        muteButton.textContent = isMuted() ? '🔇' : '🔊';
        muteButton.blur();
        sounds.click();
      },
    },
  });

  const pauseButton = onPause
    ? el('button', {
        className: 'icon-btn',
        attrs: { type: 'button', 'aria-label': 'Pausa' },
        text: '⏸️',
        on: {
          click: (event) => {
            event.currentTarget.blur();
            onPause();
          },
        },
      })
    : null;

  const element = el('header', { className: 'game-header' }, [
    el('button', {
      className: 'icon-btn icon-btn--back',
      attrs: { type: 'button', 'aria-label': 'Volver' },
      text: '⬅',
      on: { click: () => navigate(backPath) },
    }),
    el('h1', { className: 'game-header__title', text: title }),
    el('div', { className: 'hud' }, stats),
    el('div', { className: 'game-header__actions' }, [pauseButton, muteButton]),
  ]);

  return {
    element,
    set(key, value) {
      const node = valueNodes.get(key);
      if (node && node.textContent !== String(value)) {
        node.textContent = String(value);
        node.classList.remove('is-bumped');
        void node.offsetWidth;
        node.classList.add('is-bumped');
      }
    },
  };
}

/** Mensaje grande y temporal sobre el canvas (p. ej. "¡Nivel 3!"). */
export function createBanner(container) {
  const banner = el('div', { className: 'banner', attrs: { 'aria-live': 'polite' } });
  container.append(banner);
  let timer = null;
  return (text, durationMs = 1600) => {
    clearTimeout(timer);
    banner.textContent = text;
    banner.classList.remove('is-visible');
    void banner.offsetWidth;
    banner.classList.add('is-visible');
    timer = setTimeout(() => banner.classList.remove('is-visible'), durationMs);
  };
}

/** Botón táctil con icono y texto (en horizontal el icono va arriba y el texto abajo). */
export function createTouchButton({ icon, label, variant }) {
  return el('button', { className: `touch-btn touch-btn--${variant}`, attrs: { type: 'button', 'aria-label': label } }, [
    el('span', { className: 'touch-btn__icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'touch-btn__label', text: label }),
  ]);
}
