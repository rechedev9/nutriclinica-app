import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// En desarrollo, el dev server hace proxy de /api y /fotos al backend
// (mismo origen → cookies de sesión). /login y /logout NO se proxean: son
// rutas de cliente del SPA; el auth vive bajo /api (/api/login, /api/logout).
// El build se emite a frontend/dist, que el backend sirve y el binario embebe.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
