import { RAINBOW, drawHat } from './accessories.js';
import { DINO_WORLDS, savedMedals } from './worlds.js';

/**
 * Tipos de dinosaurio. Cada uno tiene colores propios, rasgos de dibujo y una pequeña
 * diferencia de física para que elegir uno u otro se note al jugar.
 */
export const DINOS = [
  {
    id: 'trex',
    name: 'T-Rex',
    description: 'Fuerte y equilibrado',
    colors: { body: '#4dd4ac', belly: '#c8f7e6', accent: '#1e9e7a' },
    features: ['arms', 'teeth'],
    physics: { jumpVelocity: 820, gravity: 2500, scale: 1 },
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    description: 'Salta muy alto',
    colors: { body: '#ff9f43', belly: '#ffe0b8', accent: '#d9661a' },
    features: ['horns', 'frill'],
    physics: { jumpVelocity: 900, gravity: 2650, scale: 1 },
  },
  {
    id: 'ptero',
    name: 'Pterodáctilo',
    description: 'Planea en el aire',
    colors: { body: '#b57bff', belly: '#ecdcff', accent: '#7d3ff0' },
    features: ['wings', 'crest'],
    physics: { jumpVelocity: 740, gravity: 1900, scale: 0.95 },
  },
  {
    id: 'stego',
    name: 'Estegosaurio',
    description: 'Grande y valiente',
    colors: { body: '#ff6b9d', belly: '#ffd6e5', accent: '#e0336f' },
    features: ['plates', 'spikes'],
    physics: { jumpVelocity: 840, gravity: 2550, scale: 1.05 },
  },
  {
    id: 'baby',
    name: 'Bebé Dino',
    description: 'Pequeñito y difícil de tocar',
    colors: { body: '#5ab0ff', belly: '#d8ecff', accent: '#2a7fd9' },
    features: ['egg', 'baby'],
    physics: { jumpVelocity: 780, gravity: 2450, scale: 0.8 },
  },
  // Se ganan al llegar a la meta de un mundo para expertos (`unlockWorld`).
  {
    id: 'dragon',
    name: 'Dragoncito',
    description: 'Planea y echa chispas',
    unlockWorld: 'candy',
    colors: { body: '#ff5f5f', belly: '#ffe066', accent: '#c92a2a' },
    features: ['wings', 'dragonHorns', 'spikes'],
    physics: { jumpVelocity: 790, gravity: 2050, scale: 1 },
  },
  {
    id: 'unidino',
    name: 'Unidino',
    description: 'Mágico y saltarín',
    unlockWorld: 'escape',
    colors: { body: '#ffffff', belly: '#ffe1f4', accent: '#b57bff' },
    features: ['mane', 'unicornHorn'],
    physics: { jumpVelocity: 880, gravity: 2550, scale: 1 },
  },
];

/** ¿Tiene este dino disponible el jugador? Los especiales se ganan al llegar a la meta de su mundo. */
export function isDinoUnlocked(dino, data) {
  if (!dino.unlockWorld) return true;
  const worldIndex = DINO_WORLDS.findIndex((world) => world.id === dino.unlockWorld);
  return savedMedals(data, worldIndex).length > 0;
}

export function getDino(id) {
  return DINOS.find((dino) => dino.id === id) ?? DINOS[0];
}

export const DINO_SIZE = { width: 54, height: 58, duckWidth: 70, duckHeight: 34 };

function drawLegs(ctx, colors, runPhase, onGround) {
  ctx.fillStyle = colors.accent;
  const swing = onGround ? Math.sin(runPhase) * 6 : 3;
  ctx.fillRect(14 + swing, -14, 9, 14);
  ctx.fillRect(28 - swing, -14, 9, 14);
  ctx.fillRect(12 + swing, -4, 13, 4);
  ctx.fillRect(26 - swing, -4, 13, 4);
}

function drawTail(ctx, colors) {
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.moveTo(8, -36);
  ctx.quadraticCurveTo(-14, -34, -18, -22);
  ctx.quadraticCurveTo(-4, -22, 10, -18);
  ctx.closePath();
  ctx.fill();
}

