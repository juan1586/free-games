import { CELL } from './physics.js';

/**
 * Dibujo de las piezas del nivel. `view` traduce coordenadas de mundo (y hacia arriba)
 * a pantalla: sx = x - view.x, sy = view.floor - (y - view.y).
 */

export const PORTAL_STYLES = {
  cube: { color: '#4dd4ac', icon: '🟪', label: 'Cubo' },
  rocket: { color: '#ff5fa2', icon: '🚀', label: 'Cohete' },
  ball: { color: '#ff9f43', icon: '🔵', label: 'Pelota' },
  plane: { color: '#5ab0ff', icon: '✈️', label: 'Avión' },
  magnet: { color: '#ff5f5f', icon: '🧲', label: 'Imán' },
  wave: { color: '#ff5fd2', icon: '〰️', label: 'Onda' },
  flipUp: { color: '#b57bff', icon: '🙃', label: 'Patas arriba' },
  flipDown: { color: '#4dd4ac', icon: '🙂', label: 'Al derecho' },
  fast: { color: '#ff9f43', icon: '⏩', label: 'Más rápido', fast: true },
  normalSpeed: { color: '#5ab0ff', icon: '▶️', label: 'Velocidad normal', fast: true },
};

const GOLD = '#ffd93d';
const GOLD_DARK = '#e0a800';

const toScreenX = (view, x) => x - view.x;
const toScreenY = (view, y) => view.floor - (y - view.y);

function drawBlock(ctx, block, view, palette) {
  const x = toScreenX(view, block.x);
  const y = toScreenY(view, block.y + block.h);
  ctx.fillStyle = palette.block;
  ctx.beginPath();
  ctx.roundRect(x, y, block.w, block.h, 6);
  ctx.fill();

  ctx.fillStyle = palette.blockInner;
  for (let cx = 0; cx < block.w; cx += CELL) {
    for (let cy = 0; cy < block.h; cy += CELL) {
      ctx.beginPath();
      ctx.roundRect(x + cx + 7, y + cy + 7, CELL - 14, CELL - 14, 5);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, block.w - 2, block.h - 2, 6);
  ctx.stroke();
}

function drawSpike(ctx, spike, view, palette) {
  const height = spike.small ? CELL / 2 : CELL;
  const x = toScreenX(view, spike.x);
  const baseY = toScreenY(view, spike.flip ? spike.y + CELL : spike.y);
  const tipY = spike.flip ? baseY + height : baseY - height;
  const gradient = ctx.createLinearGradient(0, baseY, 0, tipY);
  gradient.addColorStop(0, palette.spike);
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x + 3, baseY);
  ctx.lineTo(x + CELL / 2, tipY);
  ctx.lineTo(x + CELL - 3, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(43, 33, 64, 0.55)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawSaw(ctx, saw, view, palette, time) {
  const x = toScreenX(view, saw.cx);
  const y = toScreenY(view, saw.cy);
  const teeth = 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-time * 5);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i += 1) {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? saw.r : saw.r * 0.78;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = '#ecebf7';
  ctx.fill();
  ctx.strokeStyle = 'rgba(43, 33, 64, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, saw.r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = palette.spike;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, saw.r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function drawPad(ctx, pad, view, time, isUsed) {
  const x = toScreenX(view, pad.x);
  const y = toScreenY(view, pad.y);
  const squash = isUsed ? 0.6 : 1 + Math.sin(time * 8) * 0.08;
  ctx.fillStyle = 'rgba(255, 217, 61, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x + CELL / 2, y, CELL * 0.6, 16 * squash, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.ellipse(x + CELL / 2, y, CELL * 0.42, 9 * squash, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawOrb(ctx, orb, view, time, isUsed) {
  const x = toScreenX(view, orb.cx);
  const y = toScreenY(view, orb.cy);
  const pulse = isUsed ? 0 : Math.sin(time * 6) * 3;
  const isGravity = orb.kind === 'gravity';
  ctx.globalAlpha = isUsed ? 0.35 : 1;
  ctx.fillStyle = isGravity ? 'rgba(90, 176, 255, 0.35)' : 'rgba(255, 217, 61, 0.3)';
  ctx.beginPath();
  ctx.arc(x, y, 22 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isGravity ? '#5ab0ff' : GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff8d6';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPortal(ctx, portal, view, time) {
  const style = PORTAL_STYLES[portal.mode];
  const x = toScreenX(view, portal.x);
  const y = toScreenY(view, portal.cy);
  const wobble = Math.sin(time * 5) * 3;
  ctx.save();
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 64 + wobble, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 64 + wobble, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Los portales de velocidad llevan flechas dentro.
  if (style.fast) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    [-22, 0, 22].forEach((dy) => {
      ctx.beginPath();
      ctx.moveTo(x - 6, y + dy - 8);
      ctx.lineTo(x + 7, y + dy);
      ctx.lineTo(x - 6, y + dy + 8);
      ctx.fill();
    });
  }
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.icon, x, y - 92 - wobble);
}

/** Moneda estrella. `isGhost` = ya conseguida en otra partida (se ve translúcida). */
export function drawCoin(ctx, x, y, time, isGhost = false) {
  const spin = Math.abs(Math.cos(time * 3)) * 0.75 + 0.25;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = isGhost ? 0.4 : 1;
  ctx.fillStyle = 'rgba(255, 217, 61, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(spin, 1);
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const radius = i % 2 === 0 ? 8 : 3.6;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Dibuja las piezas visibles. used: ids ya activados en este intento;
 * savedCoins: monedas conseguidas en partidas anteriores.
 */
export function drawObjects(ctx, objects, { view, palette, time, used, savedCoins, viewWidth }) {
  const minX = view.x - CELL * 2;
  const maxX = view.x + viewWidth + CELL * 2;
  objects.forEach((object) => {
    if (object.right < minX || object.left > maxX) return;
    const isUsed = used.has(object.id);
    switch (object.type) {
      case 'block':
        drawBlock(ctx, object, view, palette);
        break;
      case 'spike':
        drawSpike(ctx, object, view, palette);
        break;
      case 'saw':
        drawSaw(ctx, object, view, palette, time);
        break;
      case 'pad':
        drawPad(ctx, object, view, time, isUsed);
        break;
      case 'orb':
        drawOrb(ctx, object, view, time, isUsed);
        break;
      case 'portal':
        drawPortal(ctx, object, view, time);
        break;
      case 'coin':
        if (!isUsed) drawCoin(ctx, toScreenX(view, object.cx), toScreenY(view, object.cy), time, savedCoins[object.coinIndex]);
        break;
      default:
        break;
    }
  });
}

/** Meta: franja de cuadros y bandera. */
export function drawFinish(ctx, endX, view, height) {
  const x = toScreenX(view, endX);
  const size = 14;
  for (let row = 0; row * size < height; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#2b2140';
      ctx.fillRect(x + col * size, row * size, size, size);
    }
  }
  ctx.font = '34px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('🏁', x + 30, view.floor - 10);
}
