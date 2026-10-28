/**
 * Mundos del Parque Mágico. Unidades en metros: X a la derecha, Z hacia la entrada (sur), Y hacia arriba.
 * La plaza está en (0, 0) y la entrada del parque al sur. Este archivo no usa three.js: lo leen también
 * el menú, la pantalla previa y las pegatinas.
 */

/** Atracciones del Parque del Café. `entrance` es el frente de la fila; la fila crece hacia `queueDir`. */
export const RIDES = [
  {
    id: 'krater',
    name: 'Krater',
    emoji: '🎢',
    description: 'La montaña rusa más loca. ¡Grita en las bajadas!',
    entrance: { x: 24, z: -18 },
    queueDir: { x: -0.8, z: 0.6 },
    fastPassPrice: 12,
    secondsPerPerson: 2.6,
  },
  {
    id: 'cumbre',
    name: 'La Cumbre',
    emoji: '🗼',
    description: 'Torre de caída libre. ¡Toca justo cuando caigas!',
    entrance: { x: -24, z: -18 },
    queueDir: { x: 0.8, z: 0.6 },
    fastPassPrice: 12,
    secondsPerPerson: 2.4,
  },
  {
    id: 'rueda',
    name: 'Rueda Panorámica',
    emoji: '🎡',
    description: 'Mira el parque desde arriba y caza globos con la cámara.',
    entrance: { x: 0, z: -30 },
    queueDir: { x: 0, z: 1 },
    fastPassPrice: 8,
    secondsPerPerson: 2.2,
  },
  {
    id: 'jipe',
    name: 'El Jipe',
    emoji: '🚙',
    description: 'Maneja un Willys por el cafetal y recoge granos de café.',
    entrance: { x: -26, z: 4 },
    queueDir: { x: 0.988, z: -0.152 },
    fastPassPrice: 10,
    secondsPerPerson: 2.4,
  },
  {
    id: 'chocones',
    name: 'Carros Chocones',
    emoji: '🚗',
    description: '¡Choca a los demás carritos para ganar monedas!',
    entrance: { x: 26, z: 4 },
    queueDir: { x: -0.988, z: -0.152 },
    fastPassPrice: 10,
    secondsPerPerson: 2.4,
  },
];

/** Atracciones de la Granja Panaca (misma distribución: filas que llegan a la plaza). */
export const PANACA_RIDES = [
  {
    id: 'cerditos',
    name: 'Carrera de Cerditos',
    emoji: '🐷',
    description: '¡Anima a tu cerdito pulsando rápido para que gane!',
    entrance: { x: 24, z: -18 },
    queueDir: { x: -0.8, z: 0.6 },
    fastPassPrice: 8,
    secondsPerPerson: 2.4,
  },
  {
    id: 'ordeno',
    name: 'Ordeñar a Lola',
    emoji: '🐄',
    description: 'Ordeña a la vaca Lola siguiendo el ritmo.',
    entrance: { x: -24, z: -18 },
    queueDir: { x: 0.8, z: 0.6 },
    fastPassPrice: 8,
    secondsPerPerson: 2.4,
  },
  {
    id: 'tractor',
    name: 'Paseo en Tractor',
    emoji: '🚜',
    description: 'Recoge huevos con el tractor y esquiva el barro.',
    entrance: { x: 0, z: -30 },
    queueDir: { x: 0, z: 1 },
    fastPassPrice: 10,
    secondsPerPerson: 2.2,
  },
];

/** Atracciones de la Playa de Cartagena. */
export const PLAYA_RIDES = [
  {
    id: 'galeon',
    name: 'Galeón Pirata',
    emoji: '🏴‍☠️',
    description: '¡Dispara el cañón a los barriles y a los barcos piratas!',
    entrance: { x: 24, z: -18 },
    queueDir: { x: -0.8, z: 0.6 },
    fastPassPrice: 12,
    secondsPerPerson: 2.6,
  },
  {
    id: 'lancha',
    name: 'Lancha a las Islas',
    emoji: '🚤',
    description: 'Maneja la lancha, recoge estrellas de mar y esquiva las medusas.',
    entrance: { x: -24, z: -18 },
    queueDir: { x: 0.8, z: 0.6 },
    fastPassPrice: 10,
    secondsPerPerson: 2.4,
  },
  {
    id: 'buceo',
    name: 'Buceo en el Arrecife',
    emoji: '🤿',
    description: 'Nada entre corales, recoge perlas y encuentra el tesoro hundido.',
    entrance: { x: 0, z: -30 },
    queueDir: { x: 0, z: 1 },
    fastPassPrice: 10,
    secondsPerPerson: 2.4,
  },
];

