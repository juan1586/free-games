/**
 * Ropa y accesorios del personaje del parque. Lo de precio 0 se tiene desde el principio;
 * lo demás se compra con las monedas del parque (`park.owned`) y se lleva en `park.outfit`.
 * Sin three.js: la pantalla previa dibuja la vista previa con CSS.
 */

export const SKIN_TONES = [
  { id: 'skin-1', name: 'Clara', color: '#ffe0c4' },
  { id: 'skin-2', name: 'Melocotón', color: '#f6c99f' },
  { id: 'skin-3', name: 'Canela', color: '#d9a066' },
  { id: 'skin-4', name: 'Café', color: '#a86b3c' },
  { id: 'skin-5', name: 'Chocolate', color: '#6e4426' },
];

export const SHIRTS = [
  { id: 'shirt-pink', name: 'Rosa', icon: '👚', color: '#ff5fa2', price: 0 },
  { id: 'shirt-blue', name: 'Azul', icon: '👕', color: '#5ab0ff', price: 0 },
  { id: 'shirt-mint', name: 'Menta', icon: '👕', color: '#4dd4ac', price: 0 },
  { id: 'shirt-purple', name: 'Morada', icon: '👚', color: '#9b7bff', price: 15 },
  { id: 'shirt-orange', name: 'Naranja', icon: '👕', color: '#ff9f43', price: 15 },
  { id: 'shirt-colombia', name: 'De la Selección', icon: '⚽', color: '#ffd21f', stripe: '#1f4fbf', price: 40 },
  { id: 'shirt-candy', name: 'Caramelo', icon: '🍬', color: '#ffffff', stripe: '#ff4f8b', price: 35 },
  { id: 'shirt-coffee', name: 'Cafetera', icon: '☕', color: '#7a4a2a', stripe: '#f4d9a6', price: 30 },
];

export const PANTS = [
  { id: 'pants-jeans', name: 'Jean', icon: '👖', color: '#3d5fa8', price: 0 },
  { id: 'pants-black', name: 'Negro', icon: '👖', color: '#2b2b3a', price: 0 },
  { id: 'pants-pink', name: 'Rosado', icon: '🩰', color: '#ff8ac4', price: 10 },
  { id: 'pants-white', name: 'Blanco', icon: '🤍', color: '#f3f0ff', price: 10 },
  { id: 'pants-green', name: 'Verde', icon: '🌿', color: '#3fae6a', price: 10 },
  { id: 'pants-gold', name: 'Dorado', icon: '✨', color: '#f2c230', price: 30 },
];

/** `kind` decide la figura en 3D (ver avatar.js). */
export const HATS = [
  { id: 'none', name: 'Nada', icon: '🚫', kind: 'none', price: 0 },
  { id: 'cap', name: 'Gorra', icon: '🧢', kind: 'cap', color: '#ff5f5f', price: 20 },
  { id: 'aguadeno', name: 'Sombrero aguadeño', icon: '🤠', kind: 'brim', color: '#f4ecd6', band: '#2b2140', price: 35 },
  { id: 'vueltiao', name: 'Sombrero vueltiao', icon: '👒', kind: 'brim', color: '#fbf3dc', band: '#2b2140', stripes: true, price: 40 },
  { id: 'flower', name: 'Flor', icon: '🌺', kind: 'flower', color: '#ff5fa2', price: 20 },
  { id: 'bunny', name: 'Orejas de conejo', icon: '🐰', kind: 'bunny', color: '#ffffff', price: 45 },
  { id: 'propeller', name: 'Gorro hélice', icon: '🚁', kind: 'propeller', color: '#5ab0ff', price: 50 },
  { id: 'crown', name: 'Corona', icon: '👑', kind: 'crown', color: '#ffd93d', price: 80 },
];

export const EXTRAS = [
  { id: 'none', name: 'Nada', icon: '🚫', kind: 'none', price: 0 },
  { id: 'glasses', name: 'Gafas de sol', icon: '🕶️', kind: 'glasses', color: '#2b2140', price: 20 },
  { id: 'mustache', name: 'Bigote de arriero', icon: '🥸', kind: 'mustache', color: '#3b2414', price: 15 },
  { id: 'carriel', name: 'Carriel', icon: '👜', kind: 'carriel', color: '#8a5a2b', price: 30 },
  { id: 'ruana', name: 'Ruana', icon: '🧣', kind: 'ruana', color: '#b23a48', price: 40 },
  { id: 'backpack', name: 'Mochila', icon: '🎒', kind: 'backpack', color: '#ff9f43', price: 25 },
  { id: 'cape', name: 'Capa', icon: '🦸', kind: 'cape', color: '#7b5cff', price: 55 },
  { id: 'wings', name: 'Alas de mariposa', icon: '🦋', kind: 'wings', color: '#ff8ac4', price: 90 },
];

export const OUTFIT_SLOTS = [
  { slot: 'shirt', title: '👕 Camisetas', items: SHIRTS },
  { slot: 'pants', title: '👖 Pantalones', items: PANTS },
  { slot: 'hat', title: '🎩 En la cabeza', items: HATS },
  { slot: 'extra', title: '✨ Extras', items: EXTRAS },
];

const findIn = (items, id) => items.find((item) => item.id === id) ?? items[0];

export const isOwned = (data, item) => item.price === 0 || data.owned.includes(item.id);

/** Ropa puesta y válida (si algo no está comprado o ya no existe, se usa lo básico). */
export function currentOutfit(data) {
  const outfit = data.outfit ?? {};
  const pick = (items, id) => {
    const item = findIn(items, id);
    return isOwned(data, item) ? item : items[0];
  };
  return {
    skin: findIn(SKIN_TONES, outfit.skin),
    shirt: pick(SHIRTS, outfit.shirt),
    pants: pick(PANTS, outfit.pants),
    hat: pick(HATS, outfit.hat),
    extra: pick(EXTRAS, outfit.extra),
  };
}

/** Ids de la ropa puesta (lo que se comparte con las amigas al jugar juntas). */
export function outfitIds(data) {
  const look = currentOutfit(data);
  return { skin: look.skin.id, shirt: look.shirt.id, pants: look.pants.id, hat: look.hat.id, extra: look.extra.id };
}

/** Ropa a partir de ids que llegan de otra tablet (lo desconocido se cambia por lo básico). */
export function outfitFromIds(ids = {}) {
  return {
    skin: findIn(SKIN_TONES, ids.skin),
    shirt: findIn(SHIRTS, ids.shirt),
    pants: findIn(PANTS, ids.pants),
    hat: findIn(HATS, ids.hat),
    extra: findIn(EXTRAS, ids.extra),
  };
}

/** Apariencia al azar para los visitantes (solo colores básicos y algún sombrero). */
export function randomLook(random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  return {
    skin: pick(SKIN_TONES),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    hat: random() < 0.45 ? pick(HATS) : HATS[0],
    extra: random() < 0.25 ? pick(EXTRAS.filter((item) => item.kind !== 'wings')) : EXTRAS[0],
  };
}
