# Juegos Gratis — contexto para Claude

Sitio de juegos para las hijas del usuario (niñas pequeñas): **Dino Corre**, **Bloques Mágicos** (Tetris) y **Salto Geométrico** (estilo Geometry Dash). Se juega en tablet y PC. Diseño infantil-moderno, colores vivos, perdonador con los errores.

## Stack y comandos

- Vite 5 + JavaScript puro (sin framework). Única dependencia de runtime: `peerjs`, cargada con `import()` solo en el modo carrera. Node 18 en local (Vite 7 exigiría Node 20), Node 20 en CI.
- Sin backend: todo se guarda en `localStorage` (clave `freegames:v1`), con varios perfiles de jugador por navegador.
- Despliegue automático a GitHub Pages en cada push a `main` (`.github/workflows/deploy.yml`). `vite.config.js` usa `base: '/free-games/'`.

```bash
npm run dev            # http://localhost:5173/free-games/
npm run build          # dist/
npm run preview        # sirve dist/ con la ruta base de producción
npm run check:levels   # bot que verifica que los niveles de Salto Geométrico se pueden pasar
```

## Estructura

```
src/main.js        router por hash: #/, #/perfil, #/dino, #/dino/jugar?mundo=N[&carrera=1],
                   #/tetris, #/tetris/jugar?mundo=N, #/geo, #/geo/jugar?nivel=N[&practica=1|&carrera=1],
                   salas de espera: #/dino/carrera?mundo=N, #/geo/carrera?nivel=N
src/core/          storage (localStorage con fallback en memoria), player (perfiles y datos por juego),
                   input (bindKeyboard, bindTouchGestures, bindHoldButton), audio (WebAudio generado,
                   createMusicLoop), gameLoop (rAF con delta y auto-pausa), canvas (setupCanvas con DPR),
                   race (salas de hasta 4 con PeerJS/WebRTC), raceMatch (lógica común de carrera),
                   random (createRandom con semilla), analytics (GoatCounter: trackPage, trackEvent)
src/ui/            dom (el, navigate), hud (createGameHeader, createBanner), modal (showModal), menu, profile,
                   raceLobby (sala de espera común), raceResults (podio y fin de carrera)
src/games/dino/    DinoGame, dinos (tipos y dibujo), worlds (mundos y obstáculos), setup, race, raceLobby
src/games/tetris/  TetrisGame, levels, setup
src/games/geo/     physics (motor sin DOM), levels, shapes (apariencias y dibujo del jugador),
                   obstacles (dibujo de piezas), achievements (retos y estrellas), GeoGame, setup,
                   race (config/apariencia/posición de carrera), raceLobby
src/styles/        tokens.css (paleta, tipografía Fredoka, sombras), base, menu, games
scripts/           check-geo-levels.mjs
```

## Convenciones

- Interfaz, nombres visibles y comentarios **en español**. Identificadores en inglés.
- DOM siempre con `el()` de `ui/dom.js`; el texto va por `textContent`, **nunca `innerHTML`** (los nombres de jugador/dino vienen del usuario; se limpian con `sanitizeName`).
- Datos por jugador: `getGameData('<juego>')` / `updateGameData('<juego>', cambios)`. Los valores por defecto viven en `createDefaultGames()` de `core/player.js` y se fusionan solos con perfiles antiguos: al añadir un campo, basta con ponerlo ahí (sin migraciones).
- Cada `mountX(root, params)` devuelve una función de limpieza (parar bucle, quitar listeners, cerrar modal).
- Juegos con canvas a resolución lógica fija vía `setupCanvas`; bucle con `createGameLoop`; pausa con `P`/`Escape` y al ocultar la pestaña.
- Controles: teclado por `event.code` con `bindKeyboard`; táctil con `bindHoldButton` (botones en `.touch-controls`, visibles solo en pantallas táctiles).
- Sonidos y música se generan en `core/audio.js` (sin archivos de audio). Respetar `isMuted()`.
- Estadísticas (`core/analytics.js`, GoatCounter, solo en producción): el router cuenta cada pantalla con `trackPage`; los hitos se cuentan con `trackEvent`. **Nunca enviar nombres de jugador, códigos de sala ni otros datos personales**, solo rutas y nombres de evento fijos.
- Turbo: en Dino y Salto Geométrico, mantener `Shift` o el botón ⚡.

