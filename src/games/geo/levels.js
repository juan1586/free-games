import { MODES } from './physics.js';

/**
 * Mundos y niveles de Salto Geométrico. Las posiciones están en celdas (1 celda = 40 px).
 * Cada nivel se arma encadenando secciones: cada sección coloca sus piezas a partir de la
 * posición actual y dice cuánto avanza. Así los niveles se leen como una partitura.
 */

// ---------- Piezas ----------

const block = (x, y, w = 1, h = 1) => ({ type: 'block', x, y, w, h });
const spike = (x, y = 0, options = {}) => ({ type: 'spike', x, y, ...options });
const saw = (x, y, r = 0.9) => ({ type: 'saw', x, y, r });
const pad = (x, y = 0) => ({ type: 'pad', x, y });
const orb = (x, y) => ({ type: 'orb', x, y });
const gravityOrb = (x, y) => ({ type: 'orb', x, y, kind: 'gravity' });
const portal = (x, mode, y = 3.5) => ({ type: 'portal', x, y, mode });
const coin = (x, y) => ({ type: 'coin', x, y });

const range = (count) => Array.from({ length: count }, (_, index) => index);

// ---------- Secciones ----------

const section = (width, build) => (x) => ({ width, items: build(x) });

const gap = (width) => section(width, () => []);

/** Moneda colocada respecto a la posición actual (dx puede ser negativo). No avanza. */
const coinAt = (dx, dy) => section(0, (x) => [coin(x + dx, dy)]);

const spikes = (count = 1, after = 7) => section(count + after, (x) => range(count).map((i) => spike(x + i)));

const smallSpikes = (count = 2, after = 7) =>
  section(count + after, (x) => range(count).map((i) => spike(x + i, 0, { small: true })));

/** Bloque al que hay que subirse y del que luego se baja. */
const ledge = (width = 4, height = 1, after = 6) => section(width + after, (x) => [block(x, 0, width, height)]);

/** Bloque con un pincho encima: subir y volver a saltar. */
const spikyLedge = (width = 8, after = 6) =>
  section(width + after, (x) => [block(x, 0, width, 1), spike(x + Math.floor(width / 2) + 1, 1)]);

const stairs = (steps = 3, stepWidth = 4, after = 6) =>
  section(steps * stepWidth + after, (x) => range(steps).map((i) => block(x + i * stepWidth, 0, stepWidth, i + 1)));

/** Dos plataformas con pinchos pequeños entre ellas. */
const spikePit = (pitWidth = 3, after = 6) =>
  section(pitWidth + 6 + after, (x) => [
    block(x, 0, 3, 1),
    ...range(pitWidth).map((i) => spike(x + 3 + i, 0, { small: true })),
    block(x + 3 + pitWidth, 0, 3, 1),
  ]);

/** Trampolín que lanza a una plataforma alta con pinchos debajo. */
const padToPlatform = (after = 6) =>
  section(13 + after, (x) => [
    pad(x),
    block(x + 3, 3, 7, 1),
    ...range(6).map((i) => spike(x + 3 + i, 0, { small: true })),
  ]);

/** Fila de pinchos demasiado larga para un salto: hay que tocar el aro en el aire. */
const orbHop = (after = 7) =>
  section(5 + after, (x) => [...range(5).map((i) => spike(x + i, 0, { small: true })), orb(x + 1, 3)]);

/** Pilares de distinta altura separados por suelo libre. */
const pillars = (heights = [1, 2, 1], spacing = 6, after = 2) =>
  section(heights.length * spacing + after, (x) => heights.map((height, i) => block(x + i * spacing, 0, 1, height)));

const sawHop = (after = 7) => section(2 + after, (x) => [saw(x + 1, 0.1)]);

/** Sierra colgando sobre un bloque: subir al bloque pasando por debajo de la sierra. */
const sawOverLedge = (after = 6) =>
  section(8 + after, (x) => [block(x + 2, 0, 6, 1), saw(x + 1, 0.1), saw(x + 6, 3.6, 0.8)]);

const toMode = (mode) => section(4, (x) => [portal(x + 1, mode)]);

/** Columnas que salen del suelo y del techo, alternadas, para el cohete. */
const rocketGates = (pattern = ['low', 'high', 'low'], spacing = 6) =>
  section(pattern.length * spacing + 2, (x) =>
    pattern.flatMap((kind, i) => {
      const gx = x + 2 + i * spacing;
      return kind === 'low' ? [block(gx, 0, 1, 4)] : [block(gx, 3, 1, 4)];
    }),
  );

