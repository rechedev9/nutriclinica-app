import type { Treaty } from '@elysiajs/eden'
import type { servidor } from '@/lib/api/client'

export type Venta = Treaty.Data<typeof servidor.ventas.get>[number]
export type LineaVenta = Venta['lineas'][number]
export type SituacionVenta = Venta['situacion']
export type MetodoPago = Venta['pagos'][number]['metodo']
export type ResumenCaja = Treaty.Data<ReturnType<typeof servidor.caja.dia>['get']>
export type Cierre = Treaty.Data<typeof servidor.caja.cierres.get>[number]
export type Tienda = Treaty.Data<typeof servidor.tienda.get>

export interface PagoInput {
  metodo: MetodoPago
  importe: number
}

export interface VentaInput {
  paciente_id: number | null
  notas: string | null
  lineas: { producto_id: number; cantidad: number; precio_unitario: number; descuento: number }[]
  descuento_total: number
  pagos: PagoInput[]
  entregado: number | null
}

export interface CorreccionVentaInput {
  paciente_id: number | null
  notas: string | null
  pagos: PagoInput[]
}

export interface DevolucionInput {
  motivo: string
  metodo_reembolso: MetodoPago
  notas: string | null
  lineas: { venta_linea_id: number; cantidad: number; reingresa: boolean }[]
}

export interface CierreInput {
  fecha: string
  fondo_inicial: number
  efectivo_contado: number
  notas: string | null
}
