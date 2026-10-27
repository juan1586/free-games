import { el, navigate } from './dom.js';
import { sounds } from '../core/audio.js';
import {
  CODE_LENGTH,
  HOST_ID,
  MAX_PLAYERS,
  createRoom,
  friendlyError,
  getSession,
  joinRoom,
  leaveRoom,
  lockRoom,
  normalizeCode,
  onDisconnect,
  onLeave,
  onMessage,
  preloadRace,
  send,
} from '../core/race.js';
import { createHello, parsePlayer, parseRoster } from '../core/raceMatch.js';
import { trackEvent } from '../core/analytics.js';

/**
 * Sala de espera de una carrera (común a todos los juegos): crear una sala y compartir el código,
 * o unirse con un código. Caben hasta MAX_PLAYERS jugadores.
 *
 * game: id del juego en la conexión ('geo', 'dino'). hostConfig: lo que elige la anfitriona (nivel, mundo…).
 * describeConfig(config): texto para mostrar la configuración. parseConfig(raw): valida la que llega.
 * look / parseLook: apariencia propia de cada juego. routeFor(config): ruta del juego en modo carrera.
 */
export function mountRaceLobby(root, { game, title, backPath, hostConfig, describeConfig, parseConfig, look, parseLook, routeFor }) {
  let goingToRace = false;
  let unsubscribers = [];
  const me = parsePlayer(createHello(look), parseLook);
  const body = el('div', { className: 'race-lobby' });
  const status = el('p', { className: 'race-lobby__status', attrs: { role: 'status', 'aria-live': 'polite' } });

  const setStatus = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  const players = () => getSession()?.meta.players ?? [];

  function listen() {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [onMessage(handleMessage), onLeave(handleLeave), onDisconnect(handleDisconnect)];
  }

  // ---------- Mensajes ----------

  function broadcastRoom() {
    const session = getSession();
    send({ type: 'roster', players: session.meta.players });
    send({ type: 'room', config: hostConfig });
  }

  function handleMessage(message) {
    const session = getSession();
    if (!session) return;
    if (session.role === 'host') {
      if (message.type !== 'hello') return;
      const player = parsePlayer(message, parseLook);
      if (!player) return;
      session.meta.players = [...players().filter((other) => other.id !== message.from), { id: message.from, ...player }];
      sounds.coin();
      broadcastRoom();
      renderHost();
      return;
    }
    if (message.from !== HOST_ID) return;
    if (message.type === 'roster') {
      const roster = parseRoster(message, parseLook);
      if (roster) session.meta.players = roster;
    }
    if (message.type === 'room' || message.type === 'start') {
      const config = parseConfig(message.config);
      if (config) session.meta.config = config;
    }
    if (message.type === 'start' && session.meta.config) {
      goToRace(session.meta.config);
      return;
    }
    renderGuest();
  }

  function handleLeave(id) {
    const session = getSession();
    if (!session) return;
    const leaving = players().find((player) => player.id === id);
    session.meta.players = players().filter((player) => player.id !== id);
    if (leaving) setStatus(`${leaving.name} se fue 👋`, 'warn');
    if (session.role === 'host') {
      broadcastRoom();
      renderHost();
    } else {
      renderGuest();
    }
  }

  function handleDisconnect() {
    leaveRoom();
    renderChoice();
    setStatus('La sala se cerró 👋', 'warn');
  }

  function goToRace(config) {
    goingToRace = true;
    navigate(routeFor(config));
  }

  // ---------- Pantallas ----------

  function playerSlots() {
    const list = players();
    const myId = getSession()?.myId;
    return el(
      'ul',
      { className: 'race-players', attrs: { 'aria-label': `Jugadores: ${list.length} de ${MAX_PLAYERS}` } },
      Array.from({ length: MAX_PLAYERS }, (_, index) => {
        const player = list[index];
        if (!player) {
          return el('li', { className: 'race-player is-empty' }, [
            el('span', { className: 'race-player__avatar', text: '❔', attrs: { 'aria-hidden': 'true' } }),
            el('small', { text: 'Libre' }),
          ]);
        }
        return el('li', { className: `race-player ${player.id === myId ? 'is-me' : ''}` }, [
          el('span', { className: 'race-player__avatar', text: player.avatar, attrs: { 'aria-hidden': 'true' } }),
          el('strong', { text: player.name }),
          el('small', { text: player.id === myId ? 'Tú' : player.id === HOST_ID ? 'Creó la sala' : '¡En la sala!' }),
        ]);
      }),
    );
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
      el('p', { className: 'setup__note', text: describeConfig(hostConfig) }),
      el('button', { className: 'btn btn--primary btn--lg', text: 'Crear sala 🏁', attrs: { type: 'button' }, on: { click: handleCreate } }),
      el('small', { className: 'setup__note', text: 'Para cambiar lo que se juega, vuelve atrás y elígelo.' }),
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
  }

  function renderHost() {
    const session = getSession();
    if (!session) return;
    const count = players().length;
    const isFull = count >= MAX_PLAYERS;
    body.replaceChildren(
      el('section', { className: 'card race-card race-card--wide' }, [
        el('h2', { className: 'setup__subtitle', text: 'Comparte este código para jugar juntos' }),
        el('p', { className: 'race-code', text: session.code, attrs: { 'aria-label': `Código ${session.code.split('').join(' ')}` } }),
        el('p', { className: 'setup__note', text: describeConfig(hostConfig) }),
        playerSlots(),
        el('p', {
          className: count < 2 ? 'race-lobby__waiting' : 'setup__note',
          text: count < 2 ? 'Esperando a que alguien se una…' : isFull ? '¡Sala llena! Ya pueden empezar.' : `Pueden entrar hasta ${MAX_PLAYERS}, o empezar ya.`,
        }),
        el('button', {
          className: 'btn btn--primary btn--xl',
          text: '¡Empezar carrera! 🏁',
          attrs: { type: 'button', disabled: count < 2 },
          on: { click: startRace },
        }),
        el('button', { className: 'btn btn--secondary', text: 'Cancelar', attrs: { type: 'button' }, on: { click: cancel } }),
      ]),
    );
  }

  function renderGuest() {
    const session = getSession();
    if (!session) return;
    const config = session.meta.config;
    const host = players().find((player) => player.id === HOST_ID);
    body.replaceChildren(
      el('section', { className: 'card race-card race-card--wide' }, [
        el('h2', { className: 'setup__subtitle', text: '¡Estás dentro! 🎉' }),
        config ? el('p', { className: 'setup__note', text: describeConfig(config) }) : null,
        playerSlots(),
        el('p', { className: 'race-lobby__waiting', text: host ? `Esperando a que ${host.name} empiece…` : 'Conectando…' }),
        el('button', { className: 'btn btn--secondary', text: 'Salir de la sala', attrs: { type: 'button' }, on: { click: cancel } }),
      ]),
    );
  }

  function renderBusy(text) {
    body.replaceChildren(el('section', { className: 'card race-card race-card--wide' }, [el('p', { className: 'race-lobby__waiting', text })]));
  }

  // ---------- Acciones ----------

  async function handleCreate() {
    sounds.click();
    setStatus('');
    renderBusy('Abriendo la sala…');
    try {
      await createRoom(game);
      getSession().meta.players = [{ id: HOST_ID, ...me }];
      trackEvent(`carrera-creada-${game}`, `Sala creada (${game})`);
      listen();
      renderHost();
    } catch (error) {
      if (error?.type === 'cancelled') return;
      renderChoice();
      setStatus(friendlyError(error), 'error');
    }
  }

  async function handleJoin(event, code) {
    event.preventDefault();
    if (normalizeCode(code).length !== CODE_LENGTH) return;
    sounds.click();
    setStatus('');
    renderBusy('Buscando la sala…');
    try {
      await joinRoom(game, code, {
        onRetry: (attempt, maxTries) => renderBusy(`Buscando la sala… (intento ${attempt} de ${maxTries})`),
      });
      trackEvent(`carrera-unida-${game}`, `Alguien se unió (${game})`);
      listen();
      send(createHello(look));
      renderGuest();
    } catch (error) {
      if (error?.type === 'cancelled') return;
      renderChoice();
      setStatus(friendlyError(error), 'error');
    }
  }

  function startRace() {
    const session = getSession();
    if (!session || players().length < 2) return;
    sounds.coin();
    lockRoom(true);
    session.meta.config = hostConfig;
    send({ type: 'roster', players: session.meta.players });
    send({ type: 'start', config: hostConfig });
    trackEvent(`carrera-empezada-${game}-${players().length}j`, `Carrera empezada (${game}, ${players().length} jugadores)`);
    goToRace(hostConfig);
  }

  function cancel() {
    sounds.click();
    leaveRoom();
    setStatus('');
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
            on: { click: () => navigate(backPath) },
          }),
          el('h1', { className: 'setup__title', text: title }),
        ]),
        body,
        status,
        el('p', {
          className: 'setup__note race-lobby__note',
          text: `De 2 a ${MAX_PLAYERS} jugadores. Cada quien juega en su tablet o compu, con internet. Solo se comparte tu nombre, tu avatar y tu personaje.`,
        }),
      ]),
    ]),
  );

  leaveRoom();
  preloadRace();
  renderChoice();

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    if (!goingToRace) leaveRoom();
  };
}
