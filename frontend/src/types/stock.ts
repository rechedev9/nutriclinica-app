import type { Treaty } from '@elysiajs/eden'
import type { servidor } from '@/lib/api/client'

// Tipos derivados de las respuestas del backend (Eden): la fuente de verdad es la API.
export type AlmacenRow = Treaty.Data<typeof servidor.stock.almacen.get>[number]
export type Producto = Treaty.Data<typeof servidor.stock.productos.get>[number]
export type ProductoBase = Treaty.Data<typeof servidor.stock.productos.post>
export type Categoria = Treaty.Data<typeof servidor.stock.categorias.get>[number]
export type Proveedor = Treaty.Data<typeof servidor.stock.proveedores.get>[number]
export type Compra = Treaty.Data<typeof servidor.stock.compras.get>[number]
type Merma = Treaty.Data<typeof servidor.stock.mermas.get>[number]
export type MotivoMerma = Merma['motivo']
export type Recuento = Treaty.Data<typeof servidor.stock.recuentos.get>[number]
type Kardex = Treaty.Data<ReturnType<typeof servidor.stock.productos>['movimientos']['get']>
export type Movimiento = Kardex['movimientos'][number]
export type TipoMovimiento = Movimiento['tipo']

export interface ProductoInput {
  nombre: string
  categoria_id?: number | null
  proveedor_id?: number | null
  precio_coste?: number | null
  precio_venta?: number | null
  unidad?: string | null
  stock_minimo?: number | null
  codigo_barras?: string | null
  iva?: number | null
}

export interface ProveedorInput {
  nombre: string
  telefono?: string | null
  email?: string | null
  notas?: string | null
}

export interface LineaInput {
  producto_id: number
  cantidad: number
  precio_unitario?: number | null
}

export interface CompraInput {
  fecha?: string | null
  proveedor_id?: number | null
  notas?: string | null
  lineas: LineaInput[]
}

export interface MermaInput {
  producto_id: number
  proveedor_id?: number | null
  cantidad: number
  motivo: MotivoMerma
  fecha?: string | null
  notas?: string | null
}

export interface RecuentoInput {
  motivo: string
  notas?: string | null
  lineas: { producto_id: number; contado: number }[]
}
