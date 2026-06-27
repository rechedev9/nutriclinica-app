import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// El build se emite a backend/web/dist para que Go lo embeba (embed.FS).
// En desarrollo, el dev server hace proxy de /api, /fotos, /login, /logout al
// backend Go (mismo origen → cookies de sesión).
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
      '/login': 'http://localhost:5001',
      '/logout': 'http://localhost:5001',
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