function drawBody(ctx, colors) {
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(26, -28, 22, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.belly;
  ctx.beginPath();
  ctx.ellipse(30, -22, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(ctx, colors, blink) {
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(46, -48, 15, 12, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(56, -44, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ojo grande y amistoso
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(48, -52, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2140';
  if (blink) {
    ctx.fillRect(43, -52, 10, 2);
  } else {
    ctx.beginPath();
    ctx.arc(49.5, -52, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(50.5, -53.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mejilla y sonrisa
  ctx.fillStyle = 'rgba(255, 120, 160, 0.55)';
  ctx.beginPath();
  ctx.arc(55, -44, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2140';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(58, -43, 4, 0.2, Math.PI * 0.8);
  ctx.stroke();
}

const FEATURE_PAINTERS = {
  arms(ctx, colors) {
    ctx.fillStyle = colors.accent;
    ctx.fillRect(42, -30, 8, 4);
    ctx.fillRect(48, -30, 3, 7);
  },
  teeth(ctx) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(60, -40);
    ctx.lineTo(62, -36);
    ctx.lineTo(64, -40);
    ctx.fill();
  },
  horns(ctx) {
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.moveTo(44, -58);
    ctx.lineTo(52, -74);
    ctx.lineTo(50, -58);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(59, -49);
    ctx.lineTo(68, -56);
    ctx.lineTo(62, -45);
    ctx.fill();
  },
  frill(ctx, colors) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.ellipse(34, -54, 9, 14, -0.5, 0, Math.PI * 2);
    ctx.fill();
  },
  wings(ctx, colors, frame) {
    const flap = Math.sin(frame * 0.4) * 10;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(18, -38);
    ctx.lineTo(4, -62 - flap);
    ctx.lineTo(34, -40);
    ctx.closePath();
    ctx.fill();
  },
  crest(ctx, colors) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(38, -56);
    ctx.lineTo(24, -66);
    ctx.lineTo(42, -60);
    ctx.fill();
  },
  plates(ctx, colors) {
    ctx.fillStyle = colors.accent;
    [8, 18, 28, 38].forEach((x, index) => {
      const height = index === 1 || index === 2 ? 16 : 11;
      ctx.beginPath();
      ctx.moveTo(x - 6, -40 + Math.abs(x - 26) * 0.2);
      ctx.lineTo(x, -40 - height);
      ctx.lineTo(x + 6, -40 + Math.abs(x - 26) * 0.2);
      ctx.fill();
    });
  },
  spikes(ctx) {
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.lineTo(-22, -34);
    ctx.lineTo(-10, -30);
    ctx.fill();
  },
  egg(ctx) {
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.moveTo(4, -20);
    for (let index = 0; index <= 6; index += 1) {
      ctx.lineTo(4 + index * 7.5, index % 2 === 0 ? -20 : -26);
    }
    ctx.lineTo(50, -14);
    ctx.quadraticCurveTo(26, 4, 2, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffcfe1';
    ctx.beginPath();
    ctx.arc(16, -12, 3, 0, Math.PI * 2);
    ctx.arc(36, -10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  },
  dragonHorns(ctx) {
    ctx.fillStyle = '#ffe066';
    [[40, -58], [48, -60]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y - 12);
      ctx.lineTo(x + 5, y);
      ctx.fill();
    });
  },
  mane(ctx) {
    RAINBOW.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(34 - index * 3.5, -56 + index * 5, 6, 4, -0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  unicornHorn(ctx) {
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.moveTo(46, -58);
    ctx.lineTo(54, -78);
    ctx.lineTo(53, -57);
    ctx.closePath();
    ctx.fill();
  },
  baby(ctx, colors) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(44, -62, 3, 0, Math.PI * 2);
    ctx.fill();
  },
};

/**
 * Dibuja un dino con el origen en sus pies (x, y = suelo).
 * frame avanza continuamente para animar piernas, alas y parpadeo.
 */
export function drawDino(ctx, dino, { x, y, frame = 0, ducking = false, onGround = true, hurt = false, hat = 'none' }) {
  const { colors, features, physics } = dino;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(physics.scale, physics.scale);
  if (ducking) ctx.scale(1.25, 0.6);
  if (hurt) ctx.globalAlpha = 0.85;

  const blink = frame % 160 > 152;
  const runPhase = frame * 0.45;
  const backFeatures = ['plates', 'frill', 'wings', 'spikes'];
  const frontFeatures = features.filter((feature) => !backFeatures.includes(feature));

  drawTail(ctx, colors);
  features.filter((feature) => backFeatures.includes(feature)).forEach((feature) => FEATURE_PAINTERS[feature](ctx, colors, frame));
  if (!features.includes('egg')) drawLegs(ctx, colors, runPhase, onGround);
  drawBody(ctx, colors);
  drawHead(ctx, colors, blink || hurt);
  frontFeatures.forEach((feature) => FEATURE_PAINTERS[feature](ctx, colors, frame));
  if (features.includes('egg')) drawLegs(ctx, colors, runPhase, onGround);
  drawHat(ctx, hat);

  ctx.restore();
}
