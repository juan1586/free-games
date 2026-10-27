/**
 * Apariencias desbloqueables (figura, colores, estela, carita) y dibujo del jugador
 * en sus cuatro modos: cubo, cohete, pelota y avión. `stars` es lo que hace falta para desbloquear.
 */

export const SHAPES = [
  { id: 'cube', name: 'Cubo', stars: 0 },
  { id: 'cat', name: 'Gatito', stars: 3 },
  { id: 'hexagon', name: 'Hexágono', stars: 7 },
  { id: 'star', name: 'Estrella', stars: 12 },
  { id: 'heart', name: 'Corazón', stars: 18 },
  { id: 'robot', name: 'Robot', stars: 26 },
];

export const COLORS = [
  { id: 'grape', name: 'Uva', primary: '#7b5cff', secondary: '#ffd93d', stars: 0 },
  { id: 'bubblegum', name: 'Chicle', primary: '#ff5fa2', secondary: '#ffffff', stars: 0 },
  { id: 'mint', name: 'Menta', primary: '#4dd4ac', secondary: '#fff3c4', stars: 2 },
  { id: 'sky', name: 'Cielo', primary: '#5ab0ff', secondary: '#ffd6e8', stars: 5 },
  { id: 'sunny', name: 'Sol', primary: '#ffd93d', secondary: '#ff5fa2', stars: 9 },
  { id: 'tangerine', name: 'Mandarina', primary: '#ff9f43', secondary: '#7b5cff', stars: 14 },
  { id: 'cherry', name: 'Cereza', primary: '#ff5f5f', secondary: '#4dd4ac', stars: 20 },
  { id: 'midnight', name: 'Medianoche', primary: '#2b2140', secondary: '#7cffb2', stars: 30 },
];

export const TRAILS = [
  { id: 'none', name: 'Sin estela', icon: '✖️', stars: 0 },
  { id: 'sparkle', name: 'Chispas', icon: '✨', stars: 4 },
  { id: 'bubbles', name: 'Burbujas', icon: '🫧', stars: 10 },
  { id: 'hearts', name: 'Corazones', icon: '💖', stars: 16 },
  { id: 'rainbow', name: 'Arcoíris', icon: '🌈', stars: 24 },
];

export const FACES = [
  { id: 'happy', name: 'Feliz', icon: '😊', stars: 0 },
  { id: 'wink', name: 'Guiño', icon: '😉', stars: 3 },
  { id: 'surprised', name: 'Sorpresa', icon: '😮', stars: 8 },
  { id: 'cool', name: 'Gafas', icon: '😎', stars: 13 },
];

export const SKIN_GROUPS = [
  { key: 'shape', title: 'Figura', items: SHAPES },
  { key: 'color', title: 'Colores', items: COLORS },
  { key: 'trail', title: 'Estela', items: TRAILS },
  { key: 'face', title: 'Carita', items: FACES },
];

export const RAINBOW = ['#ff5f5f', '#ff9f43', '#ffd93d', '#4dd4ac', '#5ab0ff', '#b57bff'];

const OUTLINE = 'rgba(43, 33, 64, 0.85)';
const INK = '#2b2140';

const findById = (items, id) => items.find((item) => item.id === id) ?? items[0];

/** Devuelve la apariencia con objetos completos; si algo guardado ya no existe, usa el primero. */
export function resolveSkin(skin = {}) {
  return {
    shape: findById(SHAPES, skin.shape),
    color: findById(COLORS, skin.color),
    trail: findById(TRAILS, skin.trail),
    face: findById(FACES, skin.face),
  };
}

// ---------- Siluetas (centradas en 0,0) ----------

