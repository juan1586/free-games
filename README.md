# 🎮 Juegos Gratis

Sitio de juegos para niñas y niños, sin anuncios ni servidor. Todo se guarda en el navegador (`localStorage`).

- **🦖 Dino Corre** — elige entre 5 dinosaurios, ponle nombre y corre por 5 mundos (Desierto, Selva, Nieve, Volcán y Espacio). Llega a la meta de distancia para desbloquear el siguiente mundo. Monedas, día/noche y velocidad creciente.
- **🧱 Bloques Mágicos** — Tetris con 5 mundos temáticos (Arcoíris, Océano, Caramelos, Galaxia y Bosque Mágico). Cada mundo tiene una meta de líneas y da hasta 3 estrellas según los puntos. Pieza fantasma, pieza guardada y vista de las siguientes.
- **🔷 Salto Geométrico** — inspirado en Geometry Dash: una figura avanza sola y tú saltas al ritmo de la música. Portales que la convierten en cohete, pelota (cambia la gravedad) o avión de papel. 5 mundos × 3 niveles diseñados a mano, 3 monedas escondidas por nivel, modo práctica con banderas, vestidor (figuras, colores, estelas y caritas que se desbloquean con estrellas), 3 velocidades (🐢 Tranquila, 🐇 Normal, ⚡ Rápida), turbo y 16 retos.
- **🏁 Carrera con amigos** (Salto Geométrico) — alguien crea una sala y comparte el código de 4 letras; cada jugador corre en su tablet o compu y ve al otro como un fantasma en el mismo nivel. Al chocar se vuelve a la última bandera. Los dos ganan ⭐ por los retos de carrera y quien gana se lleva una copa 🏆. Necesita internet (conexión directa con WebRTC/PeerJS); solo se comparten el nombre, el avatar y la figura.
- **👧 Varios jugadores** en el mismo navegador, cada uno con su avatar, récords y mundos desbloqueados.

## Controles

| Juego | Teclado | Pantalla táctil |
| --- | --- | --- |
| Dino | `Espacio` / `↑` saltar · `↓` agacharse (en el aire, cae rápido) · `Shift` turbo (metros dobles en puntos) · `P` pausa | Tocar = saltar · deslizar abajo = agacharse · botones en pantalla (⚡ turbo) |
| Salto Geométrico | `Espacio` / `↑` / clic saltar (mantener = cohete sube / saltar seguido) · `Shift` turbo · `P` pausa | Tocar o mantener la pantalla · botones en pantalla (⚡ turbo) |
| Bloques | `←` `→` mover · `↑` / `X` girar · `Z` girar al revés · `↓` bajar · `Espacio` soltar · `C` guardar · `P` pausa | Tocar = girar · deslizar = mover / soltar · botones en pantalla |

## Desarrollo

Requiere Node 18+.

```bash
npm install
npm run dev       # http://localhost:5173/free-games/
npm run build     # genera dist/
npm run preview   # sirve dist/ con la misma ruta base que GitHub Pages
npm run check:levels  # verifica que todos los niveles de Salto Geométrico se pueden pasar
```

Estructura:

```
src/
  main.js            # router por hash (#/, #/dino, #/tetris, #/geo, #/geo/carrera, #/perfil)
  core/              # storage, perfiles, entrada, audio WebAudio, bucle de juego, conexión de carreras
  ui/                # menú, perfil, cabecera/HUD, modales
  games/dino/        # juego, tipos de dino, mundos, pantalla de selección
  games/tetris/      # juego, mundos/niveles, pantalla de selección
  games/geo/         # física (sin DOM), niveles, figuras, obstáculos, retos, juego, pantalla de selección y sala de carrera
  styles/            # tokens de diseño y hojas de estilo
```

## Publicar en GitHub Pages

El workflow `.github/workflows/deploy.yml` compila y publica automáticamente en cada `push` a `main`.

1. Crea un repositorio llamado **`free-games`** en GitHub (si usas otro nombre, cambia `base` en `vite.config.js`).
2. Conecta y sube el código:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/free-games.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
4. Revisa la pestaña **Actions**. Al terminar, el sitio estará en `https://<tu-usuario>.github.io/free-games/`.
