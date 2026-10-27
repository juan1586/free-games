import { el, navigate } from '../../ui/dom.js';
import { getGameData, updateGameData } from '../../core/player.js';
import { sounds } from '../../core/audio.js';
import { trackEvent } from '../../core/analytics.js';
import { OUTFIT_SLOTS, SKIN_TONES, currentOutfit, isOwned } from './outfits.js';
import { PARK_WORLDS, UPCOMING_WORLDS, isWorldOpen } from './worlds.js';
import { ALL_MISSIONS_BONUS, MISSION_COINS, describeMissions, todaysMissions } from './missions.js';

/** Pantalla previa al parque: vestirse, comprar ropa, ver misiones, atracciones y granos dorados. */
export function mountParkSetup(root) {
  let data = getGameData('park');
  const refreshers = [];
  const refresh = () => {
    data = getGameData('park');
    refreshers.forEach((update) => update());
  };

  // ---------- Vista previa del personaje (con CSS) ----------

  const hatNode = el('span', { className: 'park-avatar__hat', attrs: { 'aria-hidden': 'true' } });
  const extraNode = el('span', { className: 'park-avatar__extra', attrs: { 'aria-hidden': 'true' } });
  const preview = el('div', { className: 'park-avatar', attrs: { role: 'img', 'aria-label': 'Tu personaje' } }, [
    hatNode,
    el('span', { className: 'park-avatar__head' }),
    el('span', { className: 'park-avatar__arm park-avatar__arm--left' }),
    el('span', { className: 'park-avatar__body' }, [el('span', { className: 'park-avatar__stripe' })]),
    el('span', { className: 'park-avatar__arm park-avatar__arm--right' }),
    el('span', { className: 'park-avatar__leg park-avatar__leg--left' }),
    el('span', { className: 'park-avatar__leg park-avatar__leg--right' }),
    extraNode,
  ]);
  refreshers.push(() => {
    const look = currentOutfit(data);
    preview.style.setProperty('--skin', look.skin.color);
    preview.style.setProperty('--shirt', look.shirt.color);
    preview.style.setProperty('--stripe', look.shirt.stripe ?? look.shirt.color);
    preview.style.setProperty('--pants', look.pants.color);
    hatNode.textContent = look.hat.kind === 'none' ? '' : look.hat.icon;
    extraNode.textContent = look.extra.kind === 'none' ? '' : look.extra.icon;
  });

  // ---------- Tienda y vestidor ----------

  const walletPill = el('span', { className: 'star-pill shop__wallet' });
  refreshers.push(() => (walletPill.textContent = `🪙 ${data.coins}`));

  function wear(slot, id) {
    updateGameData('park', { outfit: { ...data.outfit, [slot]: id } });
  }

  function buyOrWear(slot, item) {
    if (data.outfit?.[slot] === item.id && isOwned(data, item)) return;
    if (isOwned(data, item)) {
      sounds.click();
      wear(slot, item.id);
    } else {
      if (data.coins < item.price) return;
      sounds.levelUp();
      updateGameData('park', { coins: data.coins - item.price, owned: [...data.owned, item.id], outfit: { ...data.outfit, [slot]: item.id } });
      trackEvent(`parque-tienda-${item.id}`, 'Parque · compra en la tienda');
    }
    refresh();
  }

  function renderShopItem(slot, item) {
    const price = el('small', { className: 'shop-item__price' });
    const icon = item.color
      ? el('span', { className: 'shop-item__icon park-swatch', text: item.icon, style: { '--swatch': item.color }, attrs: { 'aria-hidden': 'true' } })
      : el('span', { className: 'shop-item__icon', text: item.icon, attrs: { 'aria-hidden': 'true' } });
    const button = el(
      'button',
      { className: 'shop-item', attrs: { type: 'button', title: item.name }, on: { click: () => buyOrWear(slot, item) } },
      [icon, el('strong', { text: item.name }), price],
    );
    refreshers.push(() => {
      const owned = isOwned(data, item);
      const isWorn = currentOutfit(data)[slot].id === item.id;
      button.disabled = !owned && data.coins < item.price;
      button.classList.toggle('is-selected', isWorn);
      button.classList.toggle('is-owned', owned);
      button.setAttribute('aria-pressed', String(isWorn));
      price.textContent = isWorn ? '✅ Puesto' : owned ? 'Ponérmelo' : `🪙 ${item.price}`;
    });
    return button;
  }

  const skinButtons = SKIN_TONES.map((tone) => {
    const button = el('button', {
      className: 'park-skin',
      style: { background: tone.color },
      attrs: { type: 'button', title: tone.name, 'aria-label': `Piel ${tone.name}` },
      on: {
        click: () => {
          sounds.click();
          wear('skin', tone.id);
          refresh();
        },
      },
    });
    refreshers.push(() => {
      const isSelected = currentOutfit(data).skin.id === tone.id;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    return button;
  });

  const wardrobe = el('section', { className: 'card setup__section park-wardrobe' }, [
    el('div', { className: 'shop__header' }, [el('h2', { className: 'setup__subtitle', text: '2. Vístete 👗' }), walletPill]),
    el('div', { className: 'park-wardrobe__layout' }, [
      el('div', { className: 'park-wardrobe__preview' }, [preview, el('div', { className: 'park-skins' }, skinButtons)]),
      el(
        'div',
        { className: 'park-wardrobe__shop' },
        OUTFIT_SLOTS.flatMap(({ slot, title, items }) => [
          el('h3', { className: 'world-group__title', text: title }),
          el('div', { className: 'shop-grid' }, items.map((item) => renderShopItem(slot, item))),
        ]),
      ),
    ]),
    el('p', { className: 'setup__note', text: 'Gana monedas recogiéndolas en el parque, montando en las atracciones y cumpliendo misiones.' }),
  ]);

  // ---------- Misiones del día ----------

  const missions = describeMissions(todaysMissions(data));
  const missionSection = el('section', { className: 'card setup__section' }, [
    el('h2', { className: 'setup__subtitle', text: '3. Misiones de hoy 📋' }),
    el(
      'ul',
      { className: 'park-mission-list' },
      missions.map((mission) =>
        el('li', { className: mission.done ? 'is-done' : '' }, [
          el('span', { className: 'park-mission-list__icon', text: mission.done ? '✅' : mission.icon, attrs: { 'aria-hidden': 'true' } }),
          el('span', { text: mission.text }),
          el('strong', { text: mission.done ? '¡Hecho!' : `${mission.progress}/${mission.goal}` }),
        ]),
      ),
    ),
    el('p', { className: 'setup__note', text: `Cada misión da ${MISSION_COINS} 🪙 y, si cumples las 3, ${ALL_MISSIONS_BONUS} 🪙 más. ¡Mañana habrá otras!` }),
  ]);

  // ---------- Parques: elegir uno y ver sus atracciones y tesoros ----------

  let selectedWorld = Math.min(data.lastWorld ?? 0, PARK_WORLDS.length - 1);
  if (!isWorldOpen(PARK_WORLDS[selectedWorld], data)) selectedWorld = 0;

  const worldButtons = PARK_WORLDS.map((world, index) => {
    const isOpen = isWorldOpen(world, data);
    return el(
      'button',
      {
        className: `world-option park-world ${isOpen ? '' : 'is-locked'}`,
        attrs: { type: 'button', disabled: !isOpen, 'data-index': index },
        on: { click: () => selectWorld(index) },
      },
      [
        el('span', { className: 'world-option__emoji', text: isOpen ? world.emoji : '🔒', attrs: { 'aria-hidden': 'true' } }),
        el('strong', { text: world.name }),
        el('small', { text: isOpen ? world.description : world.unlock.hint }),
      ],
    );
  });
  const upcomingCards = UPCOMING_WORLDS.map((world) =>
    el('div', { className: 'world-option is-locked park-world' }, [
      el('span', { className: 'world-option__emoji', text: world.emoji, attrs: { 'aria-hidden': 'true' } }),
      el('strong', { text: world.name }),
      el('small', { text: '🔒 Próximamente' }),
    ]),
  );

  const details = el('section', { className: 'card setup__section' });
  const treasurePill = el('span', { className: 'star-pill' });

  function renderDetails() {
    const world = PARK_WORLDS[selectedWorld];
    const { treasure } = world;
    const found = data[treasure.key] ?? [];
    const rideCards = world.rides.map((ride) => {
      const count = data.ridesDone[ride.id] ?? 0;
      return el('div', { className: `park-ride-card ${count ? 'is-done' : ''}` }, [
        el('span', { className: 'park-ride-card__emoji', text: ride.emoji, attrs: { 'aria-hidden': 'true' } }),
        el('strong', { text: ride.name }),
        el('small', { text: ride.description }),
        el('span', { className: 'park-ride-card__count', text: count ? `🎟️ ${count} ${count === 1 ? 'viaje' : 'viajes'}` : '¡Aún no!' }),
      ]);
    });
    const slots = treasure.items.map((item) =>
      el('li', {
        className: `park-bean ${found.includes(item.id) ? 'is-found' : ''}`,
        text: found.includes(item.id) ? treasure.icon : '❔',
        attrs: { title: found.includes(item.id) ? '¡Encontrado!' : `Pista: ${item.hint}` },
      }),
    );
    const next = treasure.items.find((item) => !found.includes(item.id));
    details.replaceChildren(
      el('h2', { className: 'setup__subtitle', text: `4. Atracciones de ${world.name} ${world.emoji}` }),
      el('div', { className: 'park-ride-grid' }, rideCards),
      el('h3', { className: 'world-group__title', text: `${treasure.icon} ${treasure.name}: ${found.length}/${treasure.items.length}` }),
      el('ul', { className: 'park-beans' }, slots),
      el('p', { className: 'setup__note', text: next ? `Pista: ${next.hint.toLowerCase()}…` : `¡Encontraste todos los ${treasure.name.toLowerCase()}! 🏆` }),
    );
    treasurePill.textContent = `${treasure.icon} ${found.length}/${treasure.items.length}`;
    treasurePill.title = treasure.name;
    worldButtons.forEach((button, index) => {
      button.classList.toggle('is-selected', index === selectedWorld);
      button.setAttribute('aria-pressed', String(index === selectedWorld));
    });
  }

  function selectWorld(index) {
    sounds.click();
    selectedWorld = index;
    updateGameData('park', { lastWorld: index });
    data = getGameData('park');
    renderDetails();
  }

  const worldSection = el('section', { className: 'card setup__section' }, [
    el('h2', { className: 'setup__subtitle', text: '1. Elige el parque 🗺️' }),
    el('div', { className: 'world-grid' }, [...worldButtons, ...upcomingCards]),
  ]);

  const page = el('div', { className: 'setup' }, [
    el('header', { className: 'setup__header' }, [
      el('button', {
        className: 'icon-btn icon-btn--back',
        text: '⬅',
        attrs: { type: 'button', 'aria-label': 'Volver al menú' },
        on: { click: () => navigate('/') },
      }),
      el('h1', { className: 'setup__title', text: '🎡 Parque Mágico' }),
      treasurePill,
    ]),
    worldSection,
    wardrobe,
    missionSection,
    details,
    el('div', { className: 'dino-playbar' }, [
      el('button', {
        className: 'btn btn--primary btn--xl',
        text: '¡Entrar al parque! 🎢',
        attrs: { type: 'button' },
        on: {
          click: () => {
            sounds.coin();
            navigate(`/parque/jugar?mundo=${selectedWorld}`);
          },
        },
      }),
      el('button', {
        className: 'btn btn--secondary btn--lg',
        text: '👭 Jugar con amigas',
        attrs: { type: 'button' },
        on: {
          click: () => {
            sounds.click();
            navigate(`/parque/amigos?mundo=${selectedWorld}`);
          },
        },
      }),
    ]),
  ]);

  renderDetails();
  refresh();
  root.append(el('main', { className: 'page' }, [page]));
}
