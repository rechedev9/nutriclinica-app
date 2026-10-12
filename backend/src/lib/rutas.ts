import { isAbsolute, relative, resolve } from 'node:path'

// rutaSegura resuelve una ruta relativa recibida del cliente dentro de base, o devuelve
// null si intenta salir de ella (.., rutas absolutas, unidades de Windows, bytes nulos).
export function rutaSegura(base: string, relativa: string): string | null {
  if (relativa.includes('\0')) return null
  const partes = relativa.replaceAll('\\', '/').split('/').filter(Boolean)
  if (partes.length === 0 || partes.some((p) => p === '..' || p.includes(':'))) return null
  const destino = resolve(base, ...partes)
  const desdeBase = relative(resolve(base), destino)
  if (desdeBase === '' || desdeBase.startsWith('..') || isAbsolute(desdeBase)) return null
  return destino
}
