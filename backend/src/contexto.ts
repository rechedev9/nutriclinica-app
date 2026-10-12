import type { BD } from './db/cliente'

// Lo que necesitan los módulos de la API. Se construye una vez en arranque.ts (o en cada test).
export interface Contexto {
  db: BD
  fotosDir: string
  // https marca la cookie de sesión como Secure (app servida detrás de TLS).
  https: boolean
  // spa devuelve el archivo estático de una ruta ("index.html", "assets/app.js") o null.
  // Es null cuando no hay SPA construida (desarrollo con el servidor de Vite).
  spa: ((ruta: string) => Promise<Blob | null>) | null
}
