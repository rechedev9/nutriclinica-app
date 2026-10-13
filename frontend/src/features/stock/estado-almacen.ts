export type EstadoStock = 'agotado' | 'bajo' | 'ok'
export type FiltroEstado = 'todos' | 'alertas' | 'agotado' | 'bajo'

interface ConStock {
  nombre: string
  stock_actual: number
  stock_minimo: number
}

const PRIORIDAD: Record<EstadoStock, number> = { agotado: 0, bajo: 1, ok: 2 }

export function estadoDe(actual: number, minimo: number): EstadoStock {
  if (actual <= 0) return 'agotado'
  if (actual <= minimo) return 'bajo'
  return 'ok'
}

export function prioridadEstado(estado: EstadoStock): number {
  return PRIORIDAD[estado]
}

export function coincideEstado(p: ConStock, filtro: FiltroEstado): boolean {
  const estado = estadoDe(p.stock_actual, p.stock_minimo)
  if (filtro === 'todos') return true
  if (filtro === 'alertas') return estado !== 'ok'
  return estado === filtro
}

// Agotados primero, luego bajo mínimo, luego el resto por nombre.
export function ordenPorDefecto<T extends ConStock>(filas: readonly T[]): T[] {
  return filas.toSorted((a, b) => {
    const pa = PRIORIDAD[estadoDe(a.stock_actual, a.stock_minimo)]
    const pb = PRIORIDAD[estadoDe(b.stock_actual, b.stock_minimo)]
    if (pa !== pb) return pa - pb
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  })
}

// Agotados y en el mínimo, ya ordenados: la misma lista en Inicio, Almacén y Análisis.
export function productosEnAlerta<T extends ConStock>(filas: readonly T[]): T[] {
  return ordenPorDefecto(filas.filter((p) => coincideEstado(p, 'alertas')))
}

export function contarPorEstado(filas: readonly ConStock[]): Record<EstadoStock, number> {
  const cuenta: Record<EstadoStock, number> = { agotado: 0, bajo: 0, ok: 0 }
  for (const p of filas) cuenta[estadoDe(p.stock_actual, p.stock_minimo)] += 1
  return cuenta
}
