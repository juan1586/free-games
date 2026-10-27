import { el } from './dom.js';
import { sounds } from '../core/audio.js';

const KEY_ARM_DELAY_MS = 600;

let activeModal = null;

export function closeModal() {
  if (!activeModal) return;
  const { overlay, handleKeyDown } = activeModal;
  window.removeEventListener('keydown', handleKeyDown, true);
  overlay.classList.add('is-leaving');
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  activeModal = null;
}

/**
 * Muestra un diálogo de pausa, game over o nivel superado.
 * actions: [{ label, variant: 'primary' | 'secondary', onClick }]. La primera recibe el foco.
 * escapeIndex: acción que se ejecuta con Escape/P (útil para "Continuar" en la pausa).
 * keyArmDelayMs: tiempo en que Enter/Espacio no hacen nada (por si se seguía pulsando "saltar").
 */
export function showModal({ emoji, title, message, stars, stats = [], actions = [], tone = 'neutral', escapeIndex, keyArmDelayMs = KEY_ARM_DELAY_MS }) {
  closeModal();

  const starRow =
    stars === undefined
      ? null
      : el(
          'div',
          { className: 'modal__stars', attrs: { 'aria-label': `${stars} de 3 estrellas` } },
          [0, 1, 2].map((index) =>
            el('span', {
              className: `modal__star ${index < stars ? 'is-earned' : ''}`,
              text: '★',
              style: { animationDelay: `${0.15 + index * 0.18}s` },
            }),
          ),
        );

  const statList = stats.length
    ? el(
        'dl',
        { className: 'modal__stats' },
        stats.map(({ label, value }) =>
          el('div', { className: 'modal__stat' }, [el('dt', { text: label }), el('dd', { text: value })]),
        ),
      )
    : null;

  const buttons = actions.map(({ label, variant = 'secondary', onClick }) =>
    el('button', {
      className: `btn btn--${variant} btn--lg`,
      text: label,
      attrs: { type: 'button' },
      on: {
        click: () => {
          sounds.click();
          closeModal();
          onClick?.();
        },
      },
    }),
  );

  const dialog = el('div', { className: `modal modal--${tone}`, attrs: { role: 'dialog', 'aria-modal': 'true' } }, [
    emoji ? el('div', { className: 'modal__emoji', text: emoji, attrs: { 'aria-hidden': 'true' } }) : null,
    el('h2', { className: 'modal__title', text: title }),
    starRow,
    message ? el('p', { className: 'modal__message', text: message }) : null,
    statList,
    el('div', { className: 'modal__actions' }, buttons),
  ]);

  const overlay = el('div', { className: 'modal-overlay' }, [dialog]);

  // Captura Enter/Espacio para que no lleguen al juego mientras el modal está abierto.
  function handleKeyDown(event) {
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      event.stopPropagation();
      if (escapeIndex !== undefined && !event.repeat) buttons[escapeIndex]?.click();
      return;
    }
    if (!dialog.contains(document.activeElement)) buttons[0]?.focus();
    if (['Space', 'Enter', 'NumpadEnter'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
      // Evita reiniciar sin querer si la niña seguía pulsando "saltar" al perder.
      const isArmed = performance.now() - openedAt > keyArmDelayMs;
      if (isArmed && !event.repeat) document.activeElement?.click();
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
      const step = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 1;
      const current = buttons.indexOf(document.activeElement);
      buttons[(current + step + buttons.length) % buttons.length]?.focus();
      return;
    }
    event.stopPropagation();
  }

  const openedAt = performance.now();
  window.addEventListener('keydown', handleKeyDown, true);
  document.body.append(overlay);
  activeModal = { overlay, handleKeyDown };
  requestAnimationFrame(() => buttons[0]?.focus());
  return closeModal;
}

export function isModalOpen() {
  return activeModal !== null;
}
