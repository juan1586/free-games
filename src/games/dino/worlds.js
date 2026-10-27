/**
 * Mundos del Dino. Cada uno define paleta, fondo, obstáculos, velocidad y la distancia
 * (en metros) que hay que recorrer para desbloquear el siguiente.
 */
export const DINO_WORLDS = [
  {
    id: 'desert',
    name: 'Desierto',
    emoji: '🏜️',
    goal: 400,
    speed: { start: 330, max: 560 },
    flyersFrom: 150,
    palette: {
      skyTop: '#7fd3ff',
      skyBottom: '#ffe7a8',
      far: '#ffc98a',
      near: '#f7a964',
      ground: '#f2b264',
      groundDetail: '#d98b3f',
      obstacle: '#3fb27f',
      obstacleDetail: '#2a8a5f',
      flyer: '#8b5cf6',
      sun: '#ffd93d',
    },
    ground: ['cactus', 'cactusTall', 'cactusDouble'],
    flyer: 'bird',
    particles: null,
  },
  {
    id: 'jungle',
    name: 'Selva',
    emoji: '🌴',
    goal: 600,
    speed: { start: 360, max: 600 },
    flyersFrom: 80,
    palette: {
      skyTop: '#6fe3c1',
      skyBottom: '#d9ffe9',
      far: '#38b77c',
      near: '#21935f',
      ground: '#7a5230',
      groundDetail: '#5b3a1f',
      obstacle: '#8b5a2b',
      obstacleDetail: '#5f3a17',
      flyer: '#ff5f5f',
      sun: '#fff27a',
    },
    ground: ['log', 'rock', 'bush'],
    flyer: 'parrot',
    particles: 'leaves',
  },
  {
    id: 'snow',
    name: 'Nieve',
    emoji: '❄️',
    goal: 800,
    speed: { start: 390, max: 640 },
    flyersFrom: 60,
    palette: {
      skyTop: '#9ec9ff',
      skyBottom: '#eef6ff',
      far: '#d6e6ff',
      near: '#b8d2f5',
      ground: '#ffffff',
      groundDetail: '#cfe0f7',
      obstacle: '#ffffff',
      obstacleDetail: '#7fb2ff',
      flyer: '#5ab0ff',
      sun: '#fff8d6',
    },
    ground: ['snowman', 'iceSpike', 'iceSpikeDouble'],
    flyer: 'bird',
    particles: 'snow',
  },
  {
    id: 'volcano',
    name: 'Volcán',
    emoji: '🌋',
    goal: 1000,
    speed: { start: 420, max: 680 },
    flyersFrom: 40,
    palette: {
      skyTop: '#ff8a5c',
      skyBottom: '#ffd2a1',
      far: '#a8475a',
      near: '#7a2f45',
      ground: '#4a2b3a',
      groundDetail: '#ff7a3d',
      obstacle: '#3b2433',
      obstacleDetail: '#ff9d3d',
      flyer: '#ff5a1f',
      sun: '#ffe066',
    },
    ground: ['lavaRock', 'cone', 'rock'],
    flyer: 'fireball',
    particles: 'embers',
  },
  {
    id: 'space',
    name: 'Espacio',
    emoji: '🚀',
    goal: 1200,
    speed: { start: 450, max: 720 },
    flyersFrom: 30,
    alwaysNight: true,
    palette: {
      skyTop: '#1b1446',
      skyBottom: '#5a3fa8',
      far: '#3b2d7a',
      near: '#2a1f5c',
      ground: '#8f86c9',
      groundDetail: '#6b62a8',
      obstacle: '#4dd4ff',
      obstacleDetail: '#b57bff',
      flyer: '#7cffb2',
      sun: '#f5f0ff',
    },
    ground: ['crystal', 'crystalDouble', 'crater'],
    flyer: 'ufo',
    particles: 'stars',
  },
];

/** Tamaño de cada tipo de obstáculo (ancho, alto) en píxeles lógicos. */
export const OBSTACLE_SIZES = {
  cactus: [24, 42],
  cactusTall: [28, 58],
  cactusDouble: [50, 44],
  log: [54, 28],
  rock: [42, 30],
  bush: [40, 40],
  snowman: [32, 52],
  iceSpike: [24, 46],
  iceSpikeDouble: [46, 40],
  lavaRock: [44, 34],
  cone: [50, 44],
  crystal: [26, 50],
  crystalDouble: [48, 42],
  crater: [52, 26],
  bird: [44, 28],
  parrot: [44, 30],
  fireball: [38, 30],
  ufo: [50, 28],
};

function cactusArm(ctx, x, y, w, h, flip) {
  ctx.fillRect(x, y, w, 6);
  ctx.fillRect(flip ? x : x + w - 6, y - h, 6, h);
}

function drawCactus(ctx, x, y, w, h, palette) {
  ctx.fillStyle = palette.obstacle;
  const trunkW = Math.min(14, w * 0.5);
  const trunkX = x + (w - trunkW) / 2;
  ctx.beginPath();
  ctx.roundRect(trunkX, y, trunkW, h, [trunkW / 2, trunkW / 2, 2, 2]);
  ctx.fill();
  cactusArm(ctx, x, y + h * 0.45, trunkX - x + 2, h * 0.25, true);
  cactusArm(ctx, trunkX + trunkW - 2, y + h * 0.35, x + w - trunkX - trunkW + 2, h * 0.2, false);
  ctx.fillStyle = palette.obstacleDetail;
  ctx.fillRect(trunkX + trunkW / 2 - 1, y + 6, 2, h - 10);
}

