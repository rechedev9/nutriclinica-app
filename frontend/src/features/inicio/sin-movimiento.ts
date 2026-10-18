import { diasDesde } from '@/lib/format/fecha'

// Un producto con existencias que no se vende en este plazo tiene dinero parado en el almacén.
export const DIAS_SIN_MOVIMIENTO = 60

interface ProductoAlmacen {
  id: number
  stock_actual: number
  precio_coste: number
  creado: string | null
}

export interface ProductoParado<T> {
  producto: T
  // Días desde la última venta; null si no se ha vendido nunca.
  dias: number | null
  valor: number
}

// Con existencias y sin ventas en DIAS_SIN_MOVIMIENTO (los recién dados de alta no cuentan),
// del que más dinero inmoviliza al que menos.
export function productosSinMovimiento<T extends ProductoAlmacen>(datos: {
  almacen: readonly T[]
  ultimasVentas: ReadonlyMap<number, string>
  hoy: Date
}): ProductoParado<T>[] {
  const { almacen, ultimasVentas, hoy } = datos
  return almacen
    .flatMap((producto) => {
      if (producto.stock_actual <= 0) return []
      const ultima = ultimasVentas.get(producto.id) ?? null
      const desde = diasDesde(ultima ?? producto.creado, hoy)
      if (desde !== null && desde <= DIAS_SIN_MOVIMIENTO) return []
      const valor = Math.round(producto.stock_actual * producto.precio_coste * 100) / 100
      return [{ producto, dias: ultima === null ? null : desde, valor }]
    })
    .toSorted((a, b) => b.valor - a.valor)
}

export function valorParado(parados: readonly { valor: number }[]): number {
  return parados.reduce((suma, p) => suma + Math.round(p.valor * 100), 0) / 100
}
