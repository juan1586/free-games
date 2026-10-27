import { el } from '../../ui/dom.js';

/** Distancia máxima que se mueve la bolita, como parte del tamaño del joystick (en el celular es más pequeño). */
const RANGE = 0.36;

/**
 * Joystick táctil para caminar. `vector` tiene x (derecha) e y (adelante) entre -1 y 1.
 * Devuelve { element, vector, reset, destroy }.
 */
export function createJoystick() {
  const knob = el('span', { className: 'park-joystick__knob' });
  const element = el('div', { className: 'park-joystick', attrs: { 'aria-hidden': 'true' } }, [knob]);
  const vector = { x: 0, y: 0 };
  let pointerId = null;

  function moveTo(event) {
    const rect = element.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const range = rect.width * RANGE;
    const distance = Math.hypot(dx, dy);
    if (distance > range) {
      dx *= range / distance;
      dy *= range / distance;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    vector.x = dx / range;
    vector.y = -dy / range;
  }

  function reset() {
    pointerId = null;
    vector.x = 0;
    vector.y = 0;
    knob.style.transform = '';
  }

  function handleDown(event) {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    element.setPointerCapture(pointerId);
    moveTo(event);
  }

  function handleMove(event) {
    if (event.pointerId === pointerId) moveTo(event);
  }

  function handleUp(event) {
    if (event.pointerId === pointerId) reset();
  }

  const events = [
    ['pointerdown', handleDown],
    ['pointermove', handleMove],
    ['pointerup', handleUp],
    ['pointercancel', handleUp],
  ];
  events.forEach(([name, handler]) => element.addEventListener(name, handler));
  return {
    element,
    vector,
    reset,
    destroy: () => events.forEach(([name, handler]) => element.removeEventListener(name, handler)),
  };
}
