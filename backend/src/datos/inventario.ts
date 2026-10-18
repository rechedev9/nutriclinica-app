import { desc, eq, inArray, sql } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import {
  stock_compras,
  stock_compras_lineas,
  stock_devoluciones,
  stock_devoluciones_lineas,
  stock_mermas,
  stock_productos,
  stock_proveedores,
  stock_recuentos,
  stock_recuentos_lineas,
  stock_ventas,
  stock_ventas_lineas,
} from '../db/esquema'
import { ErrorHttp } from '../lib/errores'
import { fechaHoraLocal, fechaLocal } from '../lib/fechas'
import type { RecuentoDatos } from '../validacion'
import { agrupar, productoConStock } from './stock'
import { numeroTicket } from './ventas'

const INMEDIATA = { behavior: 'immediate' } as const

// Las cantidades admiten decimales: se redondean para que las sumas no arrastren restos binarios.
function redondear(cantidad: number): number {
  return Math.round(cantidad * 1000) / 1000
}

// --- Recuentos de inventario ---

// crearRecuento guarda lo contado y, como ajuste, la diferencia con el stock que calcula el
// sistema en ese momento: tras el recuento el stock de cada producto es lo contado.
export function crearRecuento(db: BD, opciones: { datos: RecuentoDatos; usuario: string; ahora: Date }) {
  const { datos, usuario, ahora } = opciones
  const { lineas, ...cabecera } = datos
  return db.transaction((tx) => {
    const filas = lineas.map((linea) => {
      const producto = productoConStock(tx, linea.producto_id)
      if (producto === undefined || producto.activo !== 1) {
        throw new ErrorHttp(400, 'El producto no existe o está dado de baja')
      }
      const esperado = redondear(producto.stock)
      const contado = redondear(linea.contado)
      return {
        producto_id: linea.producto_id,
        nombre: producto.nombre,
        esperado,
        contado,
        diferencia: redondear(contado - esperado),
      }
    })
    const { id } = tx
      .insert(stock_recuentos)
      .values({ ...cabecera, fecha: fechaLocal(ahora), creado: fechaHoraLocal(ahora), usuario })
      .returning({ id: stock_recuentos.id })
      .get()
    tx.insert(stock_recuentos_lineas)
      .values(
        filas.map((f) => ({
          recuento_id: id,
          producto_id: f.producto_id,
          esperado: f.esperado,
          contado: f.contado,
          diferencia: f.diferencia,
        })),
      )
      .run()
    return { id, lineas: filas }
  }, INMEDIATA)
}

export function listarRecuentos(db: BD) {
  const recuentos = db
    .select()
    .from(stock_recuentos)
    .orderBy(desc(stock_recuentos.creado), desc(stock_recuentos.id))
    .all()
  const ids = recuentos.map((r) => r.id)
  const lineas = db
    .select({
      padre: stock_recuentos_lineas.recuento_id,
      id: stock_recuentos_lineas.id,
      producto_id: stock_recuentos_lineas.producto_id,
      producto_nombre: stock_productos.nombre,
      unidad: stock_productos.unidad,
      esperado: stock_recuentos_lineas.esperado,
      contado: stock_recuentos_lineas.contado,
      diferencia: stock_recuentos_lineas.diferencia,
    })
    .from(stock_recuentos_lineas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_recuentos_lineas.producto_id))
    .where(inArray(stock_recuentos_lineas.recuento_id, ids))
    .orderBy(stock_recuentos_lineas.id)
    .all()
  const porRecuento = agrupar(ids, lineas)
  return recuentos.map((r) => ({ ...r, lineas: porRecuento.get(r.id) ?? [] }))
}

// --- Movimientos de un producto (kardex) ---

// En un mismo instante el recuento va el último: compara con todo lo anterior.
const TIPOS_MOVIMIENTO = ['compra', 'venta', 'anulacion', 'devolucion', 'merma', 'recuento'] as const
type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number]

interface Movimiento {
  tipo: TipoMovimiento
  // Día del movimiento (AAAA-MM-DD) y, si se conoce, el momento exacto para ordenar dentro del día.
  fecha: string
  momento: string | null
  // Con signo: positivo si entra en el almacén, negativo si sale.
  cantidad: number
  referencia_id: number
  ticket: string | null
  // Proveedor de la compra, motivo de la anulación, devolución o recuento, o clave del motivo de la merma.
  detalle: string | null
  usuario: string | null
  contado: number | null
}