/** Túnel estrecho para el cohete con pinchos en el suelo. */
const rocketTunnel = (length = 10) =>
  section(length + 3, (x) => [
    block(x + 1, 5, length, 2),
    ...range(length).map((i) => spike(x + 1 + i, 0, { small: true })),
  ]);

/** Pinchos alternados en suelo y techo: la pelota debe cambiar de lado. */
const ballFlips = (sides = ['floor', 'ceiling', 'floor'], spacing = 7) =>
  section(sides.length * spacing + 2, (x) =>
    sides.flatMap((side, i) => {
      const sx = x + 3 + i * spacing;
      return side === 'floor' ? [spike(sx), spike(sx + 1)] : [spike(sx, 6, { flip: true }), spike(sx + 1, 6, { flip: true })];
    }),
  );

/** Bloques centrales que la pelota esquiva por arriba o por abajo. */
const ballIslands = (count = 2, spacing = 8) =>
  section(count * spacing + 2, (x) =>
    range(count).flatMap((i) => {
      const bx = x + 3 + i * spacing;
      return i % 2 === 0 ? [block(bx, 0, 3, 3)] : [block(bx, 4, 3, 3)];
    }),
  );

/** Puertas para el avión: un hueco de 3 celdas a distinta altura. */
const planeGates = (gapHeights = [2, 3, 1], spacing = 7) =>
  section(gapHeights.length * spacing + 2, (x) =>
    gapHeights.flatMap((gapY, i) => {
      const gx = x + 3 + i * spacing;
      const pieces = [block(gx, gapY + 3, 1, 7 - gapY - 3)];
      if (gapY > 0) pieces.push(block(gx, 0, 1, gapY));
      return pieces;
    }),
  );

const planeSaws = (spots = [[1.5, 2], [5.5, 5]], width = 10) =>
  section(width, (x) => spots.map(([dx, y]) => saw(x + dx, y, 1)));

// ---------- Secciones de los mundos expertos ----------

/** Da la vuelta a una pieza respecto al centro de la pista (el suelo pasa a ser el techo). */
function flipItem(item) {
  switch (item.type) {
    case 'block':
      return { ...item, y: 7 - item.y - item.h };
    case 'spike':
      return { ...item, y: 6 - item.y, flip: !item.flip };
    default:
      return { ...item, y: 7 - item.y };
  }
}

/** La misma sección, pero colgando del techo: para cuando la gravedad está al revés. */
const onCeiling = (build) => (x) => {
  const { width, items } = build(x);
  return { width, items: items.map(flipItem) };
};

/** Portal de gravedad. 'up' manda al techo; deja hueco para el viaje de un lado al otro. */
const toGravity = (dir) => section(5, (x) => [portal(x + 1, dir === 'up' ? 'flipUp' : 'flipDown')]);

const toSpeed = (fast) => section(3, (x) => [portal(x + 1, fast ? 'fast' : 'normalSpeed')]);

/** Pinchos en el suelo y en el techo a la vez: con la gravedad normal solo molestan los de abajo. */
const spikeSandwich = (count = 2, after = 6) =>
  section(count + after, (x) => range(count).flatMap((i) => [spike(x + i), spike(x + i, 6, { flip: true })]));

/** Fila larga de pinchos con un aro azul: tocarlo manda al techo. */
const gravityOrbHop = (after = 6) =>
  section(7 + after, (x) => [...range(7).map((i) => spike(x + i, 0, { small: true })), gravityOrb(x + 1, 2.5)]);

/** Lados alternos para el imán: tres pinchos en el suelo o en el techo, muy seguidos. */
const magnetFlips = (sides = ['floor', 'ceiling', 'floor'], spacing = 5) =>
  section(sides.length * spacing + 2, (x) =>
    sides.flatMap((side, i) => {
      const sx = x + 3 + i * spacing;
      const row = [spike(sx), spike(sx + 1), spike(sx + 2)];
      return side === 'floor' ? row : row.map(flipItem);
    }),
  );

/** Bloques que el imán rodea pegado al suelo o al techo. */
const magnetPillars = (count = 3, spacing = 6) =>
  section(count * spacing + 2, (x) =>
    range(count).flatMap((i) => {
      const bx = x + 3 + i * spacing;
      return i % 2 === 0 ? [block(bx, 0, 2, 4)] : [block(bx, 3, 2, 4)];
    }),
  );

/** Puertas para la onda: un hueco de 3 celdas a distinta altura (0 = pegado al suelo). */
const waveGates = (gapHeights = [1, 3, 2], spacing = 5) =>
  section(gapHeights.length * spacing + 2, (x) =>
    gapHeights.flatMap((gapY, i) => {
      const gx = x + 3 + i * spacing;
      const pieces = [];
      if (gapY + 3 < 7) pieces.push(block(gx, gapY + 3, 1, 7 - gapY - 3));
      if (gapY > 0) pieces.push(block(gx, 0, 1, gapY));
      return pieces;
    }),
  );

