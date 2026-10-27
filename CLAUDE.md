# Juegos Gratis — contexto para Claude

Sitio de juegos para las hijas del usuario (niñas pequeñas): **Dino Corre**, **Bloques Mágicos** (Tetris), **Salto Geométrico** (estilo Geometry Dash) y **Parque Mágico** (3D estilo Roblox). Se juega en tablet y PC. Diseño infantil-moderno, colores vivos, perdonador con los errores.

## Stack y comandos

- Vite 5 + JavaScript puro (sin framework). Dependencias de runtime: `peerjs`, cargada con `import()` solo en el modo carrera, y `three`, que solo usa el Parque Mágico (su pantalla de juego se carga con `import()` desde el router, `mountLazy` en `main.js`; nada que importe `three` debe entrar en el bundle inicial). Node 18 en local (Vite 7 exigiría Node 20), Node 20 en CI.
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
src/main.js        router por hash: #/, #/perfil, #/album, #/dino, #/dino/jugar?mundo=N[&carrera=1],
                   #/tetris, #/tetris/jugar?mundo=N, #/geo, #/geo/jugar?nivel=N[&practica=1|&carrera=1],
                   #/parque, #/parque/jugar?mundo=N,
                   salas de espera: #/dino/carrera?mundo=N, #/geo/carrera?nivel=N
src/core/          storage (localStorage con fallback en memoria), player (perfiles y datos por juego),
                   input (bindKeyboard, bindTouchGestures, bindHoldButton), audio (WebAudio generado,
                   createMusicLoop), gameLoop (rAF con delta y auto-pausa), canvas (setupCanvas con DPR),
                   race (salas de hasta 4 con PeerJS/WebRTC), raceMatch (lógica común de carrera),
                   random (createRandom con semilla), analytics (GoatCounter: trackPage, trackEvent),
                   date (localDay: fecha local para lo diario)
src/album/         stickers (pegatinas de todos los juegos, syncStickers, cofre del día), album (pantalla)
src/ui/            dom (el, navigate), hud (createGameHeader, createBanner), modal (showModal), menu, profile,
                   raceLobby (sala de espera común), raceResults (podio y fin de carrera)
src/games/dino/    DinoGame, dinos (tipos y dibujo), worlds (mundos y obstáculos), setup, race, raceLobby
src/games/tetris/  TetrisGame, levels, setup
src/games/geo/     physics (motor sin DOM), levels, shapes (apariencias y dibujo del jugador),
                   obstacles (dibujo de piezas), achievements (retos y estrellas), GeoGame, setup,
                   race (config/apariencia/posición de carrera), raceLobby
src/games/park/    worlds (parques, atracciones, tesoros, desbloqueo), outfits (ropa), missions, queue (filas, sin DOM),
                   collision (sin three), kit (materiales/etiquetas three), avatar, props, parkBase (lo común),
                   world3d (Parque del Café), worldPanaca (Granja Panaca), parks (elige el constructor),
                   crowd (visitantes y vigilantes), riders (visitantes sentados en las atracciones), joystick,
                   rides/ (un minijuego por atracción), race + raceLobby + friends (parque con amigas), ParkGame, setup
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
- Estadísticas (`core/analytics.js`, GoatCounter, solo en producción): el router cuenta cada pantalla con `trackPage`; los hitos se cuentan con `trackEvent`. **Nunca enviar nombres de jugador, códigos de sala ni otros datos personales**, solo rutas y nombres de evento fijos. Para distinguir jugadores se envía su `statsId` (número al azar de 4 cifras, visible en «Editar jugador») como referrer `jugador-NNNN`.
- Turbo: en Dino y Salto Geométrico, mantener `Shift` o el botón ⚡.

## Dino Corre (detalles)

- Mundos en `worlds.js`: los 5 primeros son para principiantes y no se tocan; del 6 al 10 (`expert: true`) son más difíciles. Campos opcionales por mundo: `gap` (segundos entre obstáculos), `flyerChance`, `doubleChance` (dos obstáculos seguidos), `specials` (`{ kinds, chance }`), `chase` (ola de lava), `noClouds`.
- Premios: tienda en `accessories.js` (`HATS`, `DINO_TRAILS`, comprados en `dino.owned`, puestos en `dino.hat` / `dino.trail`); medallas por mundo en `dino.medals` (`MEDALS`, `medalsForRun`, `savedMedals`, que da bronce a los mundos ya superados); dinos secretos con `unlockWorld` (`isDinoUnlocked`). Ayudas en la pista (`POWER_UPS` en `DinoGame.js`): salen de la semilla del recorrido, así que en carrera son iguales para todos.
- Obstáculos que se mueven: `OBSTACLE_MOTIONS` (`bob`, `bounce`, `fall`). El movimiento depende de lo recorrido (`travel`), no del tiempo, para que en carrera sea igual para todos. `pit` es un hueco: solo choca si el dino pisa el suelo encima.

## Salto Geométrico (detalles importantes)

