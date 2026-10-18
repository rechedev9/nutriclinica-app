import type { LineaInput } from '@/types'

// Devuelve el problema de una línea o null. Las líneas sin producto se ignoran.
export function errorLinea(l: LineaInput): string | null {
  if (l.producto_id <= 0) return null
  if (!Number.isFinite(l.cantidad) || l.cantidad <= 0) return 'La cantidad debe ser mayor que 0'
  if ((l.precio_unitario ?? 0) < 0) return 'El precio no puede ser negativo'
  return null
}

// Primer problema del conjunto de líneas, o null si se puede registrar.
export function errorLineas(lineas: LineaInput[]): string | null {
  if (!lineas.some((l) => l.producto_id > 0)) return 'Añade al menos una línea con producto'
  for (const l of lineas) {
    const e = errorLinea(l)
    if (e) return e
  }
  return null
}
