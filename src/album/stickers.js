/**
 * Álbum de pegatinas compartido por todos los juegos y cofre sorpresa diario.
 * Cada pegatina tiene un `check(ctx)` que mira los datos guardados de los juegos; las del
 * cofre (`chest: true`) solo salen al abrirlo. Datos del jugador en getGameData('album').
 */
import { getActivePlayer, getGameData, updateGameData } from '../core/player.js';
import { DINO_WORLDS, savedMedals } from '../games/dino/worlds.js';
import { DINOS, isDinoUnlocked } from '../games/dino/dinos.js';
import { GEO_LEVELS, GEO_WORLDS } from '../games/geo/levels.js';
import { ACHIEVEMENTS, countStars as countGeoStars } from '../games/geo/achievements.js';
import { TETRIS_WORLDS } from '../games/tetris/levels.js';

export const STICKER_GROUPS = [
  { id: 'dino', title: '🦖 Dino Corre', color: '#4dd4ac' },
  { id: 'geo', title: '🔷 Salto Geométrico', color: '#7b5cff' },
  { id: 'tetris', title: '🧱 Bloques Mágicos', color: '#ff9f43' },
  { id: 'race', title: '🏁 Carreras con amigos', color: '#5ab0ff' },
  { id: 'chest', title: '🎁 Sorpresas del cofre', color: '#ff5fa2' },
  { id: 'special', title: '🌟 Especiales', color: '#ffc21a' },
];

const worldCleared = (dino, index) => savedMedals(dino, index).includes('bronze');
const geoWorldDone = (geo, world) =>
  GEO_LEVELS.filter((level) => level.world === world).every((level) => geo.levels[level.id]?.completed);
const races = ({ dino, geo }) => dino.racesPlayed + geo.racesPlayed;
const raceWins = ({ dino, geo }) => dino.raceWins + geo.raceWins;
const dinoById = (id) => DINOS.find((dino) => dino.id === id);

const sticker = (group, id, icon, name, hint, check) => ({ group, id, icon, name, hint, check });
const chestSticker = (id, icon, name) => ({ group: 'chest', id, icon, name, hint: 'Sale en el cofre del día', chest: true });

