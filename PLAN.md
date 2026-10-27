# Plan: Menú de juegos gratis (Dino + Tetris) con Vite y GitHub Pages

## Contexto
El usuario quiere un sitio de juegos gratis para que sus hijas jueguen, publicado en GitHub Pages con despliegue automático. Por ahora dos juegos: el dinosaurio de Chrome (eligiendo tipo de dino y nombre) y Tetris, ambos con niveles/mundos, colores vivos y buen diseño. Sin backend: datos del jugador en `localStorage`. Stack elegido: **Vite + JavaScript puro** (sin framework). Carpeta: `C:\Proyectos\free-games` (vacía). Entorno: Node 18.19 → usar **Vite 5.4.x** (Vite 7 exige Node 20.19+).

## Estructura
```
C:\Proyectos\free-games\
  index.html                  # shell de la SPA
  vite.config.js              # base: '/free-games/' para GitHub Pages
  package.json                # scripts dev/build/preview
  .github/workflows/deploy.yml
  .gitignore, README.md
  public/favicon.svg
  src/
    main.js                   # arranque + router por hash (#/, #/dino, #/tetris)
    styles/                   # tokens.css (paleta, tipografía), base.css, menu.css, games.css
    core/
      storage.js              # wrapper localStorage con try/catch y fallback en memoria
      player.js               # perfil: nombre, avatar, monedas/estrellas, récords por juego
      input.js                # teclado + controles táctiles (las niñas pueden jugar en tablet)
      audio.js                # efectos con WebAudio generados (sin archivos externos)
      gameLoop.js             # requestAnimationFrame con delta time, pausa al cambiar pestaña
    ui/
      menu.js                 # pantalla principal: tarjetas de juegos, perfil, récords
      profile.js              # crear/editar jugador
      hud.js, modal.js        # marcador, pausa, game over, nivel superado
    games/
      dino/
        DinoGame.js           # física (salto, agacharse), obstáculos, colisiones, puntuación
        dinos.js              # 4-5 tipos: T-Rex, Triceratops, Pterodáctilo, Estegosaurio, Bebé dino (sprites dibujados en canvas, colores propios)
        worlds.js             # mundos: Desierto, Selva, Nieve, Volcán, Espacio — cada uno con paleta, fondo parallax, obstáculos y velocidad
        setup.js              # pantalla: elegir dino + escribir nombre + elegir mundo (desbloqueo progresivo)
      tetris/
        TetrisGame.js         # tablero 10x20, 7 piezas, rotación SRS simple con wall-kick, ghost piece, hold, siguiente pieza
        levels.js             # mundos/temas: Arcoíris, Océano, Caramelos, Galaxia… velocidad y meta de líneas por nivel
```

## Comportamiento clave
- **Menú**: saludo con el nombre del jugador, tarjetas grandes animadas por juego, mejores récords, selector de jugador (varios perfiles en el mismo navegador, uno por hija).
- **Dino**: elige tipo + nombre del dino (validado, máx. 12 caracteres, se renderiza con `textContent`, nunca `innerHTML`). Cada mundo tiene meta de distancia; al alcanzarla se desbloquea el siguiente. Velocidad creciente, día/noche, monedas coleccionables. Espacio/flecha arriba/tap = saltar; flecha abajo/swipe = agacharse.
- **Tetris**: niveles por líneas eliminadas (cada 10 líneas sube velocidad), mundos con tema visual que cambia el color de piezas y fondo. Controles teclado + botones táctiles en pantalla. Estrellas por nivel superado.
- **Persistencia**: `storage.js` guarda `{ players: [...], activePlayerId }` bajo una clave versionada (`freegames:v1`); si `localStorage` falla, usa memoria.
- **Diseño**: estilo infantil-moderno, fuente Google Fonts redondeada (Fredoka/Baloo 2), degradados vivos, sombras suaves, micro-animaciones, responsive (móvil/tablet/escritorio), canvas escalado a `devicePixelRatio`.

## Despliegue automático (GitHub Pages)
- `vite.config.js`: `base: '/free-games/'` (nombre del repo).
- `.github/workflows/deploy.yml`: en push a `main` → `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, cache npm), `npm ci`, `npm run build`, `actions/upload-pages-artifact@v3` con `dist`, `actions/deploy-pages@v4`; permisos `pages: write`, `id-token: write`.
- Pasos manuales del usuario (documentados en README): crear repo `free-games` en GitHub, `git remote add origin …`, `git push -u origin main`, y en *Settings → Pages → Source* elegir **GitHub Actions**. URL final: `https://<usuario>.github.io/free-games/`.
- Yo haré `git init`, rama `main` y commit inicial local; **no** haré push sin confirmación.

## Verificación
1. `npm install` y `npm run dev` → abrir http://localhost:5173/free-games/, probar menú, crear perfil, jugar ambos juegos con teclado.
2. Recargar la página y confirmar que perfil, dino elegido, récords y mundos desbloqueados persisten.
3. Modo responsive del navegador (móvil) para probar controles táctiles.
4. `npm run build && npm run preview` para validar rutas con el `base` de producción.
5. Tras el push, revisar la pestaña Actions en GitHub y abrir la URL publicada.