## Salto Geométrico (detalles importantes)

- `physics.js` no toca el DOM: lo usan el juego y el bot de verificación. Paso fijo de 1/240 s; unidades en px con Y hacia arriba y el suelo en y = 0.
- Los niveles se escriben en `levels.js` encadenando **secciones** (`spikes`, `ledge`, `padToPlatform`, `rocketGates`, `ballFlips`, `planeGates`…). Las posiciones están en celdas de 40 px. Cada nivel tiene 3 monedas (`coinAt`).
- Velocidades elegibles (`SPEEDS`: 🐢 ×0.85, 🐇 ×1, ⚡ ×1.2) y turbo (`TURBO_FACTOR` ×1.25).
- **Cualquier cambio en niveles, física o velocidades ⇒ ejecutar `npm run check:levels`.** Comprueba cada nivel en las 3 velocidades, con y sin turbo, con decisiones cada 100 ms, y que todas las monedas son alcanzables. Tarda unos 3 minutos; `npm run check:levels -- 2-3` comprueba solo un nivel.
- Progreso: `unlockedLevel` (índice lineal 0..14). Solo desbloquea el modo normal (a cualquier velocidad). Estrellas = niveles completados + monedas + 2 por reto. Desbloquean apariencias (`shapes.js`).

## Modo carrera (Dino y Salto Geométrico, de 2 a 4 jugadores, cada uno en su dispositivo)

- `core/race.js` es el transporte: sesión en el módulo (sobrevive al cambio de ruta sala → juego), código de 4 caracteres (id de peer `freegames-<juego>-<CÓDIGO>`), latido cada 2 s y `bye` al salir. Quien crea la sala (id `h`) es el centro: los invitados (`g1`, `g2`…) solo hablan con ella y ella reenvía todo sellado con `from`. Con la carrera empezada (`lockRoom`) o 4 jugadores, no entra nadie más. El servidor público de PeerJS solo empareja; los datos van P2P.
- `core/raceMatch.js` (`RaceMatch`) es común a los dos juegos: `ready` → `go` {seed} (cuenta atrás) → `pos` → `finish` {ms} → `result` {winners} y `rematch`. La anfitriona da la salida cuando todos están listos y decide quién ganó; cada tiempo se mide desde la salida local. La revancha solo se ofrece cuando llegaron todos (o 30 s después del resultado).
- `ui/raceLobby.js` es la sala de espera común (jugadores, código, empezar); cada juego le pasa su configuración y su "look" (figura de Geo / dino y nombre). Lo propio de cada juego y la validación de lo que llega están en `games/<juego>/race.js`; los nombres pasan por `sanitizeName` y los avatares por `AVATARS`.
- Cada uno simula su partida y envía su posición 15 veces/s; los demás se dibujan como fantasmas y en la barra de avance. Chocar no elimina: en Geo se vuelve a la bandera; en Dino se tropieza (`STUMBLE_SECONDS`). La pista de Dino sale de la semilla de `go` (`createRandom`) en posiciones de distancia fijas, sin depender del turbo de cada uno.
- En carrera no se guardan récords ni desbloqueos (en Dino sí las monedas). Premio: `racesPlayed` para todos y `raceWins` (copa 🏆) para quien gana, en `dino` y `geo`; en Geo además los retos `first-race`, `race-win`, `race-wins-3`.

## Añadir un juego nuevo

1. `src/games/<juego>/` con `setup.js` y `<Juego>Game.js` (exportan `mount...`).
2. Rutas en `src/main.js`, tarjeta en `src/ui/menu.js` (`renderGameCard` + arte CSS en `menu.css`).
3. Valores por defecto en `createDefaultGames()` y estilos en `games.css`.
4. Actualizar `README.md` (descripción y tabla de controles).
