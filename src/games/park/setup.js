import { el, navigate } from '../../ui/dom.js';
import { getGameData, updateGameData } from '../../core/player.js';
import { sounds } from '../../core/audio.js';
import { trackEvent } from '../../core/analytics.js';
import { OUTFIT_SLOTS, SKIN_TONES, currentOutfit, isOwned } from './outfits.js';
import { GOLDEN_BEANS, PARK_WORLDS, RIDES, UPCOMING_WORLDS } from './worlds.js';
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
    el('div', { className: 'shop__header' }, [el('h2', { className: 'setup__subtitle', text: '1. Vístete 👗' }), walletPill]),
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
    el('h2', { className: 'setup__subtitle', text: '2. Misiones de hoy 📋' }),
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

  // ---------- Atracciones y granos dorados ----------

  const rideCards = RIDES.map((ride) => {
    const count = data.ridesDone[ride.id] ?? 0;
    return el('div', { className: `park-ride-card ${count ? 'is-done' : ''}` }, [
      el('span', { className: 'park-ride-card__emoji', text: ride.emoji, attrs: { 'aria-hidden': 'true' } }),
      el('strong', { text: ride.name }),
      el('small', { text: ride.description }),
      el('span', { className: 'park-ride-card__count', text: count ? `🎟️ ${count} ${count === 1 ? 'viaje' : 'viajes'}` : '¡Aún no!' }),
    ]);
  });

  const beanSlots = GOLDEN_BEANS.map((bean) => {
    const found = data.goldenBeans.includes(bean.id);
    return el('li', {
      className: `park-bean ${found ? 'is-found' : ''}`,
      text: found ? '🌟' : '❔',
      attrs: { title: found ? '¡Encontrado!' : `Pista: ${bean.hint}` },
    });
  });
  const nextBean = GOLDEN_BEANS.find((bean) => !data.goldenBeans.includes(bean.id));

  const collection = el('section', { className: 'card setup__section' }, [
    el('h2', { className: 'setup__subtitle', text: '3. Atracciones del Parque del Café 🎡' }),
    el('div', { className: 'park-ride-grid' }, rideCards),
    el('h3', { className: 'world-group__title', text: `🌟 Granos de café dorados: ${data.goldenBeans.length}/${GOLDEN_BEANS.length}` }),
    el('ul', { className: 'park-beans' }, beanSlots),
    el('p', { className: 'setup__note', text: nextBean ? `Pista: ${nextBean.hint.toLowerCase()}…` : '¡Encontraste todos los granos dorados! 🏆' }),
  ]);

  const worldCards = [
    ...PARK_WORLDS.map((world) =>
      el('div', { className: 'world-option is-selected park-world' }, [
        el('span', { className: 'world-option__emoji', text: world.emoji, attrs: { 'aria-hidden': 'true' } }),
        el('strong', { text: world.name }),
        el('small', { text: world.description }),
      ]),
    ),
    ...UPCOMING_WORLDS.map((world) =>
      el('div', { className: 'world-option is-locked park-world' }, [
        el('span', { className: 'world-option__emoji', text: world.emoji, attrs: { 'aria-hidden': 'true' } }),
        el('strong', { text: world.name }),
        el('small', { text: '🔒 Próximamente' }),
      ]),
    ),
  ];

  const page = el('div', { className: 'setup' }, [
    el('header', { className: 'setup__header' }, [
      el('button', {
        className: 'icon-btn icon-btn--back',
        text: '⬅',
        attrs: { type: 'button', 'aria-label': 'Volver al menú' },
        on: { click: () => navigate('/') },
      }),
      el('h1', { className: 'setup__title', text: '🎡 Parque Mágico' }),
      el('span', { className: 'star-pill', text: `🌟 ${data.goldenBeans.length}/${GOLDEN_BEANS.length}`, attrs: { title: 'Granos dorados' } }),
    ]),
    wardrobe,
    missionSection,
    collection,
    el('section', { className: 'card setup__section' }, [
      el('h2', { className: 'setup__subtitle', text: '4. Mundos 🗺️' }),
      el('div', { className: 'world-grid' }, worldCards),
    ]),
    el('div', { className: 'dino-playbar' }, [
      el('button', {
        className: 'btn btn--primary btn--xl',
        text: '¡Entrar al parque! 🎢',
        attrs: { type: 'button' },
        on: {
          click: () => {
            sounds.coin();
            navigate('/parque/jugar?mundo=0');
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
            navigate('/parque/amigos');
          },
        },
      }),
    ]),
  ]);

  refresh();
  root.append(el('main', { className: 'page' }, [page]));
}
