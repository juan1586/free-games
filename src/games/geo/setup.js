import { el, navigate } from '../../ui/dom.js';
import { getGameData, updateGameData } from '../../core/player.js';
import { sounds } from '../../core/audio.js';
import { setupCanvas } from '../../core/canvas.js';
import { GEO_LEVELS, GEO_WORLDS } from './levels.js';
import { SPEEDS, getSpeed } from './physics.js';
import { SKIN_GROUPS, drawPlayer, resolveSkin } from './shapes.js';
import { ACHIEVEMENTS, MAX_STARS, countStars, findNewAchievements } from './achievements.js';

const PREVIEW_WIDTH = 260;
const PREVIEW_HEIGHT = 150;
const SHAPE_CANVAS_SIZE = 64;
const PREVIEW_MODES = ['cube', 'rocket', 'ball', 'plane'];
const PREVIEW_MODE_SECONDS = 2.4;
const COINS_PER_LEVEL = 3;

const levelProgress = (data, level) => data.levels[level.id] ?? { best: 0, completed: false, coins: [] };

/** Primer nivel desbloqueado sin terminar; si están todos, el último desbloqueado. */
function suggestedLevel(data) {
  const unlocked = GEO_LEVELS.slice(0, data.unlockedLevel + 1);
  return (unlocked.find((level) => !levelProgress(data, level).completed) ?? unlocked.at(-1)).index;
}

