/**
 * Estadísticas anónimas de uso con GoatCounter (sin cookies ni datos personales).
 * Solo se envían rutas (p. ej. /dino/jugar?mundo=1) y eventos con nombre fijo: nunca nombres
 * de jugador ni códigos de sala. Panel: https://jpg1586.goatcounter.com
 * Solo funciona en el sitio publicado (en `npm run dev` no se carga).
 */

const ENDPOINT = 'https://jpg1586.goatcounter.com/count';
const SCRIPT_URL = 'https://gc.zgo.at/count.js';

const pending = [];
let lastPage = null;

const isReady = () => typeof window.goatcounter?.count === 'function';

function count(vars) {
  if (!import.meta.env.PROD) return;
  if (isReady()) window.goatcounter.count(vars);
  else pending.push(vars);
}

function loadScript() {
  if (!import.meta.env.PROD) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = SCRIPT_URL;
  script.dataset.goatcounter = ENDPOINT;
  // Las visitas las contamos nosotros en cada cambio de pantalla (el router usa el hash).
  script.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
  script.addEventListener('load', () => {
    if (isReady()) pending.splice(0).forEach((vars) => window.goatcounter.count(vars));
  });
  document.head.append(script);
}

/** Cuenta una visita a una pantalla. Las repeticiones seguidas (p. ej. al cambiar de jugador) no cuentan. */
export function trackPage(path, title) {
  if (path === lastPage) return;
  lastPage = path;
  count({ path, title });
}

/** Cuenta un evento (p. ej. "carrera-creada-dino"). */
export function trackEvent(name, title = name) {
  count({ path: name, title, event: true });
}

loadScript();
