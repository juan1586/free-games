const MAX_DELTA_SECONDS = 1 / 20;

/** Bucle con delta time que se detiene solo al ocultar la pestaña. */
export function createGameLoop({ update, render, onAutoPause }) {
  let frameId = null;
  let lastTime = 0;
  let running = false;

  function frame(time) {
    if (!running) return;
    // El primer cuadro puede traer una marca de tiempo anterior a start(): nunca un delta negativo.
    const delta = Math.max(0, Math.min((time - lastTime) / 1000, MAX_DELTA_SECONDS));
    lastTime = time;
    update(delta);
    render();
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  }

  function handleVisibilityChange() {
    if (document.hidden && running) {
      stop();
      onAutoPause?.();
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    start,
    stop,
    isRunning: () => running,
    destroy() {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    },
  };
}
