import { el, navigate } from '../../ui/dom.js';
import { MAX_NAME_LENGTH, getGameData, sanitizeName, updateGameData } from '../../core/player.js';
import { sounds } from '../../core/audio.js';
import { setupCanvas } from '../../core/canvas.js';
import { DINOS, drawDino, getDino } from './dinos.js';
import { DINO_WORLDS } from './worlds.js';

const PREVIEW_WIDTH = 120;
const PREVIEW_HEIGHT = 100;

/** Pantalla previa al Dino: elegir dinosaurio, ponerle nombre y elegir mundo. */
export function mountDinoSetup(root) {
  const data = getGameData('dino');
  let selectedDino = getDino(data.dinoType);
  let selectedWorld = Math.min(data.unlockedWorld, DINO_WORLDS.length - 1);
  let animationId = null;

  const previews = [];

  const dinoButtons = DINOS.map((dino) => {
    const canvas = el('canvas', { className: 'dino-option__canvas', attrs: { 'aria-hidden': 'true' } });
    previews.push({ dino, ctx: setupCanvas(canvas, PREVIEW_WIDTH, PREVIEW_HEIGHT) });
    return el(
      'button',
      {
        className: `dino-option ${dino.id === selectedDino.id ? 'is-selected' : ''}`,
        attrs: { type: 'button', 'aria-pressed': String(dino.id === selectedDino.id), 'data-id': dino.id },
        style: { '--dino-color': dino.colors.body },
        on: { click: () => selectDino(dino) },
      },
      [canvas, el('strong', { text: dino.name }), el('small', { text: dino.description })],
    );
  });

  const nameInput = el('input', {
    className: 'text-input',
    attrs: { id: 'dino-name', type: 'text', maxlength: MAX_NAME_LENGTH, autocomplete: 'off', spellcheck: 'false' },
  });
  nameInput.value = sanitizeName(data.dinoName);
  nameInput.placeholder = selectedDino.name;

  function selectDino(dino) {
    sounds.click();
    selectedDino = dino;
    nameInput.placeholder = dino.name;
    dinoButtons.forEach((button) => {
      const isSelected = button.dataset.id === dino.id;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  const worldButtons = DINO_WORLDS.map((world, index) => {
    const isLocked = index > data.unlockedWorld;
    return el(
      'button',
      {
        className: `world-option world--${world.id} ${index === selectedWorld ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`,
        attrs: { type: 'button', disabled: isLocked, 'aria-pressed': String(index === selectedWorld), 'data-index': index },
        on: { click: () => selectWorld(index) },
      },
      [
        el('span', { className: 'world-option__emoji', text: isLocked ? '🔒' : world.emoji, attrs: { 'aria-hidden': 'true' } }),
        el('strong', { text: world.name }),
        el('small', { text: isLocked ? 'Bloqueado' : `Meta: ${world.goal} m` }),
      ],
    );
  });

  function selectWorld(index) {
    sounds.click();
    selectedWorld = index;
    worldButtons.forEach((button) => {
      const isSelected = Number(button.dataset.index) === index;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function startGame(event) {
    event.preventDefault();
    updateGameData('dino', { dinoType: selectedDino.id, dinoName: sanitizeName(nameInput.value) });
    sounds.coin();
    navigate(`/dino/jugar?mundo=${selectedWorld}`);
  }

  function animatePreviews(time) {
    const frame = time / 16;
    previews.forEach(({ dino, ctx }) => {
      ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      const isSelected = dino.id === selectedDino.id;
      const hop = isSelected ? Math.abs(Math.sin(time / 220)) * 10 : 0;
      drawDino(ctx, dino, { x: 34, y: 88 - hop, frame: isSelected ? frame : 0, onGround: hop < 1 });
    });
    animationId = requestAnimationFrame(animatePreviews);
  }

  const form = el('form', { className: 'setup', on: { submit: startGame } }, [
    el('header', { className: 'setup__header' }, [
      el('button', {
        className: 'icon-btn icon-btn--back',
        text: '⬅',
        attrs: { type: 'button', 'aria-label': 'Volver al menú' },
        on: { click: () => navigate('/') },
      }),
      el('h1', { className: 'setup__title', text: '🦖 Dino Corre' }),
    ]),
    el('section', { className: 'card setup__section' }, [
      el('h2', { className: 'setup__subtitle', text: '1. Elige tu dinosaurio' }),
      el('div', { className: 'dino-grid' }, dinoButtons),
    ]),
    el('section', { className: 'card setup__section' }, [
      el('h2', { className: 'setup__subtitle' }, [el('label', { text: '2. Ponle nombre', attrs: { for: 'dino-name' } })]),
      nameInput,
    ]),
    el('section', { className: 'card setup__section' }, [
      el('h2', { className: 'setup__subtitle', text: '3. Elige el mundo' }),
      el('div', { className: 'world-grid' }, worldButtons),
      el('p', { className: 'setup__note', text: 'Llega a la meta de un mundo para desbloquear el siguiente.' }),
    ]),
    el('button', { className: 'btn btn--primary btn--xl', text: '¡A correr! 🏃', attrs: { type: 'submit' } }),
  ]);

  root.append(el('main', { className: 'page' }, [form]));
  animationId = requestAnimationFrame(animatePreviews);

  return () => cancelAnimationFrame(animationId);
}
