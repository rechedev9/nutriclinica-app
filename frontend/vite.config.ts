import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// El build se emite a backend/web/dist para que Go lo embeba (embed.FS).
// En desarrollo, el dev server hace proxy de /api y /fotos al backend Go
// (mismo origen → cookies de sesión). /login y /logout NO se proxean: son
// rutas de cliente del SPA; el auth vive bajo /api (/api/login, /api/logout).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001',
      '/fotos': 'http://localhost:5001',
    },
  },
  build: {
    outDir: '../backend/web/dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