function polygonPath(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function regularPolygon(ctx, sides, radius, rotation = 0) {
  polygonPath(
    ctx,
    Array.from({ length: sides }, (_, i) => {
      const angle = rotation + (i / sides) * Math.PI * 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    }),
  );
}

function starPath(ctx, outer, inner) {
  polygonPath(
    ctx,
    Array.from({ length: 10 }, (_, i) => {
      const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const radius = i % 2 === 0 ? outer : inner;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    }),
  );
}

function heartPath(ctx, h) {
  ctx.beginPath();
  ctx.moveTo(0, h * 0.95);
  ctx.bezierCurveTo(-h * 1.3, h * 0.1, -h * 0.95, -h * 1.05, 0, -h * 0.45);
  ctx.bezierCurveTo(h * 0.95, -h * 1.05, h * 1.3, h * 0.1, 0, h * 0.95);
  ctx.closePath();
}

const SHAPE_PATHS = {
  cube: (ctx, h) => {
    ctx.beginPath();
    ctx.roundRect(-h, -h, h * 2, h * 2, h * 0.3);
  },
  cat: (ctx, h) => {
    ctx.beginPath();
    ctx.moveTo(-h * 0.85, -h * 0.25);
    ctx.lineTo(-h * 0.7, -h * 1.05);
    ctx.lineTo(-h * 0.2, -h * 0.75);
    ctx.arc(0, h * 0.05, h * 0.92, -Math.PI * 0.6, -Math.PI * 0.4);
    ctx.lineTo(h * 0.7, -h * 1.05);
    ctx.lineTo(h * 0.85, -h * 0.25);
    ctx.arc(0, h * 0.05, h * 0.92, -Math.PI * 0.1, Math.PI * 1.1);
    ctx.closePath();
  },
  hexagon: (ctx, h) => regularPolygon(ctx, 6, h * 1.08, Math.PI / 6),
  star: (ctx, h) => starPath(ctx, h * 1.2, h * 0.62),
  heart: (ctx, h) => heartPath(ctx, h * 1.05),
  robot: (ctx, h) => {
    ctx.beginPath();
    ctx.roundRect(-h, -h * 0.8, h * 2, h * 1.8, h * 0.2);
  },
};

function drawFace(ctx, faceId, h) {
  const eyeY = -h * 0.08;
  const leftX = -h * 0.22;
  const rightX = h * 0.38;
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, h * 0.11);

  if (faceId === 'cool') {
    ctx.beginPath();
    ctx.roundRect(leftX - h * 0.26, eyeY - h * 0.16, h * 0.9, h * 0.3, h * 0.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(leftX - h * 0.15, eyeY - h * 0.1, h * 0.12, h * 0.06);
  } else if (faceId === 'surprised') {
    [leftX, rightX].forEach((eyeX) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, h * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(eyeX + h * 0.05, eyeY, h * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.beginPath();
    ctx.arc(rightX, eyeY, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
    if (faceId === 'wink') {
      ctx.beginPath();
      ctx.moveTo(leftX - h * 0.12, eyeY);
      ctx.lineTo(leftX + h * 0.12, eyeY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(leftX, eyeY, h * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  if (faceId === 'surprised') ctx.arc(h * 0.08, h * 0.36, h * 0.11, 0, Math.PI * 2);
  else ctx.arc(h * 0.08, h * 0.2, h * 0.24, Math.PI * 0.15, Math.PI * 0.85);
  if (faceId === 'surprised') ctx.fill();
  else ctx.stroke();

  if (faceId !== 'cool') {
    ctx.fillStyle = 'rgba(255, 95, 162, 0.45)';
    ctx.beginPath();
    ctx.arc(-h * 0.5, h * 0.2, h * 0.12, 0, Math.PI * 2);
    ctx.arc(h * 0.66, h * 0.2, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Figura con colores y carita, centrada en el origen actual del contexto. */
export function drawIcon(ctx, skin, h) {
  const { shape, color, face } = skin;
  SHAPE_PATHS[shape.id](ctx, h);
  ctx.fillStyle = color.primary;
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.12);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.save();
  ctx.scale(0.62, 0.62);
  SHAPE_PATHS[shape.id](ctx, h);
  ctx.fillStyle = color.secondary;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.restore();

  if (shape.id === 'robot') {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1.5, h * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.8);
    ctx.lineTo(0, -h * 1.15);
    ctx.stroke();
    ctx.fillStyle = color.secondary;
    ctx.beginPath();
    ctx.arc(0, -h * 1.2, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  drawFace(ctx, face.id, h);
}

// ---------- Modos ----------

function drawBall(ctx, skin, h, angle) {
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, h, 0, Math.PI * 2);
  ctx.fillStyle = skin.color.primary;
  ctx.fill();
  ctx.fillStyle = skin.color.secondary;
  [0, Math.PI].forEach((start) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, h, start, start + Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(0, 0, h, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, h * 0.12);
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  drawFace(ctx, skin.face.id, h * 0.55);
  ctx.restore();
}

function drawRocket(ctx, skin, h, tilt, time) {
  ctx.save();
  ctx.rotate(tilt);
  const flicker = 0.75 + Math.sin(time * 40) * 0.25;
  const flame = ctx.createLinearGradient(-h * 2.2, 0, -h * 0.9, 0);
  flame.addColorStop(0, 'rgba(255, 217, 61, 0)');
  flame.addColorStop(1, '#ff9f43');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-h * 0.9, -h * 0.35);
  ctx.lineTo(-h * (1.3 + flicker), 0);
  ctx.lineTo(-h * 0.9, h * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = Math.max(2, h * 0.1);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.fillStyle = skin.color.secondary;
  polygonPath(ctx, [[-h * 0.7, -h * 0.4], [-h * 1.15, -h * 0.95], [-h * 0.2, -h * 0.45]]);
  ctx.fill();
  ctx.stroke();
  polygonPath(ctx, [[-h * 0.7, h * 0.4], [-h * 1.15, h * 0.95], [-h * 0.2, h * 0.45]]);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 0, h * 1.25, h * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin.color.primary;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(h * 0.15, 0, h * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = '#e9f6ff';
  ctx.fill();
  ctx.stroke();
  ctx.translate(h * 0.15, 0);
  ctx.rotate(-tilt);
  drawIcon(ctx, skin, h * 0.3);
  ctx.restore();
}

function drawPlane(ctx, skin, h, tilt) {
  ctx.save();
  ctx.rotate(tilt);
  ctx.save();
  ctx.translate(-h * 0.1, -h * 0.45);
  ctx.rotate(-tilt * 0.5);
  drawIcon(ctx, skin, h * 0.45);
  ctx.restore();

  ctx.lineWidth = Math.max(2, h * 0.1);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  polygonPath(ctx, [[h * 1.3, h * 0.05], [-h * 1.1, -h * 0.15], [-h * 0.55, h * 0.3]]);
  ctx.fillStyle = skin.color.primary;
  ctx.fill();
  ctx.stroke();
  polygonPath(ctx, [[h * 1.3, h * 0.05], [-h * 0.55, h * 0.3], [-h * 0.75, h * 0.8]]);
  ctx.fillStyle = skin.color.secondary;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja al jugador centrado en (x, y) de pantalla. angle: giro del cubo/pelota;
 * tilt: inclinación del cohete/avión según su velocidad vertical.
 */
export function drawPlayer(ctx, skin, { x, y, size, mode = 'cube', angle = 0, tilt = 0, time = 0, flipped = false }) {
  const h = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (mode === 'cube') {
    ctx.rotate(angle);
    drawIcon(ctx, skin, h);
  } else if (mode === 'ball') {
    if (flipped) ctx.scale(1, -1);
    drawBall(ctx, skin, h, angle);
  } else if (mode === 'rocket') {
    drawRocket(ctx, skin, h, tilt, time);
  } else {
    drawPlane(ctx, skin, h, tilt);
  }
  ctx.restore();
}
