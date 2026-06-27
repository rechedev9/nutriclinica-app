export interface AlmacenRow {
  id: number
  nombre: string
  unidad: string | null
  precio_coste: number
  precio_venta: number
  stock_minimo: number
  categoria: string | null
  proveedor_nombre: string | null
  stock_actual: number
}

export interface Producto {
  id: number
  nombre: string
  categoria_id: number | null
  proveedor_id: number | null
  precio_coste: number
  precio_venta: number
  unidad: string | null
  stock_minimo: number
  activo: number
  creado: string | null
  categoria?: string | null
  proveedor_nombre?: string | null
}

export interface ProductoInput {
  nombre: string
  categoria_id?: number | null
  proveedor_id?: number | null
  precio_coste?: number | null
  precio_venta?: number | null
  unidad?: string | null
  stock_minimo?: number | null
}

export interface Categoria {
  id: number
  nombre: string
}

export interface Proveedor {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  notas: string | null
}

export interface ProveedorInput {
  nombre: string
  telefono?: string | null
  email?: string | null
  notas?: string | null
}

export interface Linea {
  id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  producto_nombre?: string | null
  unidad?: string | null
}

export interface LineaInput {
  producto_id: number
  cantidad: number
  precio_unitario?: number | null
}

export interface Compra {
  id: number
  fecha: string | null
  proveedor_id: number | null
  notas: string | null
  total: number
  proveedor_nombre: string | null
  lineas: Linea[]
}

export interface Venta {
  id: number
  fecha: string | null
  paciente_id: number | null
  notas: string | null
  total: number
  paciente_nombre: string | null
  lineas: Linea[]
}

export interface CompraInput {
  fecha?: string | null
  proveedor_id?: number | null
  notas?: string | null
  lineas: LineaInput[]
}

export interface VentaInput {
  fecha?: string | null
  paciente_id?: number | null
  notas?: string | null
  lineas: LineaInput[]
}