export const STICKERS = [
  ...DINO_WORLDS.map((world, index) =>
    sticker('dino', `dino-${world.id}`, world.emoji, world.name, `Llega a la meta de ${world.name}`, ({ dino }) => worldCleared(dino, index)),
  ),
  sticker('dino', 'dino-gold', '🥇', 'Oro de dino', 'Gana una medalla de oro', ({ dino }) =>
    Object.values(dino.medals).some((medals) => medals.includes('gold')),
  ),
  sticker('dino', 'dino-shopper', '🛍️', 'De compras', 'Compra algo en la tienda', ({ dino }) => dino.owned.length >= 1),
  sticker('dino', 'dino-fashion', '👒', 'Muy elegante', 'Ten 5 cosas de la tienda', ({ dino }) => dino.owned.length >= 5),
  sticker('dino', 'dino-rich', '💰', 'Hucha llena', 'Junta 300 monedas a la vez', ({ dino }) => dino.coins >= 300),
  sticker('dino', 'dino-dragon', '🐉', 'Dragoncito', 'Desbloquea a Dragoncito', ({ dino }) => isDinoUnlocked(dinoById('dragon'), dino)),
  sticker('dino', 'dino-unidino', '🦄', 'Unidino', 'Desbloquea a Unidino', ({ dino }) => isDinoUnlocked(dinoById('unidino'), dino)),

  ...GEO_WORLDS.map((world) =>
    sticker('geo', `geo-${world.id}`, world.emoji, world.name, `Termina los niveles de ${world.name}`, ({ geo }) => geoWorldDone(geo, world)),
  ),
  sticker('geo', 'geo-look', '🎨', 'Nuevo look', 'Cambia tu figura en el vestidor', ({ geo }) => geo.skinChanges >= 1),
  sticker('geo', 'geo-stars-50', '⭐', '50 estrellas', 'Consigue 50 estrellas', ({ geo }) => countGeoStars(geo) >= 50),
  sticker('geo', 'geo-stars-100', '🌟', '100 estrellas', 'Consigue 100 estrellas', ({ geo }) => countGeoStars(geo) >= 100),
  sticker('geo', 'geo-badges', '🏅', 'Cazarretos', `Cumple ${Math.ceil(ACHIEVEMENTS.length / 2)} retos`, ({ geo }) =>
    geo.achievements.length >= Math.ceil(ACHIEVEMENTS.length / 2),
  ),

  sticker('tetris', 'tetris-lines-10', '🧱', '10 líneas', 'Haz 10 líneas en una partida', ({ tetris }) => tetris.bestLines >= 10),
  sticker('tetris', 'tetris-lines-40', '🏗️', '40 líneas', 'Haz 40 líneas en una partida', ({ tetris }) => tetris.bestLines >= 40),
  sticker('tetris', 'tetris-stars', '✨', 'Estrellas mágicas', 'Consigue 8 estrellas', ({ tetris }) =>
    Object.values(tetris.stars).reduce((total, stars) => total + stars, 0) >= 8,
  ),
  sticker('tetris', 'tetris-all', '🏰', 'Todos los mundos', 'Desbloquea todos los mundos', ({ tetris }) =>
    tetris.unlockedWorld >= TETRIS_WORLDS.length - 1,
  ),

  sticker('race', 'race-first', '🏁', 'Primera carrera', 'Corre una carrera con amigos', (ctx) => races(ctx) >= 1),
  sticker('race', 'race-ten', '🎪', 'Diez carreras', 'Corre 10 carreras', (ctx) => races(ctx) >= 10),
  sticker('race', 'race-win', '🏆', 'Primera copa', 'Gana una carrera', (ctx) => raceWins(ctx) >= 1),
  sticker('race', 'race-wins-5', '🥇', 'Cinco copas', 'Gana 5 carreras', (ctx) => raceWins(ctx) >= 5),

  chestSticker('chest-clover', '🍀', 'Trébol'),
  chestSticker('chest-butterfly', '🦋', 'Mariposa'),
  chestSticker('chest-donut', '🍩', 'Dona'),
  chestSticker('chest-whale', '🐳', 'Ballena'),
  chestSticker('chest-sunflower', '🌻', 'Girasol'),
  chestSticker('chest-planet', '🪐', 'Planeta'),
  chestSticker('chest-flamingo', '🦩', 'Flamenco'),
  chestSticker('chest-watermelon', '🍉', 'Sandía'),

  sticker('special', 'special-chests', '🗝️', 'Llave dorada', 'Abre 7 cofres', ({ album }) => album.chestsOpened >= 7),
  sticker('special', 'special-collector', '📒', 'Coleccionista', 'Junta 30 pegatinas', ({ album }) => album.stickers.length >= 30),
];

/** Revisa los datos de todos los juegos y pega las pegatinas nuevas. Devuelve las nuevas. */
export function syncStickers() {
  if (!getActivePlayer()) return [];
  const album = { ...getGameData('album') };
  const ctx = { dino: getGameData('dino'), geo: getGameData('geo'), tetris: getGameData('tetris'), album };
  const earned = [];
  // Dos pasadas: las especiales dependen de cuántas se tienen.
  for (let pass = 0; pass < 2; pass += 1) {
    STICKERS.forEach((item) => {
      if (item.chest || album.stickers.includes(item.id) || !item.check(ctx)) return;
      album.stickers = [...album.stickers, item.id];
      earned.push(item);
    });
  }
  if (earned.length) updateGameData('album', { stickers: album.stickers, fresh: [...album.fresh, ...earned.map((item) => item.id)] });
  return earned;
}

// ---------- Cofre del día ----------

const CHEST_COINS = [20, 25, 30, 40, 50];

/** Fecha local (AAAA-MM-DD): el cofre se puede abrir una vez por día. */
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const canOpenChest = () => getGameData('album').lastChest !== today();

/**
 * Abre el cofre: la mitad de las veces una pegatina sorpresa (si quedan) y si no, monedas para Dino.
 * Devuelve { sticker } o { coins }.
 */
export function openChest() {
  const album = getGameData('album');
  const missing = STICKERS.filter((item) => item.chest && !album.stickers.includes(item.id));
  const changes = { lastChest: today(), chestsOpened: album.chestsOpened + 1 };
  let reward;
  if (missing.length && Math.random() < 0.5) {
    const prize = missing[Math.floor(Math.random() * missing.length)];
    changes.stickers = [...album.stickers, prize.id];
    changes.fresh = [...album.fresh, prize.id];
    reward = { sticker: prize };
  } else {
    const coins = CHEST_COINS[Math.floor(Math.random() * CHEST_COINS.length)];
    updateGameData('dino', { coins: getGameData('dino').coins + coins });
    reward = { coins };
  }
  updateGameData('album', changes);
  syncStickers();
  return reward;
}