// Las compras guardan "AAAA-MM-DDTHH:MM" si se registran con hora.
function momentoDeFecha(fecha: string): string | null {
  return fecha.length > 10 ? `${fecha.slice(0, 10)} ${fecha.slice(11, 16)}:00` : null
}

// La hora de registro de un movimiento con fecha de otro día no dice cuándo ocurrió: se descarta.
function conHoraDelDia(m: Movimiento): Movimiento {
  return m.momento?.slice(0, 10) === m.fecha ? m : { ...m, momento: null }
}

function ordenMovimientos(a: Movimiento, b: Movimiento): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
  const ma = a.momento ?? ''
  const mb = b.momento ?? ''
  if (ma !== mb) return ma < mb ? -1 : 1
  const ta = TIPOS_MOVIMIENTO.indexOf(a.tipo)
  const tb = TIPOS_MOVIMIENTO.indexOf(b.tipo)
  return ta !== tb ? ta - tb : a.referencia_id - b.referencia_id
}

function deCompras(db: BD, productoId: number): Movimiento[] {
  return db
    .select({
      id: stock_compras.id,
      fecha: stock_compras.fecha,
      proveedor: stock_proveedores.nombre,
      albaran: stock_compras.albaran,
      cantidad: sql<number>`sum(${stock_compras_lineas.cantidad})`.mapWith(Number),
    })
    .from(stock_compras_lineas)
    .innerJoin(stock_compras, eq(stock_compras.id, stock_compras_lineas.compra_id))
    .leftJoin(stock_proveedores, eq(stock_proveedores.id, stock_compras.proveedor_id))
    .where(eq(stock_compras_lineas.producto_id, productoId))
    .groupBy(stock_compras.id)
    .all()
    .map((c): Movimiento => {
      const fecha = c.fecha ?? ''
      return {
        tipo: 'compra',
        fecha: fecha.slice(0, 10),
        momento: momentoDeFecha(fecha),
        cantidad: c.cantidad,
        referencia_id: c.id,
        ticket: null,
        detalle:
          c.albaran === null ? c.proveedor : `Albarán ${c.albaran}${c.proveedor === null ? '' : ` · ${c.proveedor}`}`,
        usuario: null,
        contado: null,
      }
    })
}

// Una venta anulada aparece dos veces: la salida al venderla y la entrada al anularla.
function deVentas(db: BD, productoId: number): Movimiento[] {
  const filas = db
    .select({
      id: stock_ventas.id,
      fecha: stock_ventas.fecha,
      creado: stock_ventas.creado,
      usuario: stock_ventas.usuario,
      estado: stock_ventas.estado,
      anulacion_fecha: stock_ventas.anulacion_fecha,
      anulacion_usuario: stock_ventas.anulacion_usuario,
      anulacion_motivo: stock_ventas.anulacion_motivo,
      cantidad: sql<number>`sum(${stock_ventas_lineas.cantidad})`.mapWith(Number),
    })
    .from(stock_ventas_lineas)
    .innerJoin(stock_ventas, eq(stock_ventas.id, stock_ventas_lineas.venta_id))
    .where(eq(stock_ventas_lineas.producto_id, productoId))
    .groupBy(stock_ventas.id)
    .all()
  return filas.flatMap((v): Movimiento[] => {
    const ticket = numeroTicket(v.id)
    const venta: Movimiento = {
      tipo: 'venta',
      fecha: (v.fecha ?? v.creado ?? '').slice(0, 10),
      momento: v.creado,
      cantidad: -v.cantidad,
      referencia_id: v.id,
      ticket,
      detalle: null,
      usuario: v.usuario,
      contado: null,
    }
    if (v.estado !== 'anulada') return [venta]
    const cuando = v.anulacion_fecha ?? v.creado ?? venta.fecha
    return [
      venta,
      {
        tipo: 'anulacion',
        fecha: cuando.slice(0, 10),
        momento: v.anulacion_fecha,
        cantidad: v.cantidad,
        referencia_id: v.id,
        ticket,
        detalle: v.anulacion_motivo,
        usuario: v.anulacion_usuario,
        contado: null,
      },
    ]
  })
}