export function mountGeoSetup(root) {
  let data = getGameData('geo');
  let selectedLevel = suggestedLevel(data);
  let practice = false;
  let animationId = null;
  const shapeCanvases = [];

  const starPill = el('span', { className: 'star-pill' });
  const refreshStars = () => (starPill.textContent = `⭐ ${countStars(data)} / ${MAX_STARS}`);
  refreshStars();

  // ---------- Niveles ----------

  const levelButtons = GEO_LEVELS.map((level) => {
    const progress = levelProgress(data, level);
    const isLocked = level.index > data.unlockedLevel;
    const coins = Array.from({ length: COINS_PER_LEVEL }, (_, index) =>
      el('span', { className: progress.coins?.[index] ? 'is-earned' : '', text: '🪙' }),
    );
    return el(
      'button',
      {
        className: `geo-level ${isLocked ? 'is-locked' : ''} ${progress.completed ? 'is-done' : ''}`,
        attrs: { type: 'button', disabled: isLocked, 'data-index': level.index, 'aria-pressed': 'false' },
        on: { click: () => selectLevel(level.index) },
      },
      [
        el('span', { className: 'geo-level__top' }, [
          el('strong', { text: level.label }),
          el('span', { text: isLocked ? '🔒' : progress.completed ? '✅' : '' }),
        ]),
        el('span', { className: 'geo-level__name', text: level.name }),
        el('span', { className: 'geo-level__bar', attrs: { 'aria-label': `Récord ${progress.best}%` } }, [
          el('span', { style: { width: `${progress.best}%` } }),
        ]),
        el('span', { className: 'geo-level__coins', attrs: { 'aria-label': 'Monedas' } }, coins),
      ],
    );
  });

  function selectLevel(index) {
    sounds.click();
    selectedLevel = index;
    highlightLevel();
  }

  function highlightLevel() {
    levelButtons.forEach((button) => {
      const isSelected = Number(button.dataset.index) === selectedLevel;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }
  highlightLevel();

  const worldCards = GEO_WORLDS.map((world, worldIndex) => {
    const buttons = levelButtons.filter((button) => GEO_LEVELS[button.dataset.index].worldIndex === worldIndex);
    const isLocked = buttons.every((button) => button.disabled);
    return el('article', { className: `geo-world geo-world--${world.id} ${isLocked ? 'is-locked' : ''}` }, [
      el('header', { className: 'geo-world__header' }, [
        el('span', { className: 'geo-world__emoji', text: isLocked ? '🔒' : world.emoji, attrs: { 'aria-hidden': 'true' } }),
        el('div', {}, [el('strong', { text: world.name }), el('small', { text: isLocked ? 'Termina el mundo anterior' : world.mechanic })]),
      ]),
      el('div', { className: 'geo-levels' }, buttons),
    ]);
  });

  // ---------- Modo y jugar ----------

  const modeButtons = [
    { value: false, label: '▶ Normal', hint: 'Desbloquea niveles' },
    { value: true, label: '🚩 Práctica', hint: 'Con banderas' },
  ].map(({ value, label, hint }) =>
    el(
      'button',
      {
        className: 'mode-toggle__option',
        attrs: { type: 'button', 'aria-pressed': String(value === practice) },
        on: {
          click: () => {
            sounds.click();
            practice = value;
            modeButtons.forEach((button, index) => button.setAttribute('aria-pressed', String((index === 1) === practice)));
          },
        },
      },
      [el('strong', { text: label }), el('small', { text: hint })],
    ),
  );

  const speedButtons = Object.values(SPEEDS).map((speed) =>
    el(
      'button',
      {
        className: 'mode-toggle__option',
        attrs: { type: 'button', 'aria-pressed': String(getSpeed(data.speed).id === speed.id), 'data-speed': speed.id },
        on: { click: () => chooseSpeed(speed.id) },
      },
      [el('strong', { text: `${speed.icon} ${speed.label}` }), el('small', { text: `×${speed.factor}` })],
    ),
  );

  function chooseSpeed(speedId) {
    sounds.click();
    updateGameData('geo', { speed: speedId });
    data = getGameData('geo');
    speedButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.speed === speedId)));
  }

  function startGame() {
    sounds.coin();
    navigate(`/geo/jugar?nivel=${selectedLevel}${practice ? '&practica=1' : ''}`);
  }

  // ---------- Vestidor ----------

  const preview = el('canvas', { className: 'geo-preview__canvas', attrs: { 'aria-hidden': 'true' } });
  const previewCtx = setupCanvas(preview, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  const skinOptions = [];

  function renderSkinOption(group, item) {
    let visual;
    if (group.key === 'shape') {
      visual = el('canvas', { className: 'skin-option__canvas', attrs: { 'aria-hidden': 'true' } });
      shapeCanvases.push({ shapeId: item.id, ctx: setupCanvas(visual, SHAPE_CANVAS_SIZE, SHAPE_CANVAS_SIZE) });
    } else if (group.key === 'color') {
      visual = el('span', {
        className: 'skin-option__swatch',
        style: { background: `linear-gradient(135deg, ${item.primary} 0 55%, ${item.secondary} 55% 100%)` },
      });
    } else {
      visual = el('span', { className: 'skin-option__icon', text: item.icon, attrs: { 'aria-hidden': 'true' } });
    }
    const lockLabel = el('small', { className: 'skin-option__lock', text: `🔒 ⭐${item.stars}` });
    const button = el(
      'button',
      {
        className: 'skin-option',
        attrs: { type: 'button', title: item.name },
        on: { click: () => chooseSkin(group.key, item.id) },
      },
      [visual, el('span', { className: 'skin-option__name', text: item.name }), lockLabel],
    );
    const refresh = () => {
      const isLocked = countStars(data) < item.stars;
      const isSelected = data.skin[group.key] === item.id;
      button.disabled = isLocked;
      button.classList.toggle('is-locked', isLocked);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      lockLabel.hidden = !isLocked;
    };
    refresh();
    skinOptions.push(refresh);
    return button;
  }

  const skinGroups = SKIN_GROUPS.map((group) =>
    el('div', { className: 'skin-group' }, [
      el('h3', { className: 'skin-group__title', text: group.title }),
      el('div', { className: `skin-grid skin-grid--${group.key}` }, group.items.map((item) => renderSkinOption(group, item))),
    ]),
  );

  function chooseSkin(key, id) {
    if (data.skin[key] === id) return;
    sounds.click();
    updateGameData('geo', { skin: { ...data.skin, [key]: id }, skinChanges: data.skinChanges + 1 });
    data = getGameData('geo');
    const earned = findNewAchievements(data);
    if (earned.length) {
      updateGameData('geo', { achievements: [...data.achievements, ...earned.map((achievement) => achievement.id)] });
      data = getGameData('geo');
      sounds.achievement();
      refreshStars();
      renderBadges();
    }
    skinOptions.forEach((refresh) => refresh());
  }

  // ---------- Retos ----------

  const badgeGrid = el('ul', { className: 'badge-grid' });
  function renderBadges() {
    badgeGrid.replaceChildren(
      ...ACHIEVEMENTS.map((achievement) => {
        const isEarned = data.achievements.includes(achievement.id);
        return el('li', { className: `geo-badge ${isEarned ? 'is-earned' : ''}` }, [
          el('span', { className: 'geo-badge__icon', text: isEarned ? achievement.icon : '❔', attrs: { 'aria-hidden': 'true' } }),
          el('div', {}, [el('strong', { text: achievement.title }), el('small', { text: achievement.description })]),
          el('span', { className: 'geo-badge__reward', text: isEarned ? '✅' : '+2⭐' }),
        ]);
      }),
    );
  }
  renderBadges();

  // ---------- Animación de vistas previas ----------

  function animate(timeMs) {
    const time = timeMs / 1000;
    const skin = resolveSkin(data.skin);

    previewCtx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    previewCtx.fillStyle = 'rgba(123, 92, 255, 0.15)';
    previewCtx.fillRect(0, PREVIEW_HEIGHT - 26, PREVIEW_WIDTH, 26);
    const mode = PREVIEW_MODES[Math.floor(time / PREVIEW_MODE_SECONDS) % PREVIEW_MODES.length];
    const hop = Math.abs(Math.sin(time * 3)) * 40;
    const centerY = mode === 'cube' || mode === 'ball' ? PREVIEW_HEIGHT - 26 - 28 - (mode === 'cube' ? hop : 0) : 70 + Math.sin(time * 3) * 14;
    drawPlayer(previewCtx, skin, {
      x: PREVIEW_WIDTH / 2,
      y: centerY,
      size: 56,
      mode,
      angle: mode === 'cube' ? time * 1.5 : time * 5,
      tilt: Math.cos(time * 3) * -0.3,
      time,
    });

    shapeCanvases.forEach(({ shapeId, ctx }) => {
      const isSelected = data.skin.shape === shapeId;
      ctx.clearRect(0, 0, SHAPE_CANVAS_SIZE, SHAPE_CANVAS_SIZE);
      drawPlayer(ctx, { ...skin, shape: { id: shapeId } }, {
        x: SHAPE_CANVAS_SIZE / 2,
        y: SHAPE_CANVAS_SIZE / 2 + 2,
        size: 34,
        angle: isSelected ? Math.sin(time * 4) * 0.2 : 0,
      });
    });
    animationId = requestAnimationFrame(animate);
  }

  // ---------- Página ----------

  root.append(
    el('main', { className: 'page' }, [
      el('div', { className: 'setup geo-setup' }, [
        el('header', { className: 'setup__header' }, [
          el('button', {
            className: 'icon-btn icon-btn--back',
            text: '⬅',
            attrs: { type: 'button', 'aria-label': 'Volver al menú' },
            on: { click: () => navigate('/') },
          }),
          el('h1', { className: 'setup__title', text: '🔷 Salto Geométrico' }),
          starPill,
        ]),
        el('section', { className: 'card setup__section' }, [
          el('h2', { className: 'setup__subtitle', text: '1. Elige un nivel' }),
          el('div', { className: 'geo-world-list' }, worldCards),
          el('p', {
            className: 'setup__note',
            text: 'Llega a la meta en modo normal (a cualquier velocidad) para abrir el siguiente nivel. Cada nivel esconde 3 monedas. Durante el juego, mantén Shift o ⚡ para el turbo.',
          }),
        ]),
        el('div', { className: 'geo-playbar' }, [
          el('div', { className: 'mode-toggle', attrs: { role: 'group', 'aria-label': 'Modo de juego' } }, modeButtons),
          el('div', { className: 'mode-toggle', attrs: { role: 'group', 'aria-label': 'Velocidad' } }, speedButtons),
          el('button', {
            className: 'btn btn--primary btn--xl',
            text: '¡A saltar! 🔷',
            attrs: { type: 'button' },
            on: { click: startGame },
          }),
        ]),
        el('section', { className: 'card setup__section' }, [
          el('h2', { className: 'setup__subtitle', text: '2. Tu figura' }),
          el('div', { className: 'geo-wardrobe' }, [
            el('div', { className: 'geo-preview' }, [
              preview,
              el('small', { text: 'Así se ve en cubo, cohete, pelota y avión.' }),
            ]),
            el('div', { className: 'skin-groups' }, skinGroups),
          ]),
          el('p', { className: 'setup__note', text: 'Gana ⭐ terminando niveles (1), con cada moneda (1) y con los retos (2).' }),
        ]),
        el('section', { className: 'card setup__section' }, [el('h2', { className: 'setup__subtitle', text: '3. Retos' }), badgeGrid]),
      ]),
    ]),
  );

  animationId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationId);
}
