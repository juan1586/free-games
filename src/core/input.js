const SWIPE_MIN_DISTANCE = 30;
const HOLD_REPEAT_DELAY_MS = 180;

/**
 * Asocia teclas a acciones. `bindings` es { accion: ['ArrowUp', 'Space', ...] } usando event.code.
 * Devuelve una función para desuscribirse.
 */
export function bindKeyboard(bindings, { onPress, onRelease }) {
  const keyToAction = new Map();
  Object.entries(bindings).forEach(([action, keys]) => keys.forEach((key) => keyToAction.set(key, action)));

  function handleKeyDown(event) {
    const action = keyToAction.get(event.code);
    if (!action || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    onPress?.(action, event.repeat);
  }

  function handleKeyUp(event) {
    const action = keyToAction.get(event.code);
    if (action) onRelease?.(action);
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}

/** Detecta tap y swipes sobre un elemento. Devuelve una función para desuscribirse. */
export function bindTouchGestures(element, { onTap, onSwipe, onRelease }) {
  let startX = 0;
  let startY = 0;
  let swiped = false;

  function handleStart(event) {
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    swiped = false;
    event.preventDefault();
  }

  function handleMove(event) {
    if (swiped) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_DISTANCE) return;
    swiped = true;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const direction = isHorizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    onSwipe?.(direction);
  }

  function handleEnd(event) {
    event.preventDefault();
    if (!swiped) onTap?.();
    onRelease?.();
  }

  element.addEventListener('touchstart', handleStart, { passive: false });
  element.addEventListener('touchmove', handleMove, { passive: true });
  element.addEventListener('touchend', handleEnd, { passive: false });
  return () => {
    element.removeEventListener('touchstart', handleStart);
    element.removeEventListener('touchmove', handleMove);
    element.removeEventListener('touchend', handleEnd);
  };
}

/**
 * En el iPhone, Safari puede agrandar la pantalla al tocar rápido un control aunque tenga
 * `touch-action: none`. Cancelar el `touchstart` lo evita (los eventos pointer siguen llegando).
 */
export function blockTouchZoom(element) {
  const cancel = (event) => event.cancelable && event.preventDefault();
  element.addEventListener('touchstart', cancel, { passive: false });
  return () => element.removeEventListener('touchstart', cancel);
}

/** Botón táctil que dispara la acción al presionar y, opcionalmente, la repite mientras se mantiene. */
export function bindHoldButton(button, { onPress, onRelease, repeatMs = 0 }) {
  let repeatTimer = null;
  let delayTimer = null;
  let pressed = false;

  function clearTimers() {
    clearTimeout(delayTimer);
    clearInterval(repeatTimer);
    delayTimer = null;
    repeatTimer = null;
  }

  function handleDown(event) {
    event.preventDefault();
    pressed = true;
    button.classList.add('is-pressed');
    onPress();
    if (repeatMs > 0) {
      delayTimer = setTimeout(() => {
        repeatTimer = setInterval(onPress, repeatMs);
      }, HOLD_REPEAT_DELAY_MS);
    }
  }

  function handleUp() {
    if (!pressed) return;
    pressed = false;
    button.classList.remove('is-pressed');
    clearTimers();
    onRelease?.();
  }

  const events = [
    ['pointerdown', handleDown],
    ['pointerup', handleUp],
    ['pointerleave', handleUp],
    ['pointercancel', handleUp],
  ];
  events.forEach(([name, handler]) => button.addEventListener(name, handler));
  const unblockZoom = blockTouchZoom(button);
  return () => {
    clearTimers();
    unblockZoom();
    events.forEach(([name, handler]) => button.removeEventListener(name, handler));
  };
}
