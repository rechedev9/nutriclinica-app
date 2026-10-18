import { and, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import type { BD, Ejecutor } from '../db/cliente'
import {
  type ESTADOS_PEDIDO,
  stock_compras,
  stock_compras_lineas,
  stock_pedidos,
  stock_pedidos_lineas,
  stock_productos,
  stock_proveedores,
} from '../db/esquema'
import { ErrorHttp } from '../lib/errores'
import { fechaHoraLocal } from '../lib/fechas'
import type { PedidoDatos, RecepcionDatos } from '../validacion'
import { agrupar, comprobarAlbaranLibre, idsDe, numeroPedido, totalDe } from './stock'

type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]
type SituacionPedido = 'pendiente' | 'parcial' | 'recibido' | 'incompleto' | 'cancelado'

const INMEDIATA = { behavior: 'immediate' } as const
// Margen al comparar cantidades con decimales (kg, l).
const EPSILON = 1e-9

// La situación no se guarda: sale de lo pedido, lo recibido en los albaranes y el estado.
function situacionDe(pedido: {
  estado: EstadoPedido
  lineas: { cantidad: number; recibido: number }[]
  recepciones: number
}): SituacionPedido {
  if (pedido.lineas.every((l) => l.recibido + EPSILON >= l.cantidad)) return 'recibido'
  if (pedido.estado === 'cerrado') return pedido.recepciones > 0 ? 'incompleto' : 'cancelado'
  return pedido.recepciones > 0 ? 'parcial' : 'pendiente'
}

// Unidades recibidas de cada producto en los albaranes de un pedido (o de todos).
function recibidoPorProducto(tx: Ejecutor, pedidoId: number | null) {
  const filas = tx
    .select({
      pedido_id: stock_pedidos.id,
      producto_id: stock_compras_lineas.producto_id,
      cantidad: sql<number>`sum(${stock_compras_lineas.cantidad})`.mapWith(Number),
    })
    .from(stock_compras_lineas)
    .innerJoin(stock_compras, eq(stock_compras.id, stock_compras_lineas.compra_id))
    .innerJoin(stock_pedidos, eq(stock_pedidos.id, stock_compras.pedido_id))
    .where(pedidoId === null ? undefined : eq(stock_pedidos.id, pedidoId))
    .groupBy(stock_pedidos.id, stock_compras_lineas.producto_id)
    .all()
  return new Map(filas.map((f) => [`${f.pedido_id}:${f.producto_id}`, f.cantidad]))
}

function lineasDePedidos(tx: Ejecutor, ids: number[]) {
  const lineas = tx
    .select({
      padre: stock_pedidos_lineas.pedido_id,
      id: stock_pedidos_lineas.id,
      producto_id: stock_pedidos_lineas.producto_id,
      cantidad: stock_pedidos_lineas.cantidad,
      precio_unitario: stock_pedidos_lineas.precio_unitario,
      producto_nombre: stock_productos.nombre,
      unidad: stock_productos.unidad,
    })
    .from(stock_pedidos_lineas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_pedidos_lineas.producto_id))
    .where(inArray(stock_pedidos_lineas.pedido_id, ids))
    .orderBy(stock_pedidos_lineas.id)
    .all()
  return agrupar(ids, lineas)
}

export function listarPedidos(db: BD) {
  const pedidos = db
    .select({ ...getTableColumns(stock_pedidos), proveedor_nombre: stock_proveedores.nombre })
    .from(stock_pedidos)
    .innerJoin(stock_proveedores, eq(stock_proveedores.id, stock_pedidos.proveedor_id))
    .orderBy(desc(stock_pedidos.fecha), desc(stock_pedidos.id))
    .all()
  const ids = pedidos.map((p) => p.id)
  const porPedido = lineasDePedidos(db, ids)
  const recibido = recibidoPorProducto(db, null)
  const recepciones = db
    .select({
      padre: stock_pedidos.id,
      id: stock_compras.id,
      fecha: stock_compras.fecha,
      albaran: stock_compras.albaran,
      total: stock_compras.total,
    })
    .from(stock_compras)
    .innerJoin(stock_pedidos, eq(stock_pedidos.id, stock_compras.pedido_id))
    .orderBy(stock_compras.fecha, stock_compras.id)
    .all()
  const porRecepcion = agrupar(ids, recepciones)
  return pedidos.map((p) => {
    const lineas = (porPedido.get(p.id) ?? []).map((l) => ({
      ...l,
      recibido: recibido.get(`${p.id}:${l.producto_id}`) ?? 0,
    }))
    const albaranes = porRecepcion.get(p.id) ?? []
    return {
      ...p,
      numero: numeroPedido(p.id),
      total: totalDe(lineas),
      situacion: situacionDe({ estado: p.estado, lineas, recepciones: albaranes.length }),
      lineas,
      recepciones: albaranes,
    }
  })
}

function comprobarProveedor(tx: Ejecutor, id: number): void {
  const proveedor = tx
    .select({ id: stock_proveedores.id })
    .from(stock_proveedores)
    .where(eq(stock_proveedores.id, id))
    .get()
  if (proveedor === undefined) throw new ErrorHttp(400, 'El proveedor no existe')
}

// Solo se piden productos activos.
function comprobarProductosActivos(tx: Ejecutor, lineas: { producto_id: number }[]): void {
  const ids = idsDe(lineas)
  const activos = tx
    .select({ id: stock_productos.id })
    .from(stock_productos)
    .where(and(inArray(stock_productos.id, ids), eq(stock_productos.activo, 1)))
    .all()
  if (activos.length !== ids.length) throw new ErrorHttp(400, 'El producto no existe o está dado de baja')
}

