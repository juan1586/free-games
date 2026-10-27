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
src/main.js        router por hash: #/, #/perfil, #/dino, #/dino/jugar?mundo=N,
                   #/tetris, #/tetris/jugar?mundo=N, #/geo, #/geo/jugar?nivel=N[&practica=1|&carrera=1],
                   #/geo/carrera?nivel=N (sala de espera)
src/core/          storage (localStorage con fallback en memoria), player (perfiles y datos por juego),
                   input (bindKeyboard, bindTouchGestures, bindHoldButton), audio (WebAudio generado,
                   createMusicLoop), gameLoop (rAF con delta y auto-pausa), canvas (setupCanvas con DPR),
                   race (salas de 2 con PeerJS/WebRTC: createRoom, joinRoom, send, onMessage…)
src/ui/            dom (el, navigate), hud (createGameHeader, createBanner), modal (showModal), menu, profile
src/games/dino/    DinoGame, dinos (tipos y dibujo), worlds (mundos y obstáculos), setup
src/games/tetris/  TetrisGame, levels, setup
src/games/geo/     physics (motor sin DOM), levels, shapes (apariencias y dibujo del jugador),
                   obstacles (dibujo de piezas), achievements (retos y estrellas), GeoGame, setup,
                   race (validación de mensajes de carrera), raceLobby (crear sala / unirse con código)
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
- Turbo: en Dino y Salto Geométrico, mantener `Shift` o el botón ⚡.

## Salto Geométrico (detalles importantes)

- `physics.js` no toca el DOM: lo usan el juego y el bot de verificación. Paso fijo de 1/240 s; unidades en px con Y hacia arriba y el suelo en y = 0.
- Los niveles se escriben en `levels.js` encadenando **secciones** (`spikes`, `ledge`, `padToPlatform`, `rocketGates`, `ballFlips`, `planeGates`…). Las posiciones están en celdas de 40 px. Cada nivel tiene 3 monedas (`coinAt`).
- Velocidades elegibles (`SPEEDS`: 🐢 ×0.85, 🐇 ×1, ⚡ ×1.2) y turbo (`TURBO_FACTOR` ×1.25).
- **Cualquier cambio en niveles, física o velocidades ⇒ ejecutar `npm run check:levels`.** Comprueba cada nivel en las 3 velocidades, con y sin turbo, con decisiones cada 100 ms, y que todas las monedas son alcanzables. Tarda unos 3 minutos; `npm run check:levels -- 2-3` comprueba solo un nivel.
- Progreso: `unlockedLevel` (índice lineal 0..14). Solo desbloquea el modo normal (a cualquier velocidad). Estrellas = niveles completados + monedas + 2 por reto. Desbloquean apariencias (`shapes.js`).

### Modo carrera (2 jugadoras, cada una en su dispositivo)

- `core/race.js` es el transporte: sesión en el módulo (sobrevive al cambio de ruta sala → juego), código de 4 caracteres (id de peer `freegames-geo-<CÓDIGO>`), latido cada 2 s y mensaje `bye` al salir. El servidor público de PeerJS solo empareja; los datos van P2P.
- Todo mensaje recibido pasa por `parseRaceMessage` (`games/geo/race.js`): nombres con `sanitizeName`, avatares de `AVATARS`, números finitos.
- Cada una simula su partida con `physics.js` y envía su posición 15 veces/s; la rival se dibuja como fantasma. Protocolo: `hello`/`room`/`start` en la sala; `ready` → `go` (cuenta atrás) → `pos` → `finish` → `result` (lo decide la anfitriona) y `rematch`.
- En carrera hay banderas como en práctica y no se guarda progreso de nivel ni monedas. Premio: `racesPlayed` para las dos y `raceWins` (copa 🏆) para la ganadora; retos `first-race`, `race-win`, `race-wins-3`.

## Añadir un juego nuevo

1. `src/games/<juego>/` con `setup.js` y `<Juego>Game.js` (exportan `mount...`).
2. Rutas en `src/main.js`, tarjeta en `src/ui/menu.js` (`renderGameCard` + arte CSS en `menu.css`).
3. Valores por defecto en `createDefaultGames()` y estilos en `games.css`.
4. Actualizar `README.md` (descripción y tabla de controles).
