import type { AlmacenRow, Venta } from '@/types'
import type { LineaCarrito } from './carrito'

const MAX_MULTIPLICADOR = 999

// «3*código» o «3*nombre» añade 3 unidades de golpe, como en las cajas registradoras.
export function leerEscaneo(texto: string): { cantidad: number; buscado: string } {
  const m = /^\s*(\d+)\s*\*\s*(.*)$/.exec(texto)
  const cantidad = Number(m?.[1])
  if (m === null || !(cantidad >= 1 && cantidad <= MAX_MULTIPLICADOR)) return { cantidad: 1, buscado: texto.trim() }
  return { cantidad, buscado: (m[2] ?? '').trim() }
}

// Productos con más unidades vendidas desde `desde` (sin anuladas ni lo devuelto), de más a menos.
export function masVendidos(ventas: readonly Venta[], opciones: { desde: string; limite: number }): number[] {
  const unidades = new Map<number, number>()
  for (const v of ventas) {
    if (v.estado === 'anulada' || (v.fecha ?? '') < opciones.desde) continue
    for (const l of v.lineas) {
      unidades.set(l.producto_id, (unidades.get(l.producto_id) ?? 0) + l.cantidad - l.devuelto)
    }
  }
  return [...unidades.entries()]
    .filter(([, n]) => n > 0)
    .toSorted(([idA, a], [idB, b]) => b - a || idA - idB)
    .slice(0, opciones.limite)
    .map(([id]) => id)
}

// La compra más reciente que se puede repetir: ni anulada ni devuelta entera. La lista llega de la más nueva a la más antigua.
export function ultimaCompra(ventas: readonly Venta[], pacienteId: number): Venta | undefined {
  return ventas.find((v) => v.paciente_id === pacienteId && v.situacion !== 'anulada' && v.situacion !== 'devuelta')
}

// Líneas para volver a cobrar una venta con los precios y existencias de hoy.
export function lineasParaRepetir(venta: Venta, productos: readonly AlmacenRow[]) {
  const porId = new Map(productos.map((p) => [p.id, p]))
  const lineas: Omit<LineaCarrito, 'descuento'>[] = []
  const avisos: string[] = []
  for (const l of venta.lineas) {
    const pendiente = l.cantidad - l.devuelto
    if (pendiente <= 0) continue
    const producto = porId.get(l.producto_id)
    if (producto === undefined) {
      avisos.push(`«${l.producto_nombre}» ya no está en el almacén`)
      continue
    }
    const pedidas = lineas.filter((x) => x.producto_id === producto.id).reduce((s, x) => s + x.cantidad, 0)
    const cantidad = Math.min(pendiente, producto.stock_actual - pedidas)
    if (cantidad <= 0) {
      avisos.push(`No queda stock de «${producto.nombre}»`)
      continue
    }
    if (cantidad < pendiente) avisos.push(`De «${producto.nombre}» solo se añaden ${cantidad}: no hay más`)
    lineas.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      unidad: producto.unidad,
      precio_unitario: producto.precio_venta,
      stock: producto.stock_actual,
      cantidad,
    })
  }
  return { lineas, avisos }
}