function cabeceraDe(tx: Ejecutor, id: number) {
  const pedido = tx
    .select({ proveedor_id: stock_pedidos.proveedor_id, estado: stock_pedidos.estado })
    .from(stock_pedidos)
    .where(eq(stock_pedidos.id, id))
    .get()
  if (pedido === undefined) throw new ErrorHttp(404, 'Pedido no encontrado')
  return pedido
}

function tieneAlbaranes(tx: Ejecutor, id: number): boolean {
  return (
    tx.select({ id: stock_compras.id }).from(stock_compras).where(eq(stock_compras.pedido_id, id)).get() !== undefined
  )
}

export function crearPedido(db: BD, pedido: { datos: PedidoDatos; usuario: string; ahora: Date }): number {
  const { lineas, ...cabecera } = pedido.datos
  return db.transaction((tx) => {
    comprobarProveedor(tx, cabecera.proveedor_id)
    comprobarProductosActivos(tx, lineas)
    const { id } = tx
      .insert(stock_pedidos)
      .values({ ...cabecera, creado: fechaHoraLocal(pedido.ahora), usuario: pedido.usuario })
      .returning({ id: stock_pedidos.id })
      .get()
    tx.insert(stock_pedidos_lineas)
      .values(lineas.map((l) => ({ ...l, pedido_id: id })))
      .run()
    return id
  }, INMEDIATA)
}

// Un pedido se corrige mientras no ha llegado nada; después se cierra o se reabre.
export function actualizarPedido(db: BD, pedido: { id: number; datos: PedidoDatos }): void {
  const { lineas, ...cabecera } = pedido.datos
  db.transaction((tx) => {
    const actual = cabeceraDe(tx, pedido.id)
    if (actual.estado === 'cerrado') throw new ErrorHttp(409, 'El pedido está cerrado: reábrelo para modificarlo')
    if (tieneAlbaranes(tx, pedido.id)) {
      throw new ErrorHttp(409, 'No se puede modificar: el pedido ya tiene albaranes entrados')
    }
    comprobarProveedor(tx, cabecera.proveedor_id)
    comprobarProductosActivos(tx, lineas)
    tx.update(stock_pedidos).set(cabecera).where(eq(stock_pedidos.id, pedido.id)).run()
    tx.delete(stock_pedidos_lineas).where(eq(stock_pedidos_lineas.pedido_id, pedido.id)).run()
    tx.insert(stock_pedidos_lineas)
      .values(lineas.map((l) => ({ ...l, pedido_id: pedido.id })))
      .run()
  }, INMEDIATA)
}

export function eliminarPedido(db: BD, id: number): void {
  db.transaction((tx) => {
    cabeceraDe(tx, id)
    if (tieneAlbaranes(tx, id)) {
      throw new ErrorHttp(
        409,
        'No se puede eliminar: el pedido ya tiene albaranes entrados. Ciérralo si no esperas más',
      )
    }
    tx.delete(stock_pedidos_lineas).where(eq(stock_pedidos_lineas.pedido_id, id)).run()
    tx.delete(stock_pedidos).where(eq(stock_pedidos.id, id)).run()
  }, INMEDIATA)
}

export function cambiarEstadoPedido(db: BD, pedido: { id: number; estado: EstadoPedido }): void {
  const cambiados = db
    .update(stock_pedidos)
    .set({ estado: pedido.estado })
    .where(eq(stock_pedidos.id, pedido.id))
    .returning({ id: stock_pedidos.id })
    .all()
  if (cambiados.length === 0) throw new ErrorHttp(404, 'Pedido no encontrado')
}

// Entra el albarán de un pedido: una compra de su proveedor que suma las existencias.
// Puede llegar más de lo pedido; lo que no está en el pedido va por una compra aparte.
export function recibirPedido(db: BD, recepcion: { id: number; datos: RecepcionDatos }): number {
  const { lineas, cerrar, ...cabecera } = recepcion.datos
  const pedidoId = recepcion.id
  return db.transaction((tx) => {
    const pedido = cabeceraDe(tx, pedidoId)
    if (pedido.estado === 'cerrado')
      throw new ErrorHttp(409, 'El pedido está cerrado: reábrelo para entrar otro albarán')
    const recibido = recibidoPorProducto(tx, pedidoId)
    const pedidas = lineasDePedidos(tx, [pedidoId]).get(pedidoId) ?? []
    const pendiente = pedidas.some((l) => (recibido.get(`${pedidoId}:${l.producto_id}`) ?? 0) + EPSILON < l.cantidad)
    if (!pendiente) throw new ErrorHttp(409, 'El pedido ya está recibido completo')
    const enPedido = new Set(pedidas.map((l) => l.producto_id))
    if (lineas.some((l) => !enPedido.has(l.producto_id))) {
      throw new ErrorHttp(400, 'Un producto del albarán no está en el pedido')
    }
    comprobarAlbaranLibre(tx, { numero: cabecera.albaran, proveedor_id: pedido.proveedor_id, excepto: 0 })
    const { id } = tx
      .insert(stock_compras)
      .values({ ...cabecera, proveedor_id: pedido.proveedor_id, pedido_id: pedidoId, total: totalDe(lineas) })
      .returning({ id: stock_compras.id })
      .get()
    tx.insert(stock_compras_lineas)
      .values(lineas.map((l) => ({ ...l, compra_id: id })))
      .run()
    if (cerrar) tx.update(stock_pedidos).set({ estado: 'cerrado' }).where(eq(stock_pedidos.id, pedidoId)).run()
    return id
  }, INMEDIATA)
}
