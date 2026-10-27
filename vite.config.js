import { defineConfig } from 'vite';

export default defineConfig({
  base: '/free-games/',
  build: {
    // El parque 3D (con three.js) va en su propio archivo, que solo se descarga al entrar en él.
    chunkSizeWarningLimit: 700,
  },
});
