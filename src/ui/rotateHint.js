/**
 * Aviso amable para los juegos de correr en un celular en vertical: «Gira el celular para ver más
 * camino», con «🔄 Girar» (pantalla completa en horizontal, donde el navegador lo deja) y «Jugar así».
 * Sale una vez por sesión y se quita solo al girar el celular.
 */
import { el } from './dom.js';
import { canFullscreen, enterFullscreen } from './fullscreen.js';

/** Solo en celular: en una tablet en vertical se juega bien. */
const TOUCH_PORTRAIT_QUERY = '(hover: none) and (pointer: coarse) and (orientation: portrait) and (max-width: 700px)';
const DISMISSED_KEY = 'freegames:rotate-hint';

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Sin sessionStorage (modo privado): vuelve a salir la próxima vez, no pasa nada.
  }
};

/** Pone el aviso en `container` si hace falta. Devuelve la función que lo quita. */
export function createRotateHint(container) {
  const query = matchMedia(TOUCH_PORTRAIT_QUERY);
  if (!query.matches || wasDismissed()) return () => {};

  const close = () => {
    overlay.remove();
    query.removeEventListener('change', handleChange);
  };
  const handleChange = (event) => {
    if (!event.matches) close();
  };
  const actions = [];
  if (canFullscreen()) {
    actions.push(
      el('button', {
        className: 'btn btn--primary',
        text: '🔄 Girar',
        attrs: { type: 'button' },
        on: { click: () => enterFullscreen({ landscape: true }) },
      }),
    );
  }
  actions.push(
    el('button', {
      className: 'btn btn--secondary',
      text: 'Jugar así ▶',
      attrs: { type: 'button' },
      on: {
        click: () => {
          remember();
          close();
        },
      },
    }),
  );
  const overlay = el('div', { className: 'rotate-hint', attrs: { role: 'dialog', 'aria-label': 'Gira el celular' } }, [
    el('div', { className: 'rotate-hint__phone', text: '📱', attrs: { 'aria-hidden': 'true' } }),
    el('strong', { className: 'rotate-hint__title', text: '¡Gira el celular!' }),
    el('p', { className: 'rotate-hint__text', text: 'Acostado se ve mucho más camino y se juega mejor.' }),
    el('div', { className: 'rotate-hint__actions' }, actions),
  ]);
  query.addEventListener('change', handleChange);
  container.append(overlay);
  return close;
}