- `physics.js` no toca el DOM: lo usan el juego y el bot de verificación. Paso fijo de 1/240 s; unidades en px con Y hacia arriba y el suelo en y = 0.
- Los niveles se escriben en `levels.js` encadenando **secciones** (`spikes`, `ledge`, `padToPlatform`, `rocketGates`, `ballFlips`, `planeGates`, `magnetFlips`, `waveGates`…). Las posiciones están en celdas de 40 px. Cada nivel tiene 3 monedas (`coinAt`). `onCeiling(sección)` cuelga cualquier sección del techo (para la gravedad al revés).
- Modos: `cube`, `rocket`, `ball`, `plane`, `magnet` (pulsar = salta al lado contrario) y `wave` (mantener = sube en diagonal). Portales especiales (`SPECIAL_PORTALS` en `physics.js`): `flipUp`/`flipDown` (gravedad del cubo) y `fast`/`normalSpeed` (`state.speedFactor`). Aro azul: `gravityOrb`.
- Mundos 6-8 (`expert: true`) son para expertos; los 5 primeros se dejan como están, para principiantes.
- Velocidades elegibles (`SPEEDS`: 🐢 ×0.85, 🐇 ×1, ⚡ ×1.2) y turbo (`TURBO_FACTOR` ×1.25).
- **Cualquier cambio en niveles, física o velocidades ⇒ ejecutar `npm run check:levels`.** Comprueba cada nivel en las 3 velocidades, con y sin turbo, con decisiones cada 100 ms, y que todas las monedas son alcanzables. Tarda unos 3 minutos; `npm run check:levels -- 2-3` comprueba solo un nivel.
- Nivel secreto 9-1 (mundo con `secret: true`): no entra en `unlockedLevel`; se abre con `SECRET_COINS` monedas de los niveles normales (`canPlayLevel`, `MAIN_LEVELS` en `achievements.js` / `levels.js`).
- Progreso: `unlockedLevel` (índice lineal 0..23). Los niveles nuevos se añaden al final; quien ya terminó el último que había lo encuentra abierto (`unlockAddedLevels` en `setup.js`). Solo desbloquea el modo normal (a cualquier velocidad). Estrellas = niveles completados + monedas + 2 por reto. Desbloquean apariencias (`shapes.js`).

## Parque Mágico (detalles)

- 3D con three.js a base de primitivas (cajas, cilindros, conos) y `MeshLambertMaterial`; sin modelos ni texturas. Geometrías y materiales salen de `createKit()` (`kit.js`) y se liberan juntos al salir (`kit.dispose()`); lo que se cree a mano se registra con `kit.track()`. Unidades en metros, Y hacia arriba, la plaza en (0, 0) y la entrada al sur (+Z).
- Solo `ParkGame.js` y lo que importa usan `three`. `worlds.js`, `outfits.js`, `missions.js`, `queue.js` y `collision.js` no lo usan: los leen el menú, `setup.js` y las pegatinas.
- Atracciones en `RIDES` (`worlds.js`) con `entrance`, `queueDir`, `fastPassPrice`, `secondsPerPerson`. Cada una tiene su minijuego en `rides/` (registro en `rides/index.js`) con `{ camera, scene?, intro, controls, done, update(delta, input), status(), prompt(), result(), dispose() }`; sin `scene` se juega dentro del parque (Krater, La Cumbre, Rueda, Chocones usan las piezas que devuelve `buildPark`). `dispose()` debe dejar el parque como estaba.
- Filas: los visitantes (`crowd.js`) hacen fila, suben y vuelven. Sin la jugadora en la fila esta avanza más despacio (`BACKGROUND_QUEUE_PACE`) para que nunca se vacíe. Pase rápido = sube ya; a veces alguien se cuela y se le avisa al vigilante (`SNITCH_COINS`).
- Monedas propias en `park.coins` (no se mezclan con las de Dino). Premios: monedas por atracción + `FIRST_RIDE_BONUS` la primera vez, monedas sueltas que reaparecen, `GOLDEN_BEANS` (coleccionables fijos), 3 misiones al día (`missions.js`, semilla con la fecha) y regalo de bienvenida. Al bajar de una atracción se muestra una foto del canvas (no se guarda).
- Las atracciones del parque llevan visitantes sentados (`createRider` en `riders.js`): gritan en las bajadas (`moveTrain`, `cumbre.scream`), saludan desde la rueda o se quejan en los chocones. El vigilante camina hasta el colado, lo regaña y lo manda al final de la fila (`updateGuard` en `crowd.js`).
- Saludos (`SAYINGS`/`EMOTES` en `park/race.js`, teclas 1-5): burbuja sobre la jugadora, los visitantes cercanos contestan (`crowd.reactTo`) y las amigas los ven. Solo se envían claves fijas, nunca texto libre.
- **Parque con amigas** (`#/parque/amigos`, luego `#/parque/jugar?amigos=1`): usa la sala de las carreras (`mountRaceLobby` con `labels`, juego `park`). `friends.js` envía `pos` ~10 veces/s (`x y z h s a m r`) y `say` {kind, ride}; cada tablet simula sus propios visitantes y filas, y a las amigas se las dibuja donde dicen estar (ocultas mientras van en una atracción, con su estado en el panel 👭). Si alguien se va o se cierra la sala, se sigue jugando sola. Premio: `park.friendVisits` y la pegatina «Parque con amigas».
- **Varios parques** (`PARK_WORLDS` en `worlds.js`): cada uno con `rides`, `treasure` (`key` = campo de `park` donde se guardan: `goldenBeans`, `goldenEggs`) y `unlock` opcional (`isWorldOpen`). La Granja Panaca se abre montando en todas las atracciones del café. Para añadir uno: sus atracciones e ítems en `worlds.js`, un constructor `world<Nombre>.js` que empiece con `buildParkBase` (registrarlo en `parks.js`), sus minijuegos en `rides/index.js`, su música en `MUSIC` de `ParkGame.js` y sus pegatinas. Los próximos están en `UPCOMING_WORLDS`.
- `rides/drive.js` es el paseo manejando con tema (El Jipe y el Tractor); `rides/cerditos.js` usa la pista del parque; `rides/ordeno.js` es un juego de ritmo con su propia escena.
- **Montar juntas**: cuando a una amiga le toca subir (o paga el pase), se lleva a las que están en su misma fila (mensaje `board` {ride, seed, ids}). Todas usan esa semilla en el minijuego (`ctx.random`), así ven la misma caída, globos o camino. Cada minijuego recibe `ctx.mates` (las sienta a tu lado o en tu cabina), `ctx.myId` (orden común de salida) y `announce(kind)`; puede definir `onMateSay(id, kind)` y, si las amigas se mueven (chocones, cerditos), `mateState()` / `onMateState(id, state)` (mensaje `rstate`). Si dos suben a la vez, manda la de id menor (`BOARD_MERGE_MS`).

