import { el, navigate } from '../../ui/dom.js';
import { MAX_NAME_LENGTH, getGameData, sanitizeName, updateGameData } from '../../core/player.js';
import { sounds } from '../../core/audio.js';
import { setupCanvas } from '../../core/canvas.js';
import { trackEvent } from '../../core/analytics.js';
import { DINOS, drawDino, getDino, isDinoUnlocked } from './dinos.js';
import { DINO_WORLDS, MEDALS, savedMedals } from './worlds.js';
import { DINO_TRAILS, HATS, getHat, isOwned } from './accessories.js';

const PREVIEW_WIDTH = 120;
const PREVIEW_HEIGHT = 100;

/** Pantalla previa al Dino: elegir dinosaurio, ponerle nombre, elegir mundo y gastar monedas en la tienda. */
export function mountDinoSetup(root) {
  let data = getGameData('dino');
  const firstDino = getDino(data.dinoType);
  let selectedDino = isDinoUnlocked(firstDino, data) ? firstDino : DINOS[0];
  let selectedWorld = Math.min(data.unlockedWorld, DINO_WORLDS.length - 1);
  let animationId = null;

  const previews = [];

  // ---------- Dinos ----------

  const dinoButtons = DINOS.map((dino) => {
    const isLocked = !isDinoUnlocked(dino, data);
    const canvas = el('canvas', { className: 'dino-option__canvas', attrs: { 'aria-hidden': 'true' } });
    previews.push({ dino, isLocked, ctx: setupCanvas(canvas, PREVIEW_WIDTH, PREVIEW_HEIGHT) });
    const unlockWorld = DINO_WORLDS.find((world) => world.id === dino.unlockWorld);
    return el(
      'button',
      {
        className: `dino-option ${dino.id === selectedDino.id ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`,
        attrs: { type: 'button', disabled: isLocked, 'aria-pressed': String(dino.id === selectedDino.id), 'data-id': dino.id },
        style: { '--dino-color': dino.colors.body },
        on: { click: () => selectDino(dino) },
      },
      [
        canvas,
        el('strong', { text: isLocked ? `🔒 ${dino.name}` : dino.name }),
        el('small', { text: isLocked ? `Llega a la meta de ${unlockWorld.emoji} ${unlockWorld.name}` : dino.description }),
      ],
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

  // ---------- Mundos ----------

  const worldButtons = DINO_WORLDS.map((world, index) => {
    const isLocked = index > data.unlockedWorld;
    const medals = savedMedals(data, index);
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
        el('small', { text: isLocked ? 'Bloqueado' : `${world.boss ? '👑 Jefe · ' : ''}Meta: ${world.goal} m` }),
        isLocked
          ? null
          : el(
              'span',
              { className: 'world-option__medals' },
              MEDALS.map((medal) =>
                el('span', {
                  className: medals.includes(medal.id) ? 'is-earned' : '',
                  text: medal.icon,
                  attrs: { title: `${medal.name}: ${medal.hint(world)}` },
                }),
              ),
            ),
      ].filter(Boolean),
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

  // ---------- Tienda ----------

  const walletPill = el('span', { className: 'star-pill shop__wallet' });
  const shopRefreshers = [];

  function renderShopItem(slot, item) {
    const price = el('small', { className: 'shop-item__price' });
    const button = el(
      'button',
      { className: 'shop-item', attrs: { type: 'button', title: item.name }, on: { click: () => buyOrWear(slot, item) } },
      [el('span', { className: 'shop-item__icon', text: item.icon, attrs: { 'aria-hidden': 'true' } }), el('strong', { text: item.name }), price],
    );
    shopRefreshers.push(() => {
      const owned = isOwned(data, item);
      const isWorn = data[slot] === item.id;
      button.disabled = !owned && data.coins < item.price;
      button.classList.toggle('is-selected', isWorn);
      button.classList.toggle('is-owned', owned);
      button.setAttribute('aria-pressed', String(isWorn));
      price.textContent = isWorn ? '✅ Puesto' : owned ? 'Ponérmelo' : `🪙 ${item.price}`;
    });
    return button;
  }

  function buyOrWear(slot, item) {
    if (data[slot] === item.id) return;
    if (isOwned(data, item)) {
      sounds.click();
      updateGameData('dino', { [slot]: item.id });
    } else {
      if (data.coins < item.price) return;
      sounds.levelUp();
      updateGameData('dino', { coins: data.coins - item.price, owned: [...data.owned, item.id], [slot]: item.id });
      trackEvent(`dino-tienda-${item.id}`, `Dino · compra en la tienda`);
    }
    data = getGameData('dino');
    refreshShop();
  }

  function refreshShop() {
    walletPill.textContent = `🪙 ${data.coins}`;
    shopRefreshers.forEach((refresh) => refresh());
  }

  const shopSection = el('section', { className: 'card setup__section' }, [
    el('div', { className: 'shop__header' }, [el('h2', { className: 'setup__subtitle', text: '4. Tienda 🛒' }), walletPill]),
    el('h3', { className: 'world-group__title', text: '🎩 Gorros y gafas' }),
    el('div', { className: 'shop-grid' }, HATS.map((item) => renderShopItem('hat', item))),
    el('h3', { className: 'world-group__title', text: '✨ Estelas' }),
    el('div', { className: 'shop-grid' }, DINO_TRAILS.map((item) => renderShopItem('trail', item))),
    el('p', { className: 'setup__note', text: 'Recoge monedas corriendo para comprar cosas nuevas.' }),
  ]);
  refreshShop();

  // ---------- Jugar ----------

  function saveChoice() {
    updateGameData('dino', { dinoType: selectedDino.id, dinoName: sanitizeName(nameInput.value) });
    sounds.coin();
  }

  function startGame(event) {
    event.preventDefault();
    saveChoice();
    navigate(`/dino/jugar?mundo=${selectedWorld}`);
  }

  function startRace() {
    saveChoice();
    navigate(`/dino/carrera?mundo=${selectedWorld}`);
  }

  function animatePreviews(time) {
    const frame = time / 16;
    const hat = isOwned(data, getHat(data.hat)) ? data.hat : 'none';
    previews.forEach(({ dino, isLocked, ctx }) => {
      ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      const isSelected = dino.id === selectedDino.id;
      const hop = isSelected ? Math.abs(Math.sin(time / 220)) * 10 : 0;
      ctx.globalAlpha = isLocked ? 0.35 : 1;
      drawDino(ctx, dino, { x: 34, y: 88 - hop, frame: isSelected ? frame : 0, onGround: hop < 1, hat: isLocked ? 'none' : hat });
      ctx.globalAlpha = 1;
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
      el('span', { className: 'star-pill', text: `🏆 ${data.raceWins}`, attrs: { title: 'Copas ganadas en carreras' } }),
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
      el('h3', { className: 'world-group__title', text: '🌱 Principiantes' }),
      el('div', { className: 'world-grid' }, worldButtons.filter((_, index) => !DINO_WORLDS[index].expert)),
      el('h3', { className: 'world-group__title world-group__title--expert', text: '🔥 Expertos' }),
      el('div', { className: 'world-grid' }, worldButtons.filter((_, index) => DINO_WORLDS[index].expert)),
      el('p', {
        className: 'setup__note',
        text: 'Llega a la meta para abrir el siguiente mundo. Medallas: 🥉 llegar a la meta · 🥈 llegar con muchas monedas · 🥇 correr el doble.',
      }),
    ]),
    shopSection,
    el('div', { className: 'dino-playbar' }, [
      el('button', { className: 'btn btn--primary btn--xl', text: '¡A correr! 🏃', attrs: { type: 'submit' } }),
      el('button', { className: 'btn btn--secondary btn--lg', text: '🏁 Carrera con amigos', attrs: { type: 'button' }, on: { click: startRace } }),
    ]),
  ]);

  root.append(el('main', { className: 'page' }, [form]));
  animationId = requestAnimationFrame(animatePreviews);

  return () => cancelAnimationFrame(animationId);
}
