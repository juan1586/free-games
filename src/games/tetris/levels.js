/**
 * Mundos de Tetris. Cada uno cambia los colores de las piezas y el fondo, la velocidad
 * inicial y cuántas líneas hay que hacer para superarlo. Las estrellas dependen de los puntos.
 * Orden de colores: I, J, L, O, S, T, Z.
 */
export const TETRIS_WORLDS = [
  {
    id: 'rainbow',
    name: 'Arcoíris',
    emoji: '🌈',
    goalLines: 10,
    startLevel: 1,
    starScores: [1800, 3200],
    theme: {
      background: 'linear-gradient(160deg, #ffd6e8 0%, #fff3c4 50%, #d4f5ff 100%)',
      board: '#2b2350',
      grid: 'rgba(255,255,255,0.06)',
      text: '#2b2140',
      pieces: ['#4dd4ff', '#5a7bff', '#ff9f43', '#ffd93d', '#4dd47a', '#b57bff', '#ff5f7e'],
    },
  },
  {
    id: 'ocean',
    name: 'Océano',
    emoji: '🐠',
    goalLines: 15,
    startLevel: 2,
    starScores: [3500, 6500],
    theme: {
      background: 'linear-gradient(160deg, #a8f0ff 0%, #4fb8e8 60%, #2a6fc9 100%)',
      board: '#0e2f5a',
      grid: 'rgba(160,220,255,0.08)',
      text: '#0e2f5a',
      pieces: ['#7af5ff', '#3d8bff', '#ff8a5c', '#ffe56b', '#5cf2b4', '#c98bff', '#ff6b9d'],
    },
  },
  {
    id: 'candy',
    name: 'Caramelos',
    emoji: '🍭',
    goalLines: 20,
    startLevel: 3,
    starScores: [7500, 13000],
    theme: {
      background: 'linear-gradient(160deg, #ffc2e2 0%, #ffe4f1 45%, #c9f2ff 100%)',
      board: '#5a1f4f',
      grid: 'rgba(255,200,230,0.08)',
      text: '#5a1f4f',
      pieces: ['#9ff2ff', '#ff9ad5', '#ffb86b', '#fff09a', '#a6ffcb', '#e3a6ff', '#ff7a9c'],
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxia',
    emoji: '🪐',
    goalLines: 25,
    startLevel: 4,
    starScores: [13000, 22000],
    theme: {
      background: 'radial-gradient(circle at 30% 20%, #6b4bd6 0%, #2a1b6b 45%, #120b35 100%)',
      board: '#0d0826',
      grid: 'rgba(180,160,255,0.08)',
      text: '#f5f0ff',
      pieces: ['#5ef0ff', '#6c8cff', '#ffa86b', '#ffe866', '#6bffb0', '#d17bff', '#ff5fa2'],
    },
  },
  {
    id: 'forest',
    name: 'Bosque Mágico',
    emoji: '🍄',
    goalLines: 30,
    startLevel: 5,
    starScores: [19000, 32000],
    theme: {
      background: 'linear-gradient(160deg, #c6f7b0 0%, #6fd49a 50%, #2f8f6b 100%)',
      board: '#173d2e',
      grid: 'rgba(200,255,220,0.07)',
      text: '#173d2e',
      pieces: ['#8ff7e6', '#6aa8ff', '#ffb35c', '#ffe45c', '#9cff6b', '#e08bff', '#ff6b6b'],
    },
  },
];

export const LINES_PER_LEVEL = 10;

/** Segundos que tarda una pieza en bajar una fila. Más suave que el Tetris clásico. */
export function getFallInterval(level) {
  return Math.max(0.07, 0.85 * Math.pow(0.84, level - 1));
}

export function calculateStars(world, score) {
  const [twoStars, threeStars] = world.starScores;
  if (score >= threeStars) return 3;
  if (score >= twoStars) return 2;
  return 1;
}
