/**
 * Pantalla completa (en Android quita las barras del navegador; el iPhone no la tiene) y, al entrar,
 * intenta dejar la pantalla en horizontal. Si el navegador no deja, no pasa nada.
 */
import { el } from './dom.js';

export const canFullscreen = () => Boolean(document.fullscreenEnabled);

export function enterFullscreen({ landscape = false } = {}) {
  if (document.fullscreenElement || !canFullscreen()) return Promise.resolve();
  return document.documentElement
    .requestFullscreen()
    .then(() => (landscape ? screen.orientation?.lock?.('landscape') : undefined))
    .catch(() => {});
}

export function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

export function toggleFullscreen(options) {
  if (document.fullscreenElement) exitFullscreen();
  else enterFullscreen(options);
}

/** Botón ⛶ para la cabecera (null si el navegador no tiene pantalla completa). */
export function createFullscreenButton({ landscape = false, onClick } = {}) {
  if (!canFullscreen()) return null;
  return el('button', {
    className: 'icon-btn fullscreen-button',
    text: '⛶',
    attrs: { type: 'button', 'aria-label': 'Pantalla completa', title: 'Pantalla completa' },
    on: {
      click: (event) => {
        event.currentTarget.blur();
        onClick?.();
        toggleFullscreen({ landscape });
      },
    },
  });
}