/** Atracciones de la Selva Amazónica. */
export const SELVA_RIDES = [
  {
    id: 'tirolesa',
    name: 'Vuelo del Tucán',
    emoji: '🌿',
    description: 'Baja en tirolesa entre árboles gigantes y atrapa mariposas.',
    entrance: { x: 24, z: -18 },
    queueDir: { x: -0.8, z: 0.6 },
    fastPassPrice: 12,
    secondsPerPerson: 2.4,
  },
  {
    id: 'canoa',
    name: 'Canoa por el Amazonas',
    emoji: '🛶',
    description: 'Rema por el río, recoge frutas y saluda a los delfines rosados.',
    entrance: { x: -24, z: -18 },
    queueDir: { x: 0.8, z: 0.6 },
    fastPassPrice: 10,
    secondsPerPerson: 2.4,
  },
  {
    id: 'guacamayas',
    name: 'Coro de Guacamayas',
    emoji: '🦜',
    description: 'Escucha la canción de las guacamayas y repítela.',
    entrance: { x: 0, z: -30 },
    queueDir: { x: 0, z: 1 },
    fastPassPrice: 10,
    secondsPerPerson: 2.2,
  },
];

/** Atracciones del Castillo de Dulces. */
export const DULCES_RIDES = [
  {
    id: 'carrusel',
    name: 'Carrusel de Caramelo',
    emoji: '🎠',
    description: 'Monta en un unicornio y atrapa los aros de caramelo al pasar.',
    entrance: { x: 24, z: -18 },
    queueDir: { x: -0.8, z: 0.6 },
    fastPassPrice: 10,
    secondsPerPerson: 2.2,
  },
  {
    id: 'pasteles',
    name: 'Torre de Pasteles',
    emoji: '🎂',
    description: 'Suelta las capas de pastel justo encima y arma la torta más alta.',
    entrance: { x: -24, z: -18 },
    queueDir: { x: 0.8, z: 0.6 },
    fastPassPrice: 10,
    secondsPerPerson: 2.4,
  },
  {
    id: 'pinata',
    name: 'La Piñata Gigante',
    emoji: '🪅',
    description: 'Dale a la piñata cuando pase por el centro y recoge los dulces.',
    entrance: { x: 0, z: -30 },
    queueDir: { x: 0, z: 1 },
    fastPassPrice: 12,
    secondsPerPerson: 2.4,
  },
];

/** Todas las atracciones de todos los parques (los ids no se repiten). */
export const ALL_RIDES = [...RIDES, ...PANACA_RIDES, ...PLAYA_RIDES, ...SELVA_RIDES, ...DULCES_RIDES];

export const getRide = (id) => ALL_RIDES.find((ride) => ride.id === id);

/** Granos de café dorados escondidos (coleccionables que no vuelven a salir). */
export const GOLDEN_BEANS = [
  { id: 'bean-1', x: 15, y: 4.2, z: 12, hint: 'En el techo de la tienda de café' },
  { id: 'bean-2', x: 0, y: 0.9, z: -5, hint: 'Detrás de la taza gigante' },
  { id: 'bean-3', x: -38, y: 0.9, z: 30, hint: 'Entre las matas del cafetal' },
  { id: 'bean-4', x: -22, y: 0.9, z: 53, hint: 'Detrás de las casitas de colores' },
  { id: 'bean-5', x: 0, y: 0.9, z: -55, hint: 'Detrás de la rueda panorámica' },
  { id: 'bean-6', x: 44, y: 0.9, z: 40, hint: 'Entre las palmas de cera' },
  { id: 'bean-7', x: -31.6, y: 3.0, z: 17, hint: 'Encima de las cajas de café' },
  { id: 'bean-8', x: -50, y: 0.9, z: -40, hint: 'Detrás de La Cumbre' },
  { id: 'bean-9', x: 58, y: 0.9, z: 20, hint: 'Detrás de los chocones' },
  { id: 'bean-10', x: 30, y: 0.9, z: -50, hint: 'Al fondo, cerca del Krater' },
];

/** Huevos dorados escondidos en la Granja Panaca. */
export const GOLDEN_EGGS = [
  { id: 'egg-1', x: 16, y: 3.5, z: 40, hint: 'En el techo del gallinero' },
  { id: 'egg-2', x: 0, y: 0.9, z: -5, hint: 'Detrás del molino' },
  { id: 'egg-3', x: 44, y: 0.9, z: 16, hint: 'Con las vacas (¡salta la cerca!)' },
  { id: 'egg-4', x: -44, y: 0.9, z: 8, hint: 'Con las ovejas (¡salta la cerca!)' },
  { id: 'egg-5', x: 42, y: 0.9, z: 38.2, hint: 'Entre el maizal' },
  { id: 'egg-6', x: -40, y: 0.9, z: -42, hint: 'Detrás del establo de Lola' },
  { id: 'egg-7', x: 6, y: 0.9, z: -54, hint: 'Detrás del galpón del tractor' },
  { id: 'egg-8', x: -27, y: 0.9, z: 46, hint: 'Junto al estanque de los patos' },
];