const OBSTACLE_PAINTERS = {
  cactus: drawCactus,
  cactusTall: drawCactus,
  cactusDouble(ctx, x, y, w, h, palette) {
    drawCactus(ctx, x, y + 8, w * 0.48, h - 8, palette);
    drawCactus(ctx, x + w * 0.52, y, w * 0.48, h, palette);
  },
  log(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = '#d9a066';
    ctx.beginPath();
    ctx.ellipse(x + w - h / 2, y + h / 2, h / 2 - 3, h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.obstacleDetail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w - h / 2, y + h / 2, h / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4dd47a';
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 2, 8, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  },
  rock(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.15, y + h * 0.3);
    ctx.lineTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.85, y + h * 0.25);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.4);
    ctx.lineTo(x + w * 0.5, y + 4);
    ctx.lineTo(x + w * 0.45, y + h * 0.5);
    ctx.fill();
  },
  bush(ctx, x, y, w, h) {
    ctx.fillStyle = '#2fae6a';
    [[0.3, 0.6, 0.32], [0.7, 0.6, 0.32], [0.5, 0.35, 0.36]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, w * r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillRect(x + w * 0.1, y + h * 0.6, w * 0.8, h * 0.4);
    ctx.fillStyle = '#ff6b9d';
    [[0.3, 0.4], [0.65, 0.3], [0.5, 0.7]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  snowman(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.strokeStyle = palette.obstacleDetail;
    ctx.lineWidth = 2;
    [[0.5, 0.74, 0.5], [0.5, 0.42, 0.36], [0.5, 0.16, 0.26]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(x + w * cx, y + h * cy, w * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.15);
    ctx.lineTo(x + w * 0.85, y + h * 0.18);
    ctx.lineTo(x + w * 0.5, y + h * 0.21);
    ctx.fill();
    ctx.fillStyle = '#2b2140';
    ctx.fillRect(x + w * 0.38, y + h * 0.1, 3, 3);
    ctx.fillStyle = '#ff5f5f';
    ctx.fillRect(x + w * 0.2, y + h * 0.27, w * 0.6, 4);
  },
  iceSpike(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w / 2, y + 6);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.fill();
  },
  iceSpikeDouble(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.iceSpike(ctx, x, y + 10, w * 0.5, h - 10, palette);
    OBSTACLE_PAINTERS.iceSpike(ctx, x + w * 0.45, y, w * 0.55, h, palette);
  },
  lavaRock(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.rock(ctx, x, y, w, h, { obstacleDetail: palette.obstacle });
    ctx.strokeStyle = palette.obstacleDetail;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w * 0.45, y + h * 0.5);
    ctx.lineTo(x + w * 0.6, y + h * 0.3);
    ctx.moveTo(x + w * 0.45, y + h * 0.5);
    ctx.lineTo(x + w * 0.7, y + h * 0.7);
    ctx.stroke();
  },
  cone(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.38, y + 6);
    ctx.lineTo(x + w * 0.62, y + 6);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 6, w * 0.13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + w * 0.45, y + 6, 4, h * 0.4);
  },
  crystal(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.obstacle;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h * 0.3);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.lineTo(x, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.lineTo(x, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  crystalDouble(ctx, x, y, w, h, palette) {
    OBSTACLE_PAINTERS.crystal(ctx, x, y + 12, w * 0.5, h - 12, { obstacle: palette.obstacleDetail });
    OBSTACLE_PAINTERS.crystal(ctx, x + w * 0.45, y, w * 0.55, h, palette);
  },
  crater(ctx, x, y, w, h, palette) {
    ctx.fillStyle = palette.groundDetail;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, w / 2, h, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = palette.obstacleDetail;
    ctx.beginPath();
    ctx.arc(x + w * 0.3, y + h * 0.6, 4, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.45, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  bird(ctx, x, y, w, h, palette, frame) {
    const flap = Math.sin(frame * 0.3) * h * 0.45;
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.55, y + h * 0.5 - flap);
    ctx.lineTo(x + w * 0.65, y + h * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.2, y + h * 0.45, h * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, y + h * 0.42);
    ctx.lineTo(x - 4, y + h * 0.5);
    ctx.lineTo(x + w * 0.08, y + h * 0.54);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.18, y + h * 0.4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  },
  parrot(ctx, x, y, w, h, palette, frame) {
    OBSTACLE_PAINTERS.bird(ctx, x, y, w, h, palette, frame);
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(x + w * 0.75, y + h * 0.5, w * 0.25, 4);
    ctx.fillStyle = '#5ab0ff';
    ctx.fillRect(x + w * 0.75, y + h * 0.5 + 4, w * 0.22, 3);
  },
  fireball(ctx, x, y, w, h, palette, frame) {
    const wobble = Math.sin(frame * 0.5) * 3;
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.2 + wobble);
    ctx.lineTo(x + w * 0.4, y + h * 0.5);
    ctx.lineTo(x + w, y + h * 0.8 - wobble);
    ctx.fill();
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.arc(x + h / 2, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(x + h / 2 - 2, y + h / 2 - 2, h / 4, 0, Math.PI * 2);
    ctx.fill();
  },
  ufo(ctx, x, y, w, h, palette, frame) {
    ctx.fillStyle = 'rgba(200, 240, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.4, w * 0.22, h * 0.35, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = palette.flyer;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.55, w / 2, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ['#ffd93d', '#ff5fa2', '#5ab0ff'].forEach((color, index) => {
      ctx.fillStyle = (Math.floor(frame / 8) + index) % 3 === 0 ? '#fff' : color;
      ctx.beginPath();
      ctx.arc(x + w * (0.25 + index * 0.25), y + h * 0.58, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  },
};

export function drawObstacle(ctx, kind, x, y, palette, frame) {
  const [w, h] = OBSTACLE_SIZES[kind];
  OBSTACLE_PAINTERS[kind](ctx, x, y, w, h, palette, frame);
}
