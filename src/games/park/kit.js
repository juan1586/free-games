/**
 * Utilidades de three.js para el parque: materiales y geometrías compartidas (se crean una vez por
 * partida y se liberan juntas al salir) y etiquetas de texto en 3D dibujadas en un canvas.
 */
import * as THREE from 'three';

const LABEL_WIDTH = 512;
const LABEL_HEIGHT = 128;

export function createKit() {
  const materials = new Map();
  const geometries = new Map();
  const extras = new Set();

  function mat(color, { opacity = 1, emissive = 0, side = THREE.FrontSide } = {}) {
    const key = `${color}|${opacity}|${emissive}|${side}`;
    if (!materials.has(key)) {
      materials.set(
        key,
        new THREE.MeshLambertMaterial({ color, emissive, side, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
      );
    }
    return materials.get(key);
  }

  function geometry(key, factory) {
    if (!geometries.has(key)) geometries.set(key, factory());
    return geometries.get(key);
  }

  const mesh = (geo, color, options) => new THREE.Mesh(geo, mat(color, options));

  const kit = {
    mat,
    geometry,
    box: (w, h, d, color, options) => mesh(geometry(`box|${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)), color, options),
    cyl: (rTop, rBottom, h, color, segments = 12, options) =>
      mesh(geometry(`cyl|${rTop}|${rBottom}|${h}|${segments}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, segments)), color, options),
    cone: (r, h, color, segments = 10, options) =>
      mesh(geometry(`cone|${r}|${h}|${segments}`, () => new THREE.ConeGeometry(r, h, segments)), color, options),
    sphere: (r, color, segments = 10, options) =>
      mesh(geometry(`sphere|${r}|${segments}`, () => new THREE.SphereGeometry(r, segments, Math.max(6, segments - 2))), color, options),
    torus: (r, tube, color, options) =>
      mesh(geometry(`torus|${r}|${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 24)), color, options),
    /** Disco plano en el suelo (caminos, plazas, sombras). */
    disc: (r, color, options) => {
      const disc = mesh(geometry(`disc|${r}`, () => new THREE.CircleGeometry(r, 32)), color, options);
      disc.rotation.x = -Math.PI / 2;
      return disc;
    },
    /** Rectángulo plano en el suelo. */
    plane: (w, d, color, options) => {
      const plane = mesh(geometry(`plane|${w}|${d}`, () => new THREE.PlaneGeometry(w, d)), color, options);
      plane.rotation.x = -Math.PI / 2;
      return plane;
    },
    /** Guarda algo para liberarlo al final (geometrías hechas a mano, texturas…). */
    track(disposable) {
      extras.add(disposable);
      return disposable;
    },
    label: (text, options) => createLabel(kit, text, options),
    dispose() {
      materials.forEach((material) => material.dispose());
      geometries.forEach((geo) => geo.dispose());
      extras.forEach((item) => item.dispose());
      materials.clear();
      geometries.clear();
      extras.clear();
    },
  };
  return kit;
}

/** Coloca un objeto y lo devuelve (para encadenar al crear). */
export function at(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

/**
 * Cartel o bocadillo de texto que siempre mira a la cámara. El texto se pinta con fillText
 * (no es HTML), así que los nombres del jugador se muestran tal cual.
 * Devuelve { sprite, setText(text) }.
 */
function createLabel(kit, text, { background = 'rgba(255,255,255,0.92)', color = '#2b2140', height = 0.5, bubble = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext('2d');
  const texture = kit.track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = kit.track(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(height * (LABEL_WIDTH / LABEL_HEIGHT), height, 1);

  function setText(value) {
    const content = String(value);
    ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
    let fontSize = 64;
    ctx.font = `600 ${fontSize}px Fredoka, 'Segoe UI Rounded', system-ui, sans-serif`;
    while (ctx.measureText(content).width > LABEL_WIDTH - 60 && fontSize > 24) {
      fontSize -= 4;
      ctx.font = `600 ${fontSize}px Fredoka, 'Segoe UI Rounded', system-ui, sans-serif`;
    }
    const width = Math.min(LABEL_WIDTH - 8, ctx.measureText(content).width + 48);
    const left = (LABEL_WIDTH - width) / 2;
    const boxHeight = bubble ? LABEL_HEIGHT - 28 : LABEL_HEIGHT - 16;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(left, 8, width, boxHeight, 36);
    ctx.fill();
    if (bubble) {
      ctx.beginPath();
      ctx.moveTo(LABEL_WIDTH / 2 - 16, 8 + boxHeight - 2);
      ctx.lineTo(LABEL_WIDTH / 2 + 16, 8 + boxHeight - 2);
      ctx.lineTo(LABEL_WIDTH / 2, LABEL_HEIGHT - 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(content, LABEL_WIDTH / 2, 8 + boxHeight / 2 + 2);
    texture.needsUpdate = true;
  }

  setText(text);
  return { sprite, setText };
}

