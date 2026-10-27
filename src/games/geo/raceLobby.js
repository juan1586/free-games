import { el, navigate } from '../../ui/dom.js';
import { sounds } from '../../core/audio.js';
import { getGameData } from '../../core/player.js';
import {
  CODE_LENGTH,
  createRoom,
  friendlyError,
  getSession,
  joinRoom,
  leaveRoom,
  normalizeCode,
  onConnect,
  onDisconnect,
  onMessage,
  send,
} from '../../core/race.js';
import { GEO_LEVELS } from './levels.js';
import { getSpeed } from './physics.js';
import { RACE_GAME, createHello, parseRaceMessage } from './race.js';

const levelTitle = (levelIndex, speedId) => {
  const level = GEO_LEVELS[levelIndex];
  const speed = getSpeed(speedId);
  return `${level.world.emoji} ${level.label} ${level.name} · ${speed.icon} ${speed.label}`;
};

/** Ruta del juego en modo carrera. */
export const raceRoute = (levelIndex) => `/geo/jugar?nivel=${levelIndex}&carrera=1`;

/**
 * Sala de espera: crear una sala (muestra el código) o unirse con un código.
 * levelIndex: nivel elegido en la pantalla de Salto Geométrico (solo cuenta para la anfitriona).
 */
export function mountGeoRaceLobby(root, { levelIndex }) {
  const data = getGameData('geo');
  const hostConfig = {
    levelIndex: Math.max(0, Math.min(levelIndex, data.unlockedLevel, GEO_LEVELS.length - 1)),
    speedId: getSpeed(data.speed).id,
  };
  let goingToRace = false;
  let unsubscribers = [];
  const body = el('div', { className: 'race-lobby' });
  const status = el('p', { className: 'race-lobby__status', attrs: { role: 'status', 'aria-live': 'polite' } });

  const setStatus = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  function listen() {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [
      onConnect(() => send(createHello())),
      onMessage(handleMessage),
      onDisconnect(handleDisconnect),
    ];
  }

  function handleMessage(raw) {
    const message = parseRaceMessage(raw);
    const session = getSession();
    if (!message || !session) return;
    if (message.type === 'hello') {
      session.meta.rival = message;
      sounds.coin();
      if (session.role === 'host') {
        send({ type: 'room', ...hostConfig });
        renderHostReady();
      } else {
        renderGuestWaiting();
      }
    }
    if (message.type === 'room' && session.role === 'guest') {
      session.meta.config = message;
      renderGuestWaiting();
    }
    if (message.type === 'start' && session.role === 'guest') {
      session.meta.config = message;
      goToRace(message.levelIndex);
    }
  }

  function handleDisconnect() {
    const session = getSession();
    if (!session) return;
    const rivalName = session.meta.rival?.name ?? 'Tu rival';
    session.meta.rival = null;
    sounds.hit();
    if (session.role === 'host') {
      renderHostWaiting(session.code);
      setStatus(`${rivalName} se fue 👋. Puede volver a entrar con el mismo código.`, 'warn');
    } else {
      leaveRoom();
      renderChoice();
      setStatus('La sala se cerró 👋', 'warn');
    }
  }

  function goToRace(raceLevel) {
    goingToRace = true;
    navigate(raceRoute(raceLevel));
  }

  // ---------- Pantallas ----------

  function rivalCard(rival) {
    return el('div', { className: 'race-rival' }, [
      el('span', { className: 'race-rival__avatar', text: rival.avatar, attrs: { 'aria-hidden': 'true' } }),
      el('strong', { text: rival.name }),
      el('small', { text: '¡En la sala! 🏁' }),
    ]);
  }

  function renderChoice() {
    const codeInput = el('input', {
      className: 'text-input race-code-input',
      attrs: {
        type: 'text',
        inputmode: 'text',
        autocomplete: 'off',
        autocapitalize: 'characters',
        spellcheck: 'false',
        maxlength: CODE_LENGTH,
        placeholder: '····',
        'aria-label': 'Código de la sala',
      },
    });
    const joinButton = el('button', { className: 'btn btn--primary btn--lg', text: 'Unirme 🤝', attrs: { type: 'submit', disabled: true } });
    codeInput.addEventListener('input', () => {
      codeInput.value = normalizeCode(codeInput.value);
      joinButton.disabled = codeInput.value.length !== CODE_LENGTH;
    });

    const createCard = el('section', { className: 'card race-card' }, [
      el('span', { className: 'race-card__emoji', text: '🏠', attrs: { 'aria-hidden': 'true' } }),
      el('h2', { className: 'setup__subtitle', text: 'Crear sala' }),
      el('p', { className: 'setup__note', text: levelTitle(hostConfig.levelIndex, hostConfig.speedId) }),
      el('button', { className: 'btn btn--primary btn--lg', text: 'Crear sala 🏁', attrs: { type: 'button' }, on: { click: handleCreate } }),
      el('small', { className: 'setup__note', text: 'Para cambiar el nivel o la velocidad, vuelve atrás y elígelos.' }),
    ]);

    const joinCard = el(
      'form',
      { className: 'card race-card', attrs: { novalidate: true }, on: { submit: (event) => handleJoin(event, codeInput.value) } },
      [
        el('span', { className: 'race-card__emoji', text: '🤝', attrs: { 'aria-hidden': 'true' } }),
        el('h2', { className: 'setup__subtitle', text: 'Unirme a una sala' }),
        el('p', { className: 'setup__note', text: 'Escribe el código que te compartieron.' }),
        codeInput,
        joinButton,
      ],
    );
    body.replaceChildren(el('div', { className: 'race-choice' }, [createCard, joinCard]));
    setStatus('');
  }

  function renderHostWaiting(code) {
    body.replaceChildren(
      el('section', { className: 'card race-card race-card--wide' }, [
        el('h2', { className: 'setup__subtitle', text: 'Comparte este código para jugar juntos' }),
        el('p', { className: 'race-code', text: code, attrs: { 'aria-label': `Código ${code.split('').join(' ')}` } }),
        el('p', { className: 'setup__note', text: levelTitle(hostConfig.levelIndex, hostConfig.speedId) }),
        el('p', { className: 'race-lobby__waiting', text: 'Esperando a que alguien se una…' }),
        el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: cancel } }),
      ]),
    );
    setStatus('');
  }

  function renderHostReady() {
    const session = getSession();
    if (!session?.meta.rival) return;
    session.meta.config = { type: 'start', ...hostConfig };
    body.replaceChildren(
      el('section', { className: 'card race-card race-card--wide' }, [
        el('h2', { className: 'setup__subtitle', text: `¡${session.meta.rival.name} ya está aquí!` }),
        rivalCard(session.meta.rival),
        el('p', { className: 'setup__note', text: levelTitle(hostConfig.levelIndex, hostConfig.speedId) }),
        el('button', {
          className: 'btn btn--primary btn--xl',
          text: '¡Empezar carrera! 🏁',
          attrs: { type: 'button' },
          on: {
            click: () => {
              sounds.coin();
              send(session.meta.config);
              goToRace(hostConfig.levelIndex);
            },
          },
        }),
        el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: cancel } }),
      ]),
    );
    setStatus('');
  }

  function renderGuestWaiting() {
    const session = getSession();
    const { rival, config } = session?.meta ?? {};
    body.replaceChildren(
      el('section', { className: 'card race-card race-card--wide' }, [
        el('h2', { className: 'setup__subtitle', text: '¡Estás dentro! 🎉' }),
        rival ? rivalCard(rival) : null,
        config ? el('p', { className: 'setup__note', text: levelTitle(config.levelIndex, config.speedId) }) : null,
        el('p', { className: 'race-lobby__waiting', text: rival ? `Esperando a que ${rival.name} empiece…` : 'Conectando…' }),
        el('button', { className: 'btn btn--secondary', text: 'Salir de la sala', attrs: { type: 'button' }, on: { click: cancel } }),
      ]),
    );
    setStatus('');
  }

  function renderBusy(text) {
    body.replaceChildren(el('section', { className: 'card race-card race-card--wide' }, [el('p', { className: 'race-lobby__waiting', text })]));
  }

  // ---------- Acciones ----------

  async function handleCreate() {
    sounds.click();
    renderBusy('Abriendo la sala…');
    try {
      const code = await createRoom(RACE_GAME);
      listen();
      renderHostWaiting(code);
    } catch (error) {
      renderChoice();
      setStatus(friendlyError(error), 'error');
    }
  }

  async function handleJoin(event, code) {
    event.preventDefault();
    if (normalizeCode(code).length !== CODE_LENGTH) return;
    sounds.click();
    renderBusy('Buscando la sala…');
    try {
      await joinRoom(RACE_GAME, code);
      listen();
      send(createHello());
      renderGuestWaiting();
    } catch (error) {
      renderChoice();
      setStatus(friendlyError(error), 'error');
    }
  }

  function cancel() {
    sounds.click();
    leaveRoom();
    renderChoice();
  }

  root.append(
    el('main', { className: 'page' }, [
      el('div', { className: 'setup race-setup' }, [
        el('header', { className: 'setup__header' }, [
          el('button', {
            className: 'icon-btn icon-btn--back',
            text: '⬅',
            attrs: { type: 'button', 'aria-label': 'Volver' },
            on: { click: () => navigate('/geo') },
          }),
          el('h1', { className: 'setup__title', text: '🏁 Carrera con amigos' }),
        ]),
        body,
        status,
        el('p', {
          className: 'setup__note race-lobby__note',
          text: 'Cada quien juega en su tablet o compu, con internet. Solo se comparte tu nombre, tu avatar y tu figura.',
        }),
      ]),
    ]),
  );

  renderChoice();

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    if (!goingToRace) leaveRoom();
  };
}