/** Caracolas doradas escondidas en la Playa de Cartagena. */
export const GOLDEN_SHELLS = [
  { id: 'shell-1', x: -46, y: 3.9, z: 1, hint: 'En lo alto de la muralla (sube por la escalera)' },
  { id: 'shell-2', x: 0, y: 0.9, z: -5, hint: 'Detrás de la Torre del Reloj' },
  { id: 'shell-3', x: 16, y: 3.9, z: 44, hint: 'En el techo de la chiva (¡trepa por las maletas!)' },
  { id: 'shell-4', x: 40, y: 0.9, z: 40, hint: 'Junto al castillo de arena' },
  { id: 'shell-5', x: 7, y: 0.9, z: -54, hint: 'Detrás del acuario' },
  { id: 'shell-6', x: -9.9, y: 3.9, z: 37, hint: 'En un balcón (¡sube por las cajas de frutas!)' },
  { id: 'shell-7', x: 28, y: 0.9, z: -44, hint: 'Junto a la proa del galeón' },
  { id: 'shell-8', x: 42, y: 0.9, z: 8, hint: 'En la orilla del mar' },
];

/** Ranas doradas escondidas en la Selva Amazónica. */
export const GOLDEN_FROGS = [
  { id: 'frog-1', x: 38.6, y: 4.9, z: 20, hint: 'En la casa del árbol (sube por la escalera)' },
  { id: 'frog-2', x: 0, y: 0.9, z: -5.6, hint: 'Detrás de la maloca' },
  { id: 'frog-3', x: 38.5, y: 4.9, z: 2.5, hint: 'Al otro lado del puente colgante' },
  { id: 'frog-4', x: -38.6, y: 1.15, z: 34.4, hint: 'En la victoria regia del lago (¡salta de hoja en hoja!)' },
  { id: 'frog-5', x: -20, y: 0.9, z: -58.3, hint: 'Detrás de la cascada' },
  { id: 'frog-6', x: -40.8, y: 0.9, z: 9, hint: 'Junto al caimán dormido (¡sin despertarlo!)' },
  { id: 'frog-7', x: 25.5, y: 4.5, z: 39.5, hint: 'En lo alto de los hongos gigantes (¡salta!)' },
  { id: 'frog-8', x: -49, y: 1.2, z: -30, hint: 'En la punta del embarcadero' },
];

/** Caramelos dorados escondidos en el Castillo de Dulces. */
export const GOLDEN_CANDIES = [
  { id: 'candy-1', x: 17, y: 7.9, z: -50, hint: 'En la torre del castillo (sube por la muralla)' },
  { id: 'candy-2', x: 0, y: 0.9, z: -5.6, hint: 'Detrás del cupcake gigante' },
  { id: 'candy-3', x: -40, y: 1.2, z: 10, hint: 'En la isla del lago de chocolate (¡salta por las galletas!)' },
  { id: 'candy-4', x: 43, y: 4.9, z: 28.6, hint: 'Sobre la nube de algodón (¡salta por las gomitas!)' },
  { id: 'candy-5', x: -42, y: 4.5, z: -34, hint: 'En lo alto del pastel gigante (¡trepa sus pisos!)' },
  { id: 'candy-6', x: 39, y: 0.9, z: -32, hint: 'Detrás del carrusel' },
  { id: 'candy-7', x: -32, y: 0.9, z: 38.4, hint: 'Detrás de una casita de jengibre' },
  { id: 'candy-8', x: -18, y: 4.9, z: -50, hint: 'En la punta oeste de la muralla' },
];

/**
 * Parques. `treasure`: lo que se colecciona en cada uno (`key` es el campo de `park` donde se guarda).
 * `unlock`: qué hay que hacer para abrirlo (sin `unlock`, abierto desde el principio).
 */
