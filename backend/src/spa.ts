import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Contexto } from './contexto'
import { rutaSegura } from './lib/rutas'

// spaDeCarpeta sirve la SPA construida en disco (ejecución desde el código fuente).
export function spaDeCarpeta(carpeta: string): Contexto['spa'] {
  if (!existsSync(join(carpeta, 'index.html'))) return null
  return async (ruta) => {
    const destino = rutaSegura(carpeta, ruta)
    if (destino === null) return null
    const archivo = Bun.file(destino)
    return (await archivo.exists()) ? archivo : null
  }
}

// spaDeArchivos sirve la SPA embebida en el binario: `archivos` asocia cada ruta
// ("assets/app.js") con la ruta interna que Bun da al archivo embebido.
export function spaDeArchivos(archivos: Record<string, string>): Contexto['spa'] {
  const porRuta = new Map(Object.entries(archivos))
  return (ruta) => {
    const interna = porRuta.get(ruta)
    return Promise.resolve(interna === undefined ? null : Bun.file(interna))
  }
}