// Lo devuelto que no vuelve al almacén figura con cantidad 0: queda la traza sin mover el stock.
function deDevoluciones(db: BD, productoId: number): Movimiento[] {
  return db
    .select({
      id: stock_devoluciones.id,
      venta_id: stock_devoluciones.venta_id,
      fecha: stock_devoluciones.fecha,
      creado: stock_devoluciones.creado,
      usuario: stock_devoluciones.usuario,
      motivo: stock_devoluciones.motivo,
      reingresa: stock_devoluciones_lineas.reingresa,
      cantidad: sql<number>`sum(${stock_devoluciones_lineas.cantidad})`.mapWith(Number),
    })
    .from(stock_devoluciones_lineas)
    .innerJoin(stock_devoluciones, eq(stock_devoluciones.id, stock_devoluciones_lineas.devolucion_id))
    .where(eq(stock_devoluciones_lineas.producto_id, productoId))
    .groupBy(stock_devoluciones.id, stock_devoluciones_lineas.reingresa)
    .all()
    .map((d): Movimiento => ({
      tipo: 'devolucion',
      fecha: d.fecha,
      momento: d.creado,
      cantidad: d.reingresa === 1 ? d.cantidad : 0,
      referencia_id: d.venta_id,
      ticket: numeroTicket(d.venta_id),
      detalle: d.motivo,
      usuario: d.usuario,
      contado: null,
    }))
}

function deMermas(db: BD, productoId: number): Movimiento[] {
  return db
    .select()
    .from(stock_mermas)
    .where(eq(stock_mermas.producto_id, productoId))
    .all()
    .map((m): Movimiento => ({
      tipo: 'merma',
      fecha: (m.fecha ?? m.creado ?? '').slice(0, 10),
      momento: m.creado,
      cantidad: -m.cantidad,
      referencia_id: m.id,
      ticket: null,
      detalle: m.motivo,
      usuario: null,
      contado: null,
    }))
}

function deRecuentos(db: BD, productoId: number): Movimiento[] {
  return db
    .select({
      id: stock_recuentos.id,
      fecha: stock_recuentos.fecha,
      creado: stock_recuentos.creado,
      usuario: stock_recuentos.usuario,
      motivo: stock_recuentos.motivo,
      contado: stock_recuentos_lineas.contado,
      diferencia: stock_recuentos_lineas.diferencia,
    })
    .from(stock_recuentos_lineas)
    .innerJoin(stock_recuentos, eq(stock_recuentos.id, stock_recuentos_lineas.recuento_id))
    .where(eq(stock_recuentos_lineas.producto_id, productoId))
    .all()
    .map((r): Movimiento => ({
      tipo: 'recuento',
      fecha: r.fecha,
      momento: r.creado,
      cantidad: r.diferencia,
      referencia_id: r.id,
      ticket: null,
      detalle: r.motivo,
      usuario: r.usuario,
      contado: r.contado,
    }))
}

// movimientosDeProducto lista, del más antiguo al más reciente, todo lo que ha movido el stock
// de un producto con el saldo tras cada movimiento. El último saldo es el stock actual.
export function movimientosDeProducto(db: BD, id: number) {
  const producto = productoConStock(db, id)
  if (producto === undefined) throw new ErrorHttp(404, 'Producto no encontrado')
  const todos = [
    ...deCompras(db, id),
    ...deVentas(db, id),
    ...deDevoluciones(db, id),
    ...deMermas(db, id),
    ...deRecuentos(db, id),
  ]
    .map(conHoraDelDia)
    .toSorted(ordenMovimientos)
  let saldo = 0
  const movimientos = todos.map((m) => {
    saldo = redondear(saldo + m.cantidad)
    return { ...m, saldo }
  })
  return {
    producto: {
      id,
      nombre: producto.nombre,
      unidad: producto.unidad,
      stock_minimo: producto.stock_minimo,
      activo: producto.activo,
      stock_actual: redondear(producto.stock),
    },
    movimientos,
  }
}