export const PARK_WORLDS = [
  {
    id: 'cafe',
    name: 'Parque del Café',
    emoji: '☕',
    description: 'En el Quindío, entre cafetales y montañas.',
    rides: RIDES,
    treasure: { key: 'goldenBeans', name: 'Granos de café dorados', short: 'Granos', icon: '🌟', item: 'grano dorado', items: GOLDEN_BEANS },
  },
  {
    id: 'panaca',
    name: 'Granja Panaca',
    emoji: '🐄',
    description: 'La granja del Quindío: animales, tractores y carreras de cerditos.',
    rides: PANACA_RIDES,
    treasure: { key: 'goldenEggs', name: 'Huevos dorados', short: 'Huevos', icon: '🥚', item: 'huevo dorado', items: GOLDEN_EGGS },
    unlock: {
      hint: 'Monta en todas las atracciones del Parque del Café',
      check: (data) => RIDES.every((ride) => (data.ridesDone[ride.id] ?? 0) >= 1),
    },
  },
  {
    id: 'playa',
    name: 'Playa de Cartagena',
    emoji: '🏖️',
    description: 'Murallas, casitas con balcones, el mar y un galeón pirata.',
    rides: PLAYA_RIDES,
    treasure: { key: 'goldenShells', name: 'Caracolas doradas', short: 'Caracolas', icon: '🐚', item: 'caracola dorada', items: GOLDEN_SHELLS },
    unlock: {
      hint: 'Monta en todas las atracciones de la Granja Panaca',
      check: (data) => PANACA_RIDES.every((ride) => (data.ridesDone[ride.id] ?? 0) >= 1),
    },
  },
  {
    id: 'selva',
    name: 'Selva Amazónica',
    emoji: '🐒',
    description: 'Árboles gigantes, el río Amazonas, monos, guacamayas y ranas doradas.',
    rides: SELVA_RIDES,
    treasure: { key: 'goldenFrogs', name: 'Ranas doradas', short: 'Ranas', icon: '🐸', item: 'rana dorada', items: GOLDEN_FROGS },
    unlock: {
      hint: 'Monta en todas las atracciones de la Playa de Cartagena',
      check: (data) => PLAYA_RIDES.every((ride) => (data.ridesDone[ride.id] ?? 0) >= 1),
    },
  },
  {
    id: 'dulces',
    name: 'Castillo de Dulces',
    emoji: '🍭',
    description: 'Un castillo de galleta, un lago de chocolate, gomitas gigantes y un carrusel.',
    rides: DULCES_RIDES,
    treasure: { key: 'goldenCandies', name: 'Caramelos dorados', short: 'Caramelos', icon: '🍬', item: 'caramelo dorado', items: GOLDEN_CANDIES },
    unlock: {
      hint: 'Monta en todas las atracciones de la Selva Amazónica',
      check: (data) => SELVA_RIDES.every((ride) => (data.ridesDone[ride.id] ?? 0) >= 1),
    },
  },
];

export const isWorldOpen = (world, data) => !world.unlock || world.unlock.check(data);
export const getWorldOfRide = (rideId) => PARK_WORLDS.find((world) => world.rides.some((ride) => ride.id === rideId));

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/**
 * Cuánto se ha completado un parque (para el mapa): atracciones montadas, tesoros y llave secreta.
 * `missing` es un texto corto con lo que falta.
 */
export function worldProgress(world, data) {
  const ridesDone = world.rides.filter((ride) => (data.ridesDone?.[ride.id] ?? 0) >= 1).length;
  const found = (data[world.treasure.key] ?? []).length;
  const treasures = world.treasure.items.length;
  const hasKey = (data.keys ?? []).includes(world.id);
  const total = world.rides.length + treasures + 1;
  const percent = Math.round(((ridesDone + found + (hasKey ? 1 : 0)) / total) * 100);
  const parts = [];
  if (ridesDone < world.rides.length) parts.push(plural(world.rides.length - ridesDone, 'atracción', 'atracciones'));
  // «grano dorado» → «granos dorados», «caracola dorada» → «caracolas doradas».
  if (found < treasures) parts.push(plural(treasures - found, world.treasure.item, world.treasure.item.replace(/(\S+)/g, '$1s')));
  else if (!hasKey) parts.push('la llave 🗝️');
  const missing = parts.length ? `Te falta: ${parts.join(' y ')}` : '¡Parque completo! 👑';
  return { ridesDone, rides: world.rides.length, found, treasures, hasKey, percent, missing };
}

/** Progreso de todo el mundo mágico (promedio de los parques), de 0 a 100. */
export const totalProgress = (data) =>
  Math.round(PARK_WORLDS.reduce((sum, world) => sum + worldProgress(world, data).percent, 0) / PARK_WORLDS.length);

/** Mundos que vendrán (se muestran como «próximamente» en la pantalla previa). */
export const UPCOMING_WORLDS = [];

/**
 * Llave secreta 🗝️ de cada parque: aparece aquí (delante de la plaza) cuando ya se encontraron todos
 * sus tesoros dorados. Se guarda el id del parque en `park.keys` y abre ropa secreta (outfits.js).
 */
export const SECRET_KEY_SPOT = { x: 0, y: 1.4, z: 9 };
export const KEY_COINS = 30;

/** Monedas de bienvenida la primera vez que se entra al parque. */
export const WELCOME_COINS = 30;
/** Extra la primera vez que se monta cada atracción. */
export const FIRST_RIDE_BONUS = 15;
/** Premio por avisar al vigilante de alguien que se coló. */
export const SNITCH_COINS = 5;
