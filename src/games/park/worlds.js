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

/** Todas las atracciones de todos los parques (los ids no se repiten). */
export const ALL_RIDES = [...RIDES, ...PANACA_RIDES];

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
];

export const isWorldOpen = (world, data) => !world.unlock || world.unlock.check(data);
export const getWorldOfRide = (rideId) => PARK_WORLDS.find((world) => world.rides.some((ride) => ride.id === rideId));

/** Mundos que vendrán (se muestran como «próximamente» en la pantalla previa). */
export const UPCOMING_WORLDS = [
  { id: 'playa', name: 'Playa de Cartagena', emoji: '🏖️' },
  { id: 'selva', name: 'Selva Amazónica', emoji: '🐒' },
  { id: 'dulces', name: 'Castillo de Dulces', emoji: '🍭' },
];

/** Monedas de bienvenida la primera vez que se entra al parque. */
export const WELCOME_COINS = 30;
/** Extra la primera vez que se monta cada atracción. */
export const FIRST_RIDE_BONUS = 15;
/** Premio por avisar al vigilante de alguien que se coló. */
export const SNITCH_COINS = 5;