/** Pinchos pequeños en suelo y techo: la onda va por el medio. */
const waveSpikes = (length = 8, after = 2) =>
  section(length + after, (x) =>
    range(length).flatMap((i) => [spike(x + i, 0, { small: true }), spike(x + i, 6, { small: true, flip: true })]),
  );

function compose(sections, { lead = 8, tail = 10 } = {}) {
  let x = lead;
  const objects = [];
  sections.forEach((build) => {
    const { width, items } = build(x);
    objects.push(...items);
    x += width;
  });
  return { objects, length: x + tail };
}

// ---------- Mundos ----------


export const GEO_WORLDS = [
  {
    id: 'candy',
    name: 'Valle Caramelo',
    emoji: '🍬',
    mechanic: 'Saltos, bloques y pinchos',
    speed: 280,
    decor: 'circle',
    palette: {
      skyTop: '#ffb3d9',
      skyBottom: '#c9f7e8',
      decor: 'rgba(255, 255, 255, 0.45)',
      ground: '#ff7eb6',
      groundDark: '#f0609f',
      line: '#ffffff',
      block: '#7b5cff',
      blockInner: '#a48bff',
      spike: '#ff5fa2',
      text: '#2b2140',
    },
    music: { bpm: 120, melody: 'C5 E5 G5 E5 A5 G5 E5 D5 C5 E5 G5 C6 B5 G5 E5 -', bass: 'C3 - G3 - A2 - F3 -' },
    levels: [
      {
        name: 'Primeros saltos',
        ...compose([
          gap(4),
          spikes(1, 9),
          spikes(1, 8),
          coinAt(-5, 2.5),
          ledge(4, 1, 8),
          spikes(2, 9),
          ledge(6, 1, 8),
          spikes(1, 6),
          spikes(1, 9),
          coinAt(-12, 3),
          pillars([1, 1, 2], 7, 6),
          spikes(2, 9),
          ledge(5, 1, 4),
          coinAt(-6, 2.6),
          spikes(1, 8),
        ]),
      },
      {
        name: 'Escalera de azúcar',
        ...compose([
          gap(2),
          spikes(1, 8),
          stairs(3, 4, 8),
          coinAt(-8, 4.5),
          spikes(2, 8),
          spikyLedge(8, 8),
          spikePit(3, 8),
          coinAt(-12, 2.8),
          pillars([1, 2, 2], 6, 6),
          stairs(2, 5, 7),
          spikes(1, 6),
          spikes(2, 8),
          coinAt(-5, 3),
        ]),
      },
      {
        name: 'Chicle saltarín',
        ...compose([
          gap(2),
          spikes(2, 7),
          spikePit(3, 6),
          spikyLedge(9, 6),
          coinAt(-12, 3.4),
          stairs(3, 4, 6),
          spikes(1, 5),
          spikes(1, 5),
          spikes(2, 8),
          pillars([2, 1, 2], 6, 4),
          coinAt(-9, 3.6),
          spikePit(2, 6),
          smallSpikes(3, 7),
          ledge(6, 2, 6),
          spikes(2, 8),
          coinAt(-5, 3),
        ]),
      },
    ],
  },
  {
    id: 'reef',
    name: 'Arrecife Neón',
    emoji: '🌊',
    mechanic: 'Trampolines, aros y cohete',
    speed: 290,
    decor: 'bubble',
    palette: {
      skyTop: '#1fb6d6',
      skyBottom: '#9ff3e4',
      decor: 'rgba(255, 255, 255, 0.35)',
      ground: '#0f8fae',
      groundDark: '#0b7894',
      line: '#b8fff1',
      block: '#ff8a5c',
      blockInner: '#ffb08a',
      spike: '#ffd93d',
      text: '#0b3a4a',
    },
    music: { bpm: 126, melody: 'E5 G5 A5 B5 A5 G5 E5 D5 E5 G5 B5 D6 B5 A5 G5 -', bass: 'E3 - B2 - C3 - D3 -' },
    levels: [
      {
        name: 'Burbujas',
        ...compose([
          gap(2),
          spikes(1, 7),
          padToPlatform(7),
          coinAt(-11, 5.5),
          spikes(2, 8),
          orbHop(8),
          ledge(5, 1, 6),
          padToPlatform(7),
          spikes(1, 6),
          orbHop(8),
          coinAt(-12, 4.4),
          spikes(2, 8),
          stairs(2, 4, 7),
          coinAt(-6, 2.8),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Trampolín de coral',
        ...compose([
          gap(2),
          padToPlatform(6),
          orbHop(7),
          spikePit(3, 6),
          coinAt(-10, 4),
          padToPlatform(6),
          spikes(2, 7),
          orbHop(6),
          spikyLedge(8, 6),
          orbHop(7),
          coinAt(-10, 4.6),
          pillars([1, 2], 6, 4),
          padToPlatform(6),
          coinAt(-10, 6),
          spikes(2, 8),
        ]),
      },
      {
        name: 'Cohete submarino',
        ...compose([
          gap(2),
          spikes(1, 6),
          toMode('rocket'),
          gap(4),
          rocketGates(['low', 'high', 'low']),
          coinAt(-8, 6),
          rocketTunnel(8),
          rocketGates(['high', 'low', 'high', 'low']),
          coinAt(-10, 1),
          gap(3),
          toMode('cube'),
          gap(4),
          spikes(2, 7),
          padToPlatform(6),
          orbHop(7),
          toMode('rocket'),
          gap(3),
          rocketTunnel(10),
          rocketGates(['low', 'high']),
          coinAt(-10, 5.5),
          toMode('cube'),
          gap(4),
          spikes(1, 6),
        ]),
      },
    ],
  },
  {
    id: 'night',
    name: 'Noche Estrellada',
    emoji: '🌙',
    mechanic: 'Pelota que cambia la gravedad',
    speed: 300,
    decor: 'star',
    palette: {
      skyTop: '#1b1446',
      skyBottom: '#4b33c4',
      decor: 'rgba(255, 255, 255, 0.55)',
      ground: '#2a1f5c',
      groundDark: '#221850',
      line: '#b57bff',
      block: '#5ab0ff',
      blockInner: '#9fd0ff',
      spike: '#ffd93d',
      text: '#ffffff',
    },
    music: { bpm: 112, melody: 'A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 B4 -', bass: 'A2 - E3 - F2 - G2 -' },
    levels: [
      {
        name: 'Luna al revés',
        ...compose([
          gap(2),
          spikes(1, 6),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor']),
          coinAt(-12, 5.5),
          ballIslands(2),
          ballFlips(['ceiling', 'floor', 'ceiling', 'floor']),
          coinAt(-9, 1),
          toMode('cube'),
          gap(4),
          spikes(2, 7),
          ledge(5, 1, 6),
          coinAt(-8, 2.8),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Pelota estelar',
        ...compose([
          gap(2),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor', 'ceiling']),
          coinAt(-16, 5.4),
          ballIslands(3),
          coinAt(-12, 3.5),
          ballFlips(['floor', 'ceiling', 'floor'], 6),
          toMode('cube'),
          gap(4),
          spikePit(3, 6),
          padToPlatform(6),
          coinAt(-10, 6),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor', 'ceiling'], 6),
          toMode('cube'),
          gap(4),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Constelación',
        ...compose([
          gap(2),
          spikes(2, 7),
          toMode('rocket'),
          gap(3),
          rocketGates(['low', 'high', 'low']),
          coinAt(-6, 6),
          toMode('ball'),
          gap(3),
          ballIslands(3),
          ballFlips(['ceiling', 'floor', 'ceiling']),
          coinAt(-5, 3.5),
          toMode('cube'),
          gap(4),
          orbHop(7),
          spikyLedge(8, 6),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor', 'ceiling', 'floor'], 6),
          coinAt(-14, 3.5),
          toMode('cube'),
          gap(4),
          spikes(2, 7),
        ]),
      },
    ],
  },
  {
    id: 'factory',
    name: 'Fábrica de Dulces',
    emoji: '🍭',
    mechanic: 'Sierras giratorias y avión',
    speed: 310,
    decor: 'gear',
    palette: {
      skyTop: '#ffd96b',
      skyBottom: '#ffb59a',
      decor: 'rgba(255, 255, 255, 0.4)',
      ground: '#ff9f43',
      groundDark: '#f08a2c',
      line: '#fff3c4',
      block: '#8b5a2b',
      blockInner: '#b07a46',
      spike: '#ff5f5f',
      text: '#4a2a12',
    },
    music: { bpm: 132, melody: 'G5 G5 E5 C5 D5 E5 G5 - A5 G5 E5 C5 D5 C5 A4 -', bass: 'C3 - E3 - F3 - G3 -' },
    levels: [
      {
        name: 'Sierras de galleta',
        ...compose([
          gap(2),
          sawHop(8),
          spikes(1, 6),
          sawOverLedge(7),
          coinAt(-12, 2.6),
          sawHop(6),
          sawHop(8),
          spikePit(3, 6),
          sawOverLedge(7),
          pillars([1, 2], 6, 4),
          coinAt(-8, 3.6),
          sawHop(7),
          stairs(2, 4, 6),
          coinAt(-6, 3.6),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Avión de papel',
        ...compose([
          gap(2),
          spikes(1, 6),
          toMode('plane'),
          gap(3),
          planeGates([2, 3, 1]),
          coinAt(-8, 5),
          planeSaws(),
          planeGates([3, 2, 3, 1]),
          coinAt(-11, 0.6),
          toMode('cube'),
          gap(4),
          sawHop(7),
          padToPlatform(6),
          toMode('plane'),
          gap(3),
          planeGates([1, 3, 2, 3]),
          coinAt(-15, 5.5),
          toMode('cube'),
          gap(4),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Cinta de caramelo',
        ...compose([
          gap(2),
          sawHop(7),
          orbHop(7),
          toMode('plane'),
          gap(3),
          planeGates([2, 1, 3]),
          planeSaws([[2, 1.5], [6, 4.5]]),
          coinAt(-5, 2.5),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor']),
          toMode('cube'),
          gap(4),
          sawOverLedge(6),
          coinAt(-7, 2.6),
          toMode('rocket'),
          gap(3),
          rocketTunnel(8),
          rocketGates(['low', 'high', 'low']),
          coinAt(-14, 4.5),
          toMode('cube'),
          gap(4),
          spikes(2, 7),
        ]),
      },
    ],
  },
  {
    id: 'rainbow',
    name: 'Castillo Arcoíris',
    emoji: '🌈',
    mechanic: '¡Todo junto y más rápido!',
    speed: 330,
    decor: 'diamond',
    palette: {
      skyTop: '#b57bff',
      skyBottom: '#ffd6e8',
      decor: 'rgba(255, 255, 255, 0.4)',
      ground: '#7b5cff',
      groundDark: '#6a4ae8',
      line: '#ffd93d',
      block: '#4dd4ac',
      blockInner: '#8be8cc',
      spike: '#ff5fa2',
      text: '#2b2140',
      rainbow: true,
    },
    music: { bpm: 138, melody: 'C5 D5 E5 G5 A5 G5 E5 G5 C6 B5 A5 G5 E5 D5 C5 -', bass: 'F2 - G2 - E3 - A2 -' },
    levels: [
      {
        name: 'Puente de colores',
        ...compose([
          gap(2),
          spikes(1, 7),
          stairs(3, 4, 6),
          padToPlatform(6),
          coinAt(-10, 6),
          orbHop(7),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor', 'ceiling']),
          toMode('cube'),
          gap(4),
          sawHop(7),
          spikePit(3, 6),
          coinAt(-10, 2.8),
          spikyLedge(8, 6),
          spikes(2, 7),
          coinAt(-5, 3),
        ]),
      },
      {
        name: 'Torre mágica',
        ...compose([
          gap(2),
          toMode('rocket'),
          gap(3),
          rocketGates(['low', 'high', 'low', 'high']),
          coinAt(-12, 6),
          rocketTunnel(10),
          toMode('plane'),
          gap(3),
          planeGates([2, 1, 3, 2]),
          coinAt(-9, 1),
          planeSaws(),
          toMode('cube'),
          gap(4),
          sawOverLedge(6),
          orbHop(7),
          stairs(3, 4, 6),
          coinAt(-8, 5),
          spikes(2, 7),
        ]),
      },
      {
        name: 'Gran final',
        ...compose([
          gap(2),
          spikes(2, 6),
          padToPlatform(6),
          orbHop(6),
          coinAt(-9, 4.5),
          toMode('ball'),
          gap(3),
          ballIslands(2),
          ballFlips(['floor', 'ceiling', 'floor'], 6),
          toMode('rocket'),
          gap(3),
          rocketGates(['high', 'low', 'high']),
          rocketTunnel(8),
          coinAt(-6, 4.5),
          toMode('plane'),
          gap(3),
          planeGates([1, 3, 2]),
          planeSaws([[2, 4.5], [6, 1.5]]),
          toMode('cube'),
          gap(4),
          sawHop(6),
          spikePit(3, 6),
          spikyLedge(8, 6),
          coinAt(-7, 3.2),
          stairs(3, 4, 6),
          spikes(2, 8),
        ]),
      },
    ],
  },
  {
    id: 'galaxy',
    name: 'Galaxia Gominola',
    emoji: '🪐',
    expert: true,
    mechanic: 'Gravedad al revés y portales rápidos',
    speed: 330,
    decor: 'planet',
    palette: {
      skyTop: '#2a0f5c',
      skyBottom: '#ff6fb5',
      decor: 'rgba(255, 255, 255, 0.5)',
      ground: '#3d1a7a',
      groundDark: '#2f1263',
      line: '#7cffb2',
      block: '#ff6fb5',
      blockInner: '#ffa3d1',
      spike: '#7cffb2',
      text: '#ffffff',
    },
    music: { bpm: 140, melody: 'E5 B5 G5 E5 D5 A5 F#5 D5 C5 G5 E5 C5 D5 E5 F#5 -', bass: 'E2 - D3 - C3 - D3 -' },
    levels: [
      {
        name: 'Patas arriba',
        ...compose([
          gap(2),
          spikes(2, 6),
          toGravity('up'),
          gap(2),
          onCeiling(spikes(1, 6)),
          onCeiling(spikes(2, 6)),
          coinAt(-5, 4.5),
          onCeiling(ledge(4, 1, 6)),
          toGravity('down'),
          gap(2),
          spikes(2, 5),
          spikyLedge(8, 5),
          coinAt(-8, 3.2),
          toGravity('up'),
          gap(2),
          onCeiling(stairs(2, 4, 6)),
          onCeiling(spikes(2, 6)),
          toGravity('down'),
          gap(2),
          spikes(1, 5),
          coinAt(-3, 3),
          spikes(2, 7),
        ]),
      },
      {
        name: 'Cometa veloz',
        ...compose([
          gap(2),
          spikes(1, 5),
          toSpeed(true),
          gap(3),
          spikes(1, 7),
          spikes(2, 8),
          coinAt(-5, 3),
          ledge(5, 1, 7),
          toSpeed(false),
          spikeSandwich(2, 6),
          toGravity('up'),
          gap(2),
          onCeiling(spikePit(3, 6)),
          coinAt(-9, 4.2),
          onCeiling(spikes(2, 6)),
          toGravity('down'),
          gap(2),
          toSpeed(true),
          gap(3),
          spikes(1, 8),
          spikes(2, 8),
          coinAt(-5, 3),
          toSpeed(false),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Agujero de gusano',
        ...compose([
          gap(2),
          spikes(2, 5),
          toGravity('up'),
          gap(2),
          onCeiling(spikes(2, 5)),
          onCeiling(spikyLedge(8, 5)),
          coinAt(-8, 3.8),
          toGravity('down'),
          gap(2),
          spikeSandwich(2, 5),
          padToPlatform(5),
          toSpeed(true),
          gap(3),
          spikes(1, 7),
          spikes(1, 7),
          coinAt(-4, 2.8),
          toSpeed(false),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor', 'ceiling'], 6),
          toMode('cube'),
          gap(4),
          toGravity('up'),
          gap(2),
          onCeiling(stairs(3, 4, 6)),
          coinAt(-9, 3),
          onCeiling(spikes(2, 6)),
          toGravity('down'),
          gap(2),
          spikes(2, 7),
        ]),
      },
    ],
  },
  {
    id: 'magnet',
    name: 'Planeta Imán',
    emoji: '🧲',
    expert: true,
    mechanic: 'Imán que salta al techo y aros azules',
    speed: 340,
    decor: 'ring',
    palette: {
      skyTop: '#0f3d3e',
      skyBottom: '#4dd4ac',
      decor: 'rgba(255, 255, 255, 0.35)',
      ground: '#155e5f',
      groundDark: '#0f4a4b',
      line: '#ffd93d',
      block: '#ff5f5f',
      blockInner: '#ff9a9a',
      spike: '#ffd93d',
      text: '#ffffff',
    },
    music: { bpm: 144, melody: 'A4 E5 A5 E5 G5 D5 G4 D5 F5 C5 F4 C5 E5 B4 E5 -', bass: 'A2 - G2 - F2 - E2 -' },
    levels: [
      {
        name: 'Atracción',
        ...compose([
          gap(2),
          spikes(1, 6),
          toMode('magnet'),
          gap(3),
          magnetFlips(['floor', 'ceiling', 'floor']),
          coinAt(-9, 3.5),
          magnetPillars(3),
          magnetFlips(['ceiling', 'floor', 'ceiling', 'floor']),
          coinAt(-7, 3.5),
          toMode('cube'),
          gap(4),
          gravityOrbHop(3),
          onCeiling(spikes(2, 5)),
          toGravity('down'),
          gap(2),
          spikes(2, 6),
          coinAt(-4, 3),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Aros azules',
        ...compose([
          gap(2),
          spikes(2, 6),
          gravityOrbHop(3),
          onCeiling(spikes(1, 5)),
          coinAt(-3, 4.2),
          onCeiling(ledge(4, 1, 5)),
          toGravity('down'),
          gap(2),
          spikePit(3, 5),
          gravityOrbHop(3),
          onCeiling(spikePit(3, 5)),
          coinAt(-8, 4.2),
          toGravity('down'),
          gap(2),
          toMode('magnet'),
          gap(3),
          magnetPillars(4, 5),
          magnetFlips(['floor', 'ceiling', 'floor', 'ceiling'], 5),
          coinAt(-12, 3.5),
          toMode('cube'),
          gap(4),
          spikes(2, 7),
        ]),
      },
      {
        name: 'Tormenta magnética',
        ...compose([
          gap(2),
          toMode('magnet'),
          gap(3),
          magnetFlips(['floor', 'ceiling', 'floor', 'ceiling', 'floor'], 5),
          coinAt(-14, 3.5),
          toSpeed(true),
          gap(2),
          magnetPillars(3, 6),
          toSpeed(false),
          toMode('rocket'),
          gap(3),
          rocketGates(['high', 'low', 'high']),
          coinAt(-20, 1.5),
          toMode('cube'),
          gap(4),
          gravityOrbHop(3),
          onCeiling(spikes(2, 5)),
          onCeiling(spikyLedge(8, 5)),
          toGravity('down'),
          gap(2),
          spikeSandwich(2, 5),
          coinAt(-4, 3),
          toMode('magnet'),
          gap(3),
          magnetFlips(['ceiling', 'floor', 'ceiling'], 5),
          toMode('cube'),
          gap(4),
          spikes(2, 7),
        ]),
      },
    ],
  },
  {
    id: 'disco',
    name: 'Tormenta Disco',
    emoji: '🪩',
    expert: true,
    mechanic: 'Onda en zigzag y ¡el Gran Jefe!',
    speed: 350,
    decor: 'disco',
    palette: {
      skyTop: '#140a2e',
      skyBottom: '#5a1fa8',
      decor: 'rgba(255, 255, 255, 0.5)',
      ground: '#2b1060',
      groundDark: '#220c4d',
      line: '#ff5fd2',
      block: '#5ab0ff',
      blockInner: '#9fd0ff',
      spike: '#ff5fd2',
      text: '#ffffff',
      rainbow: true,
    },
    music: { bpm: 150, melody: 'C5 C5 G5 C5 A#4 A#4 F5 A#4 G#4 G#4 D#5 G#4 G4 B4 D5 G5', bass: 'C3 C3 A#2 A#2 G#2 G#2 G2 G2' },
    levels: [
      {
        name: 'Onda disco',
        ...compose([
          gap(2),
          spikes(1, 6),
          toMode('wave'),
          gap(3),
          waveGates([1, 3, 2]),
          coinAt(-8, 4.5),
          waveSpikes(8, 3),
          waveGates([3, 1, 3, 1], 6),
          coinAt(-10, 2.5),
          toMode('cube'),
          gap(4),
          spikes(2, 6),
          spikyLedge(8, 5),
          toMode('wave'),
          gap(3),
          waveGates([0, 2, 4, 2]),
          coinAt(-5, 3.5),
          toMode('cube'),
          gap(4),
          spikes(1, 6),
        ]),
      },
      {
        name: 'Luces locas',
        ...compose([
          gap(2),
          toMode('wave'),
          gap(3),
          waveGates([2, 4, 1, 3]),
          coinAt(-14, 5.5),
          toSpeed(true),
          gap(2),
          waveSpikes(10, 3),
          toSpeed(false),
          toMode('plane'),
          gap(3),
          planeGates([2, 1, 3], 6),
          coinAt(-6, 4.5),
          toMode('magnet'),
          gap(3),
          magnetFlips(['floor', 'ceiling', 'floor'], 5),
          toMode('cube'),
          gap(4),
          toGravity('up'),
          gap(2),
          onCeiling(spikes(2, 5)),
          coinAt(-3, 4.5),
          toGravity('down'),
          gap(2),
          spikes(2, 7),
        ]),
      },
      {
        name: '👑 El Gran Jefe',
        boss: true,
        ...compose([
          gap(2),
          spikes(2, 5),
          padToPlatform(5),
          orbHop(5),
          toMode('ball'),
          gap(3),
          ballFlips(['floor', 'ceiling', 'floor'], 6),
          toMode('rocket'),
          gap(3),
          rocketGates(['low', 'high', 'low']),
          coinAt(-16, 5.5),
          toMode('plane'),
          gap(3),
          planeGates([1, 3, 2], 6),
          toMode('magnet'),
          gap(3),
          magnetFlips(['ceiling', 'floor', 'ceiling'], 5),
          toMode('wave'),
          gap(3),
          waveGates([1, 3, 1, 3]),
          coinAt(-8, 2.5),
          toSpeed(true),
          gap(2),
          waveSpikes(8, 3),
          toSpeed(false),
          toMode('cube'),
          gap(4),
          toGravity('up'),
          gap(2),
          onCeiling(spikes(2, 5)),
          onCeiling(spikyLedge(8, 5)),
          toGravity('down'),
          gap(2),
          gravityOrbHop(3),
          onCeiling(spikes(1, 5)),
          toGravity('down'),
          gap(2),
          sawHop(6),
          spikeSandwich(2, 5),
          coinAt(-4, 3),
          spikes(2, 8),
        ]),
      },
    ],
  },
  // Mundo secreto: no se abre al terminar el anterior, sino al juntar muchas monedas (ver achievements.js).
  {
    id: 'dragon',
    name: 'Cueva del Dragón',
    emoji: '🐉',
    expert: true,
    secret: true,
    mechanic: '¡Nivel secreto para las más valientes!',
    speed: 350,
    decor: 'star',
    palette: {
      skyTop: '#1a0505',
      skyBottom: '#8a1a1a',
      decor: 'rgba(255, 193, 26, 0.55)',
      ground: '#3b0f0f',
      groundDark: '#2a0a0a',
      line: '#ffc21a',
      block: '#ffc21a',
      blockInner: '#ffe27a',
      spike: '#ff5a1f',
      text: '#ffffff',
    },
    music: { bpm: 156, melody: 'D5 F5 A5 D6 C6 A5 F5 A5 A#4 D5 F5 A#5 A5 F5 E5 C#5', bass: 'D3 D3 A#2 A#2 F2 F2 A2 A2' },
    levels: [
      {
        name: '🐉 La Cueva del Dragón',
        ...compose([
          gap(2),
          spikes(3, 6),
          spikyLedge(8, 5),
          toSpeed(true),
          gap(2),
          spikes(1, 7),
          spikes(2, 8),
          coinAt(-5, 3),
          toSpeed(false),
          toGravity('up'),
          gap(2),
          onCeiling(spikePit(3, 5)),
          onCeiling(spikes(2, 5)),
          toGravity('down'),
          gap(2),
          toMode('wave'),
          gap(3),
          waveGates([1, 4, 1, 4, 2]),
          coinAt(-10, 5.5),
          waveSpikes(8, 3),
          toMode('magnet'),
          gap(3),
          magnetPillars(3, 5),
          magnetFlips(['ceiling', 'floor', 'ceiling', 'floor'], 5),
          toMode('ball'),
          gap(3),
          ballIslands(2),
          ballFlips(['floor', 'ceiling', 'floor'], 6),
          toMode('plane'),
          gap(3),
          planeGates([3, 1, 3, 1]),
          planeSaws([[2, 1.5], [6, 5]]),
          toMode('rocket'),
          gap(3),
          rocketTunnel(8),
          rocketGates(['high', 'low', 'high', 'low']),
          toMode('cube'),
          gap(4),
          gravityOrbHop(3),
          onCeiling(spikyLedge(8, 5)),
          toGravity('down'),
          gap(2),
          sawOverLedge(5),
          spikeSandwich(3, 5),
          coinAt(-4, 3.2),
          spikes(3, 8),
        ]),
      },
    ],
  },
];

/** Lista plana de niveles con su mundo, en orden de desbloqueo. */
export const GEO_LEVELS = GEO_WORLDS.flatMap((world, worldIndex) =>
  world.levels.map((level, levelInWorld) => ({
    ...level,
    id: `${world.id}-${levelInWorld + 1}`,
    label: `${worldIndex + 1}-${levelInWorld + 1}`,
    world,
    worldIndex,
    modes: [...new Set(['cube', ...level.objects.filter((object) => object.type === 'portal').map((object) => object.mode)])].filter((mode) =>
      MODES.includes(mode),
    ),
    portals: new Set(level.objects.filter((object) => object.type === 'portal').map((object) => object.mode)),
  })),
);

GEO_LEVELS.forEach((level, index) => {
  level.index = index;
  level.secret = Boolean(level.world.secret);
});

/** Niveles que se abren uno tras otro (todos menos el secreto). */
export const MAIN_LEVELS = GEO_LEVELS.filter((level) => !level.secret);

