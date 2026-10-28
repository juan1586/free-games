/**
 * Ropa y accesorios del personaje del parque. Lo de precio 0 se tiene desde el principio;
 * lo demás se compra con las monedas del parque (`park.owned`) y se lleva en `park.outfit`.
 * Lo que tiene `key` (id de un parque) no se compra: se abre con la llave secreta de ese parque
 * (`park.keys`); brilla (`sparkle`). La mascota se abre con todas las llaves.
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
  // `skirt`: falda (las piernas van con el color de la piel); `tutu` la hace más ancha.
  { id: 'skirt-pink', name: 'Falda rosada', icon: '👗', color: '#ff8ac4', skirt: true, price: 0 },
  { id: 'skirt-purple', name: 'Falda morada', icon: '👗', color: '#9b7bff', skirt: true, price: 0 },
  { id: 'skirt-yellow', name: 'Falda amarilla', icon: '🌼', color: '#ffd93d', skirt: true, price: 10 },
  { id: 'skirt-tutu', name: 'Tutú de bailarina', icon: '🩰', color: '#ffc4e1', skirt: true, tutu: true, price: 25 },
];

/** Peinados (`kind` decide la figura en 3D, ver avatar.js). Todos gratis: son para crear su personaje. */
export const HAIR_STYLES = [
  { id: 'hair-short', name: 'Corto', icon: '👦', kind: 'short', price: 0 },
  { id: 'hair-long', name: 'Largo', icon: '👩', kind: 'long', price: 0 },
  { id: 'hair-ponytail', name: 'Cola de caballo', icon: '🎀', kind: 'ponytail', price: 0 },
  { id: 'hair-pigtails', name: 'Coletas', icon: '👧', kind: 'pigtails', price: 0 },
  { id: 'hair-braids', name: 'Trenzas', icon: '🥨', kind: 'braids', price: 0 },
  { id: 'hair-bun', name: 'Moño', icon: '🍡', kind: 'bun', price: 0 },
  { id: 'hair-curly', name: 'Crespos', icon: '🌀', kind: 'curly', price: 0 },
  { id: 'hair-none', name: 'Sin pelo', icon: '🥚', kind: 'none', price: 0 },
];

export const HAIR_COLORS = [
  { id: 'hc-black', name: 'Negro', color: '#2b2120' },
  { id: 'hc-brown', name: 'Castaño', color: '#6b4226' },
  { id: 'hc-blond', name: 'Mono', color: '#f2c75c' },
  { id: 'hc-red', name: 'Pelirrojo', color: '#c8552b' },
  { id: 'hc-pink', name: 'Rosado', color: '#ff7eb9' },
  { id: 'hc-purple', name: 'Morado', color: '#9b6bff' },
  { id: 'hc-blue', name: 'Azul', color: '#4fa8ff' },
];

/** Detalles de la cara. */
export const FACES = [
  { id: 'face-smile', name: 'Sonrisa', icon: '🙂', kind: 'smile', price: 0 },
  { id: 'face-lashes', name: 'Pestañas', icon: '😊', kind: 'lashes', price: 0 },
  { id: 'face-freckles', name: 'Pecas', icon: '🤗', kind: 'freckles', price: 0 },
  { id: 'face-blush', name: 'Mejillas rosadas', icon: '☺️', kind: 'blush', price: 0 },
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
  { id: 'rainbow-crown', name: 'Corona arcoíris', icon: '🌈', kind: 'crown', color: '#ff8ac4', key: 'cafe', unlockText: '🗝️ Llave del Café', sparkle: true, price: 0 },
  { id: 'magic-flower', name: 'Flor mágica', icon: '🌺', kind: 'flower', color: '#b57bff', key: 'selva', unlockText: '🗝️ Llave de la Selva', sparkle: true, price: 0 },
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
  { id: 'fairy-wings', name: 'Alas de hada', icon: '🧚', kind: 'wings', color: '#c9b8ff', key: 'panaca', unlockText: '🗝️ Llave de la Granja', sparkle: true, price: 0 },
  { id: 'mermaid-cape', name: 'Capa de sirena', icon: '🧜', kind: 'cape', color: '#2fc4b2', key: 'playa', unlockText: '🗝️ Llave de la Playa', sparkle: true, price: 0 },
  { id: 'heart-glasses', name: 'Gafas de corazón', icon: '💖', kind: 'glasses', color: '#ff4f8b', key: 'dulces', unlockText: '🗝️ Llave del Castillo', sparkle: true, price: 0 },
];

