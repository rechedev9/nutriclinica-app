import type { Venta } from '@/types'
import { reembolsadoPorLinea, sumarImportes } from './carrito'

// Lo que de verdad se ha vendido: sin anuladas ni devueltas enteras, y descontando lo devuelto.
export function ventasNetas(ventas: readonly Venta[]): Venta[] {
  return ventas
    .filter((v) => v.situacion !== 'anulada' && v.situacion !== 'devuelta')
    .map((v) => {
      const reembolsado = reembolsadoPorLinea(v.devoluciones)
      const lineas = v.lineas.flatMap((l) => {
        const cantidad = l.cantidad - l.devuelto
        if (cantidad <= 0) return []
        const importe = sumarImportes([l.importe, -(reembolsado.get(l.id) ?? 0)])
        return [{ ...l, cantidad, devuelto: 0, importe, descuento: 0, precio_unitario: importe / cantidad }]
      })
      return { ...v, total: sumarImportes([v.total, -v.total_devuelto]), lineas }
    })
}
