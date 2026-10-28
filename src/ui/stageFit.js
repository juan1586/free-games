/**
 * Ajuste del lienzo de los juegos de correr (Dino y Salto Geométrico) a cualquier pantalla.
 * El alto lógico es fijo y el ancho lógico se adapta:
 * - Celular en horizontal: el escenario ocupa toda la pantalla y se ve más pista por delante.
 * - Celular en vertical: la vista se hace más estrecha (la pista se ve más grande).
 * - Tablet y PC: el juego ocupa el ancho sin pasarse del alto de la ventana.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Celular en horizontal: juego a pantalla completa con la cabecera y los botones encima. */
export const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 560px)';
/** Celular o tablet en vertical. */
export const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 900px)';

const MIN_DISPLAY_HEIGHT = 180;
const STAGE_BOTTOM_MARGIN = 14;
const CONTROLS_GAP = 14;
/** Algunos móviles actualizan el alto de la ventana un poco después de girar. */
const REFIT_AFTER_ROTATION_MS = 300;

/**
 * Mide y ajusta. `onChange(viewWidth)` se llama cuando cambia el ancho lógico (para rehacer el
 * contexto del canvas). Devuelve { fit(), destroy() }.
 */
export function createStageFit({ page, stage, canvas, header, controls, viewHeight, minWidth, portraitMinWidth, landscapeMinWidth, maxWidth, onChange }) {
  let current = 0;
  let refitTimer = 0;

  function fit() {
    const landscapePhone = matchMedia(LANDSCAPE_PHONE_QUERY).matches;
    let min = minWidth;
    if (matchMedia(PORTRAIT_QUERY).matches) min = portraitMinWidth;
    else if (landscapePhone) min = landscapeMinWidth;
    const width = stage.clientWidth;
    let viewWidth = min;
    if (width > 0 && landscapePhone) {
      // El escenario llena la pantalla: el lienzo se estira a lo alto y, si sobra, queda abajo (arriba va la cabecera).
      const height = stage.clientHeight;
      viewWidth = clamp(Math.round((viewHeight * width) / Math.max(1, height)), min, maxWidth);
      const displayHeight = Math.min(height, (width * viewHeight) / viewWidth);
      canvas.style.width = `${Math.round((displayHeight * viewWidth) / viewHeight)}px`;
      canvas.style.height = `${Math.round(displayHeight)}px`;
    } else if (width > 0) {
      canvas.style.width = '';
      canvas.style.height = '';
      // El juego empieza justo debajo de la cabecera; los botones, si van debajo, también ocupan sitio.
      const rowGap = parseFloat(getComputedStyle(page).rowGap) || 0;
      const stageTop = header.getBoundingClientRect().bottom + window.scrollY + rowGap;
      const controlsDisplay = getComputedStyle(controls).display;
      const controlsBelow = controlsDisplay !== 'none' && controlsDisplay !== 'contents';
      const reserved = controlsBelow ? controls.offsetHeight + CONTROLS_GAP : 0;
      const available = window.innerHeight - stageTop - reserved - STAGE_BOTTOM_MARGIN;
      const displayHeight = Math.min((width * viewHeight) / min, Math.max(available, MIN_DISPLAY_HEIGHT));
      viewWidth = clamp(Math.round((viewHeight * width) / displayHeight), min, maxWidth);
    }
    canvas.style.aspectRatio = `${viewWidth} / ${viewHeight}`;
    if (viewWidth === current) return;
    current = viewWidth;
    onChange(viewWidth);
  }

  const handleResize = () => {
    fit();
    clearTimeout(refitTimer);
    refitTimer = setTimeout(fit, REFIT_AFTER_ROTATION_MS);
  };
  window.addEventListener('resize', handleResize);
  // La animación de entrada desplaza la página unos píxeles: se vuelve a medir al terminar.
  const handleAnimationEnd = (event) => event.target === page && fit();
  page.addEventListener('animationend', handleAnimationEnd);

  return {
    fit,
    destroy() {
      window.removeEventListener('resize', handleResize);
      page.removeEventListener('animationend', handleAnimationEnd);
      clearTimeout(refitTimer);
    },
  };
}
