/**
 * Tienda del Dino: gorros y estelas que se compran con las monedas recogidas.
 * Los gorros se dibujan en las coordenadas del dino (origen en los pies, cabeza en torno a 46, -48).
 */

export const HATS = [
  { id: 'none', name: 'Sin gorro', icon: '🙂', price: 0 },
  { id: 'bow', name: 'Lazo', icon: '🎀', price: 30 },
  { id: 'glasses', name: 'Gafas de sol', icon: '😎', price: 60 },
  { id: 'crown', name: 'Corona', icon: '👑', price: 100 },
  { id: 'pirate', name: 'Pirata', icon: '🏴‍☠️', price: 150 },
  { id: 'tophat', name: 'Chistera', icon: '🎩', price: 200 },
  { id: 'astronaut', name: 'Casco espacial', icon: '🚀', price: 300 },
  { id: 'horn', name: 'Cuerno mágico', icon: '🦄', price: 450 },
];

export const DINO_TRAILS = [
  { id: 'none', name: 'Sin estela', icon: '✖️', price: 0 },
  { id: 'sparkle', name: 'Chispas', icon: '✨', price: 120 },
  { id: 'hearts', name: 'Corazones', icon: '💖', price: 250 },
  { id: 'rainbow', name: 'Arcoíris', icon: '🌈', price: 400 },
];

export const RAINBOW = ['#ff5f5f', '#ff9f43', '#ffd93d', '#4dd4ac', '#5ab0ff', '#b57bff'];

const findById = (items, id) => items.find((item) => item.id === id) ?? items[0];
export const getHat = (id) => findById(HATS, id);
export const getDinoTrail = (id) => findById(DINO_TRAILS, id);

/** ¿Se puede usar? Lo gratis siempre; lo demás, si se compró. */
export const isOwned = (data, item) => item.price === 0 || data.owned.includes(item.id);

const HAT_PAINTERS = {
  bow(ctx) {
    ctx.fillStyle = '#ff5fa2';
    ctx.beginPath();
    ctx.moveTo(40, -60);
    ctx.lineTo(30, -68);
    ctx.lineTo(30, -54);
    ctx.closePath();
    ctx.moveTo(40, -60);
    ctx.lineTo(50, -68);
    ctx.lineTo(50, -54);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff9fc8';
    ctx.beginPath();
    ctx.arc(40, -61, 3.5, 0, Math.PI * 2);
    ctx.fill();
  },
  glasses(ctx) {
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.roundRect(41, -57, 13, 9, 3);
    ctx.fill();
    ctx.fillRect(36, -55, 6, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(44, -55, 4, 2);
  },
  crown(ctx) {
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.moveTo(34, -58);
    ctx.lineTo(34, -72);
    ctx.lineTo(40, -64);
    ctx.lineTo(45, -75);
    ctx.lineTo(50, -64);
    ctx.lineTo(56, -72);
    ctx.lineTo(56, -58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5f5f';
    ctx.beginPath();
    ctx.arc(45, -63, 2.5, 0, Math.PI * 2);
    ctx.fill();
  },
  pirate(ctx) {
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.moveTo(28, -58);
    ctx.quadraticCurveTo(45, -50, 62, -58);
    ctx.quadraticCurveTo(56, -64, 52, -72);
    ctx.quadraticCurveTo(45, -78, 38, -72);
    ctx.quadraticCurveTo(34, -64, 28, -58);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(45, -65, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  tophat(ctx) {
    ctx.fillStyle = '#2b2140';
    ctx.fillRect(32, -61, 26, 4);
    ctx.fillRect(37, -80, 16, 20);
    ctx.fillStyle = '#ff5f5f';
    ctx.fillRect(37, -66, 16, 4);
  },
  astronaut(ctx) {
    ctx.fillStyle = 'rgba(190, 235, 255, 0.35)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(49, -48, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(42, -58, 5, 3, -0.6, 0, Math.PI * 2);
    ctx.fill();
  },
  horn(ctx) {
    const gradient = ctx.createLinearGradient(42, -60, 50, -82);
    RAINBOW.forEach((color, index) => gradient.addColorStop(index / (RAINBOW.length - 1), color));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(40, -58);
    ctx.lineTo(50, -84);
    ctx.lineTo(50, -58);
    ctx.closePath();
    ctx.fill();
  },
};

/** Dibuja el gorro (si lo hay) con el contexto ya colocado en los pies del dino. */
export function drawHat(ctx, hatId) {
  HAT_PAINTERS[hatId]?.(ctx);
}