## Modo carrera (Dino y Salto Geométrico, de 2 a 4 jugadores, cada uno en su dispositivo)

- `core/race.js` es el transporte: sesión en el módulo (sobrevive al cambio de ruta sala → juego), código de 4 caracteres (id de peer `freegames-<juego>-<CÓDIGO>`), latido cada 2 s y `bye` al salir. Quien crea la sala (id `h`) es el centro: los invitados (`g1`, `g2`…) solo hablan con ella y ella reenvía todo sellado con `from`. Con la carrera empezada (`lockRoom`) o 4 jugadores, no entra nadie más. El servidor público de PeerJS solo empareja; los datos van P2P.
- `core/raceMatch.js` (`RaceMatch`) es común a los dos juegos: `ready` → `go` {seed} (cuenta atrás) → `pos` → `finish` {ms} → `result` {winners} y `rematch`. La anfitriona da la salida cuando todos están listos y decide quién ganó; cada tiempo se mide desde la salida local. La revancha solo se ofrece cuando llegaron todos (o 30 s después del resultado).
- `ui/raceLobby.js` es la sala de espera común (jugadores, código, empezar); cada juego le pasa su configuración y su "look" (figura de Geo / dino y nombre). Lo propio de cada juego y la validación de lo que llega están en `games/<juego>/race.js`; los nombres pasan por `sanitizeName` y los avatares por `AVATARS`.
- Cada uno simula su partida y envía su posición 15 veces/s; los demás se dibujan como fantasmas y en la barra de avance. Chocar no elimina: en Geo se vuelve a la bandera; en Dino se tropieza (`STUMBLE_SECONDS`). La pista de Dino sale de la semilla de `go` (`createRandom`) en posiciones de distancia fijas, sin depender del turbo de cada uno.
- En carrera no se guardan récords ni desbloqueos (en Dino sí las monedas). Premio: `racesPlayed` para todos y `raceWins` (copa 🏆) para quien gana, en `dino` y `geo`; en Geo además los retos `first-race`, `race-win`, `race-wins-3`.

## Álbum y cofre del día

- `album/stickers.js`: cada pegatina tiene `check(ctx)` sobre los datos guardados de los juegos (`ctx = { dino, geo, tetris, album }`); `syncStickers()` se llama en el router en cada cambio de pantalla, así los juegos no tienen que avisar. Las del cofre (`chest: true`) solo salen al abrirlo. Datos en `getGameData('album')` (`stickers`, `fresh` = aún no vistas, `lastChest` = fecha local, `chestsOpened`).
- El cofre se abre una vez al día desde el menú: pegatina sorpresa o monedas de Dino.
- Al añadir logros nuevos en un juego, conviene añadir su pegatina.

## Añadir un juego nuevo

1. `src/games/<juego>/` con `setup.js` y `<Juego>Game.js` (exportan `mount...`).
2. Rutas en `src/main.js`, tarjeta en `src/ui/menu.js` (`renderGameCard` + arte CSS en `menu.css`).
3. Valores por defecto en `createDefaultGames()` y estilos en `games.css`.
4. Actualizar `README.md` (descripción y tabla de controles).
