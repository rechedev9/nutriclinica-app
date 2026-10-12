import type { Contexto } from './contexto'

// Prefijo con el que build/compilar.ts embebe los archivos de la SPA en el binario.
const PREFIJO = 'spa/'

// spaEmbebida sirve la SPA incluida en el binario compilado, o null si no hay ninguna
// (ejecución desde el código fuente, donde Bun.embeddedFiles está vacío).
export function spaEmbebida(): Contexto['spa'] {
  const archivos = new Map<string, Blob>()
  for (const archivo of Bun.embeddedFiles) {
    const nombre = 'name' in archivo && typeof archivo.name === 'string' ? archivo.name : ''
    const ruta = nombre.replaceAll('\\', '/')
    if (ruta.startsWith(PREFIJO)) archivos.set(ruta.slice(PREFIJO.length), archivo)
  }
  if (!archivos.has('index.html')) return null
  return (ruta) => Promise.resolve(archivos.get(ruta) ?? null)
}
