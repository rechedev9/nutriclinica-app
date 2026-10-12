import type { LineaInput } from '@/types'

// Stock disponible por producto (solo se pasa en ventas).
export type StockPorProducto = ReadonlyMap<number, number>

// Cantidad acumulada por producto: dos líneas del mismo producto suman contra el stock.
function cantidadPorProducto(lineas: LineaInput[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const l of lineas) {
    if (l.producto_id > 0) m.set(l.producto_id, (m.get(l.producto_id) ?? 0) + l.cantidad)
  }
  return m
}

// Devuelve el problema de una línea o null. Las líneas sin producto se ignoran.
export function errorLinea(
  l: LineaInput,
  lineas: LineaInput[],
  stock?: StockPorProducto,
): string | null {
  if (l.producto_id <= 0) return null
  if (!Number.isFinite(l.cantidad) || l.cantidad <= 0) return 'La cantidad debe ser mayor que 0'
  if ((l.precio_unitario ?? 0) < 0) return 'El precio no puede ser negativo'
  const disponible = stock?.get(l.producto_id)
  if (disponible !== undefined) {
    const pedida = cantidadPorProducto(lineas).get(l.producto_id) ?? 0
    if (pedida > disponible) return `Supera el stock disponible (${disponible})`
  }
  return null
}

// Primer problema del conjunto de líneas, o null si se puede registrar.
export function errorLineas(lineas: LineaInput[], stock?: StockPorProducto): string | null {
  if (!lineas.some((l) => l.producto_id > 0)) return 'Añade al menos una línea con producto'
  for (const l of lineas) {
    const e = errorLinea(l, lineas, stock)
    if (e) return e
  }
  return null
}
