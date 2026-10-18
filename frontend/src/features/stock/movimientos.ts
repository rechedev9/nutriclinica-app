import type { MotivoMerma, Movimiento, TipoMovimiento } from '@/types'
import { redondearCantidad } from './recuento'

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  compra: 'Compra',
  venta: 'Venta',
  anulacion: 'Venta anulada',
  devolucion: 'Devolución',
  merma: 'Merma',
  recuento: 'Recuento',
}

export const ETIQUETA_MOTIVO_MERMA: Record<MotivoMerma, string> = {
  caducidad: 'Caducidad',
  accidente_rotura: 'Accidente / Rotura',
  devolucion_cliente: 'Devolución cliente',
}

type DatosDetalle = Pick<Movimiento, 'tipo' | 'cantidad' | 'detalle' | 'contado'>

function esMotivoMerma(valor: string): valor is MotivoMerma {
  return Object.hasOwn(ETIQUETA_MOTIVO_MERMA, valor)
}

// Cantidad con coma decimal, como se escribe en España.
export function fmtCantidad(n: number): string {
  return String(n).replace('.', ',')
}

export function fmtCantidadConSigno(n: number): string {
  return n > 0 ? `+${fmtCantidad(n)}` : fmtCantidad(n)
}

// Texto de la columna «Detalle»: proveedor, motivo o lo contado según el tipo.
export function detalleMovimiento(m: DatosDetalle): string {
  const detalle = m.detalle ?? ''
  switch (m.tipo) {
    case 'compra':
      return detalle || 'Sin proveedor'
    case 'venta':
      return ''
    case 'anulacion':
      return detalle
    case 'devolucion':
      return m.cantidad === 0 ? `${detalle} · no vuelve al almacén` : detalle
    case 'merma':
      return esMotivoMerma(detalle) ? ETIQUETA_MOTIVO_MERMA[detalle] : detalle
    case 'recuento':
      return `Contadas ${fmtCantidad(m.contado ?? 0)} · ${detalle}`
  }
}

// Entradas y salidas del periodo; los recuentos se suman aparte como ajuste neto.
export function totalesMovimientos(lista: readonly Pick<Movimiento, 'tipo' | 'cantidad'>[]) {
  let entradas = 0
  let salidas = 0
  let ajustes = 0
  for (const m of lista) {
    if (m.tipo === 'recuento') ajustes += m.cantidad
    else if (m.cantidad > 0) entradas += m.cantidad
    else salidas -= m.cantidad
  }
  return {
    entradas: redondearCantidad(entradas),
    salidas: redondearCantidad(salidas),
    ajustes: redondearCantidad(ajustes),
  }
}
