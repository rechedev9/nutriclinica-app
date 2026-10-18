import type { Venta } from '@/types'

// Días anteriores a hoy con ventas o devoluciones y sin cierre de caja, del más reciente al más antiguo.
export function diasSinCerrar(opciones: { ventas: readonly Venta[]; cerrados: readonly string[]; hoy: string }) {
  const { ventas, cerrados, hoy } = opciones
  const cerrado = new Set(cerrados)
  const dias = new Set<string>()
  for (const v of ventas) {
    if (v.estado !== 'anulada' && v.fecha !== null) dias.add(v.fecha)
    for (const d of v.devoluciones) dias.add(d.fecha)
  }
  return [...dias].filter((d) => d < hoy && !cerrado.has(d)).toSorted((a, b) => b.localeCompare(a))
}