/** Cuántas llaves secretas hay (una por parque) y la mascota que se abre con todas. */
export const SECRET_KEY_COUNT = 5;
export const PETS = [
  { id: 'pet-none', name: 'Sin mascota', icon: '🚫', kind: 'none', price: 0 },
  { id: 'pet-unicorn', name: 'Unicornio bebé', icon: '🦄', kind: 'unicorn', allKeys: true, unlockText: '🗝️ Junta las 5 llaves', sparkle: true, price: 0 },
];

/** Lo que se elige en la tienda (`slot` = campo de `park.outfit`). La piel y el color del pelo van aparte. */
export const OUTFIT_SLOTS = [
  { slot: 'hair', title: '💇‍♀️ Peinado', items: HAIR_STYLES },
  { slot: 'face', title: '😊 Cara', items: FACES },
  { slot: 'shirt', title: '👕 Camisetas', items: SHIRTS },
  { slot: 'pants', title: '👖 Pantalones y faldas', items: PANTS },
  { slot: 'hat', title: '🎩 En la cabeza', items: HATS },
  { slot: 'extra', title: '✨ Extras', items: EXTRAS },
  { slot: 'pet', title: '🦄 Mascota', items: PETS },
];

const findIn = (items, id) => items.find((item) => item.id === id) ?? items[0];

export function isOwned(data, item) {
  const keys = data.keys ?? [];
  if (item.allKeys) return keys.length >= SECRET_KEY_COUNT;
  if (item.key) return keys.includes(item.key);
  return item.price === 0 || data.owned.includes(item.id);
}

/** Ropa puesta y válida (si algo no está comprado o ya no existe, se usa lo básico). */
export function currentOutfit(data) {
  const outfit = data.outfit ?? {};
  const pick = (items, id) => {
    const item = findIn(items, id);
    return isOwned(data, item) ? item : items[0];
  };
  return {
    skin: findIn(SKIN_TONES, outfit.skin),
    hair: pick(HAIR_STYLES, outfit.hair),
    hairColor: findIn(HAIR_COLORS, outfit.hairColor),
    face: pick(FACES, outfit.face),
    shirt: pick(SHIRTS, outfit.shirt),
    pants: pick(PANTS, outfit.pants),
    hat: pick(HATS, outfit.hat),
    extra: pick(EXTRAS, outfit.extra),
    pet: pick(PETS, outfit.pet),
  };
}

const LOOK_PARTS = {
  skin: SKIN_TONES,
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  face: FACES,
  shirt: SHIRTS,
  pants: PANTS,
  hat: HATS,
  extra: EXTRAS,
  pet: PETS,
};
export const LOOK_KEYS = Object.keys(LOOK_PARTS);

/** Ids de la ropa puesta (lo que se comparte con las amigas al jugar juntas). */
export function outfitIds(data) {
  const look = currentOutfit(data);
  return Object.fromEntries(LOOK_KEYS.map((key) => [key, look[key].id]));
}

/** Ropa a partir de ids que llegan de otra tablet (lo desconocido se cambia por lo básico). */
export function outfitFromIds(ids = {}) {
  return Object.fromEntries(LOOK_KEYS.map((key) => [key, findIn(LOOK_PARTS[key], ids[key])]));
}

/**
 * Apariencia al azar para los visitantes (solo colores básicos y algún sombrero). El peinado y la cara
 * salen del mismo número que la piel: así se usan los mismos números al azar que antes y los parques
 * (que se construyen con una semilla fija) no cambian.
 */
export function randomLook(random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const roll = random();
  const share = (items, factor) => items[Math.floor(((roll * factor) % 1) * items.length)];
  return {
    skin: SKIN_TONES[Math.floor(roll * SKIN_TONES.length)],
    hair: share(HAIR_STYLES.slice(0, -1), 97),
    hairColor: share(HAIR_COLORS.slice(0, 4), 389),
    face: share(FACES, 53),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    hat: random() < 0.45 ? pick(HATS.filter((item) => !item.key)) : HATS[0],
    extra: random() < 0.25 ? pick(EXTRAS.filter((item) => item.kind !== 'wings' && !item.key)) : EXTRAS[0],
    pet: PETS[0],
  };
}
