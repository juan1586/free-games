import { el, navigate } from './dom.js';
import {
  AVATARS,
  MAX_NAME_LENGTH,
  createPlayer,
  deletePlayer,
  editPlayer,
  getActivePlayer,
  getPlayers,
  getStatsId,
  sanitizeName,
} from '../core/player.js';
import { sounds } from '../core/audio.js';
import { trackEvent } from '../core/analytics.js';
import { showModal } from './modal.js';

/** Pantalla para crear un jugador nuevo o editar el activo (mode: 'create' | 'edit'). */
export function mountProfile(root, { mode }) {
  const editing = mode === 'edit' ? getActivePlayer() : null;
  let selectedAvatar = editing?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)];

  const preview = el('div', { className: 'profile__preview', text: selectedAvatar, attrs: { 'aria-hidden': 'true' } });

  const nameInput = el('input', {
    className: 'text-input',
    attrs: {
      id: 'player-name',
      type: 'text',
      maxlength: MAX_NAME_LENGTH,
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'Tu nombre',
      required: true,
    },
  });
  nameInput.value = editing?.name ?? '';

  const counter = el('span', { className: 'field__counter' });
  const error = el('p', { className: 'field__error', attrs: { role: 'alert' } });

  function updateCounter() {
    counter.textContent = `${nameInput.value.length}/${MAX_NAME_LENGTH}`;
    error.textContent = '';
  }
  nameInput.addEventListener('input', updateCounter);
  updateCounter();

  const avatarButtons = AVATARS.map((avatar) =>
    el('button', {
      className: `avatar-option ${avatar === selectedAvatar ? 'is-selected' : ''}`,
      text: avatar,
      attrs: { type: 'button', 'aria-pressed': String(avatar === selectedAvatar), 'aria-label': `Avatar ${avatar}` },
      on: {
        click: (event) => {
          sounds.click();
          selectedAvatar = avatar;
          preview.textContent = avatar;
          preview.classList.remove('is-bouncing');
          void preview.offsetWidth;
          preview.classList.add('is-bouncing');
          avatarButtons.forEach((button) => {
            const isSelected = button === event.currentTarget;
            button.classList.toggle('is-selected', isSelected);
            button.setAttribute('aria-pressed', String(isSelected));
          });
        },
      },
    }),
  );

  function handleSubmit(event) {
    event.preventDefault();
    const name = sanitizeName(nameInput.value);
    if (!name) {
      error.textContent = '¡Escribe tu nombre para empezar!';
      nameInput.focus();
      return;
    }
    sounds.coin();
    if (editing) editPlayer(editing.id, { name, avatar: selectedAvatar });
    else {
      createPlayer(name, selectedAvatar);
      trackEvent('jugador-creado', 'Jugador nuevo creado');
    }
    navigate('/');
  }

  function handleDelete() {
    showModal({
      emoji: '🗑️',
      title: `¿Borrar a ${editing.name}?`,
      message: 'Se perderán sus récords y mundos desbloqueados.',
      actions: [
        { label: 'No, mejor no', variant: 'primary' },
        {
          label: 'Sí, borrar',
          variant: 'danger',
          onClick: () => {
            deletePlayer(editing.id);
            navigate(getPlayers().length ? '/' : '/perfil');
          },
        },
      ],
    });
  }

  const hasPlayers = getPlayers().length > 0;

  const form = el('form', { className: 'card profile', attrs: { novalidate: true }, on: { submit: handleSubmit } }, [
    preview,
    el('h1', { className: 'profile__title', text: editing ? 'Editar jugador' : hasPlayers ? 'Nuevo jugador' : '¡Hola! ¿Quién va a jugar?' }),
    el('div', { className: 'field' }, [
      el('label', { className: 'field__label', text: 'Nombre', attrs: { for: 'player-name' } }),
      nameInput,
      counter,
      error,
    ]),
    el('fieldset', { className: 'field' }, [
      el('legend', { className: 'field__label', text: 'Elige tu avatar' }),
      el('div', { className: 'avatar-grid' }, avatarButtons),
    ]),
    el('div', { className: 'profile__actions' }, [
      hasPlayers
        ? el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: () => navigate('/') } })
        : null,
      editing
        ? el('button', { className: 'btn btn--danger', text: 'Borrar', attrs: { type: 'button' }, on: { click: handleDelete } })
        : null,
      el('button', { className: 'btn btn--primary btn--lg', text: editing ? 'Guardar' : '¡Listo!', attrs: { type: 'submit' } }),
    ]),
    editing ? el('p', { className: 'profile__stats-id', text: `Jugador nº ${getStatsId()}` }) : null,
  ]);

  root.append(el('main', { className: 'page page--center' }, [form]));
  nameInput.focus();
}
