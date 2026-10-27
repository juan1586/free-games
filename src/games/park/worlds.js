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

export const getRide = (id) => RIDES.find((ride) => ride.id === id);

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

export const PARK_WORLDS = [
  {
    id: 'cafe',
    name: 'Parque del Café',
    emoji: '☕',
    description: 'En el Quindío, entre cafetales y montañas.',
    rides: RIDES.map((ride) => ride.id),
  },
];

/** Mundos que vendrán (se muestran como «próximamente» en la pantalla previa). */
export const UPCOMING_WORLDS = [
  { id: 'panaca', name: 'Granja Panaca', emoji: '🐄' },
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
