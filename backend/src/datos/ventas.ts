import { and, desc, eq, getTableColumns, inArray, sql, type SQL } from 'drizzle-orm'
import type { BD, Ejecutor } from '../db/cliente'
import {
  caja_cierres,
  METODOS_PAGO,
  pacientes,
  stock_devoluciones,
  stock_devoluciones_lineas,
  stock_productos,
  stock_ventas,
  stock_ventas_lineas,
  stock_ventas_pagos,
} from '../db/esquema'
import { aCentimos, aEuros, euros, repartir } from '../lib/dinero'
import { ErrorHttp } from '../lib/errores'
import { fechaEs, fechaHoraLocal, fechaLocal } from '../lib/fechas'
import type { CorreccionVentaDatos, DevolucionDatos, VentaDatos } from '../validacion'
import { agrupar, idsDe, verificarStockSalida } from './stock'

type MetodoPago = (typeof METODOS_PAGO)[number]
type Pago = { metodo: MetodoPago; importe: number }

const INMEDIATA = { behavior: 'immediate' } as const

export function numeroTicket(id: number): string {
  return `V-${String(id).padStart(6, '0')}`
}

// --- Caja del día ---

export function cierreDe(tx: Ejecutor, fecha: string) {
  return tx.select().from(caja_cierres).where(eq(caja_cierres.fecha, fecha)).get() ?? null
}

// Una caja cerrada no admite movimientos: el cierre guarda las cifras de ese momento.
function exigirCajaAbierta(tx: Ejecutor, fecha: string): void {
  if (cierreDe(tx, fecha) !== null) throw new ErrorHttp(409, `La caja del ${fechaEs(fecha)} ya está cerrada`)
}

// --- Pagos ---

// Junta los pagos por método y exige que cubran el total exacto.
function cuadrarPagos(pagos: Pago[], total: number): Pago[] {
  const juntos = METODOS_PAGO.map((metodo) => ({
    metodo,
    centimos: pagos.filter((p) => p.metodo === metodo).reduce((suma, p) => suma + aCentimos(p.importe), 0),
  })).filter((p) => p.centimos > 0)
  const totalCentimos = aCentimos(total)
  if (totalCentimos > 0 && juntos.length === 0) throw new ErrorHttp(400, 'Indica cómo ha pagado el cliente')
  const pagado = juntos.reduce((suma, p) => suma + p.centimos, 0)
  if (pagado !== totalCentimos) {
    throw new ErrorHttp(400, `Los pagos suman ${euros(aEuros(pagado))} y el total es ${euros(total)}`)
  }
  return juntos.map((p) => ({ metodo: p.metodo, importe: aEuros(p.centimos) }))
}

function efectivoDe(pagos: Pago[]): number {
  return pagos.find((p) => p.metodo === 'efectivo')?.importe ?? 0
}

function pagosDe(tx: Ejecutor, ventaId: number): Pago[] {
  return tx
    .select({ metodo: stock_ventas_pagos.metodo, importe: stock_ventas_pagos.importe })
    .from(stock_ventas_pagos)
    .where(eq(stock_ventas_pagos.venta_id, ventaId))
    .orderBy(stock_ventas_pagos.id)
    .all()
}

function textoPagos(pagos: Pago[]): string {
  if (pagos.length === 0) return 'sin indicar'
  return pagos.map((p) => `${p.metodo} ${euros(p.importe)}`).join(' + ')
}

// --- Consulta ---

type Situacion = 'completada' | 'devuelta_parcial' | 'devuelta' | 'anulada'

function ventasDonde(db: Ejecutor, donde: SQL | undefined) {
  const ventas = db
    .select({ ...getTableColumns(stock_ventas), paciente_nombre: pacientes.nombre })
    .from(stock_ventas)
    .leftJoin(pacientes, eq(pacientes.id, stock_ventas.paciente_id))
    .where(donde)
    .orderBy(desc(stock_ventas.fecha), desc(stock_ventas.id))
    .all()
  const ids = ventas.map((v) => v.id)
  const deEstas = db.select({ id: stock_ventas.id }).from(stock_ventas).where(donde)
  const devuelto = db
    .select({
      venta_linea_id: stock_devoluciones_lineas.venta_linea_id,
      cantidad: sql<number>`sum(${stock_devoluciones_lineas.cantidad})`.mapWith(Number),
    })
    .from(stock_devoluciones_lineas)
    .innerJoin(stock_devoluciones, eq(stock_devoluciones.id, stock_devoluciones_lineas.devolucion_id))
    .where(inArray(stock_devoluciones.venta_id, deEstas))
    .groupBy(stock_devoluciones_lineas.venta_linea_id)
    .all()
  const devueltoPorLinea = new Map(devuelto.map((d) => [d.venta_linea_id, d.cantidad]))
  const lineas = db
    .select({
      padre: stock_ventas_lineas.venta_id,
      id: stock_ventas_lineas.id,
      producto_id: stock_ventas_lineas.producto_id,
      producto_nombre: stock_productos.nombre,
      unidad: stock_productos.unidad,
      cantidad: stock_ventas_lineas.cantidad,
      precio_unitario: stock_ventas_lineas.precio_unitario,
      descuento: stock_ventas_lineas.descuento,
      iva: stock_ventas_lineas.iva,
    })
    .from(stock_ventas_lineas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_ventas_lineas.producto_id))
    .where(inArray(stock_ventas_lineas.venta_id, deEstas))
    .orderBy(stock_ventas_lineas.id)
    .all()
    .map((l) => ({
      ...l,
      importe: aEuros(aCentimos(l.cantidad * l.precio_unitario) - aCentimos(l.descuento)),
      devuelto: devueltoPorLinea.get(l.id) ?? 0,
    }))
  const pagos = db
    .select({
      padre: stock_ventas_pagos.venta_id,
      metodo: stock_ventas_pagos.metodo,
      importe: stock_ventas_pagos.importe,
    })
    .from(stock_ventas_pagos)
    .where(inArray(stock_ventas_pagos.venta_id, deEstas))
    .orderBy(stock_ventas_pagos.id)
    .all()
  const devoluciones = db
    .select({
      padre: stock_devoluciones.venta_id,
      id: stock_devoluciones.id,
      fecha: stock_devoluciones.fecha,
      creado: stock_devoluciones.creado,
      usuario: stock_devoluciones.usuario,
      motivo: stock_devoluciones.motivo,
      metodo_reembolso: stock_devoluciones.metodo_reembolso,
      importe: stock_devoluciones.importe,
      notas: stock_devoluciones.notas,
    })
    .from(stock_devoluciones)
    .where(inArray(stock_devoluciones.venta_id, deEstas))
    .orderBy(stock_devoluciones.id)
    .all()
  const lineasDevueltas = db
    .select({
      padre: stock_devoluciones_lineas.devolucion_id,
      venta_linea_id: stock_devoluciones_lineas.venta_linea_id,
      producto_nombre: stock_productos.nombre,
      cantidad: stock_devoluciones_lineas.cantidad,
      importe: stock_devoluciones_lineas.importe,
      reingresa: stock_devoluciones_lineas.reingresa,
    })
    .from(stock_devoluciones_lineas)
    .innerJoin(stock_devoluciones, eq(stock_devoluciones.id, stock_devoluciones_lineas.devolucion_id))
    .innerJoin(stock_productos, eq(stock_productos.id, stock_devoluciones_lineas.producto_id))
    .where(inArray(stock_devoluciones.venta_id, deEstas))
    .orderBy(stock_devoluciones_lineas.id)
    .all()
  const porDevolucion = agrupar(
    devoluciones.map((d) => d.id),
    lineasDevueltas,
  )
  const porVenta = agrupar(ids, lineas)
  const pagosPorVenta = agrupar(ids, pagos)
  const devolucionesPorVenta = agrupar(
    ids,
    devoluciones.map((d) => ({ ...d, lineas: porDevolucion.get(d.id) ?? [] })),
  )
  return ventas.map((v) => {
    const lineasVenta = porVenta.get(v.id) ?? []
    const devolucionesVenta = devolucionesPorVenta.get(v.id) ?? []
    const totalDevuelto = aEuros(devolucionesVenta.reduce((suma, d) => suma + aCentimos(d.importe), 0))
    return {
      ...v,
      numero: numeroTicket(v.id),
      lineas: lineasVenta,
      pagos: pagosPorVenta.get(v.id) ?? [],
      devoluciones: devolucionesVenta,
      total_devuelto: totalDevuelto,
      situacion: situacionDe({ estado: v.estado, lineas: lineasVenta }),
    }
  })
}

function situacionDe(venta: { estado: string; lineas: { cantidad: number; devuelto: number }[] }): Situacion {
  if (venta.estado === 'anulada') return 'anulada'
  const devuelto = venta.lineas.reduce((suma, l) => suma + l.devuelto, 0)
  if (devuelto === 0) return 'completada'
  return venta.lineas.every((l) => l.devuelto >= l.cantidad) ? 'devuelta' : 'devuelta_parcial'
}

export function listarVentas(db: BD, filtro: { pacienteId: number | null }) {
  return ventasDonde(db, filtro.pacienteId === null ? undefined : eq(stock_ventas.paciente_id, filtro.pacienteId))
}

export function obtenerVenta(db: Ejecutor, id: number) {
  return ventasDonde(db, eq(stock_ventas.id, id))[0] ?? null
}

function cabeceraVenta(tx: Ejecutor, id: number) {
  const venta = tx.select().from(stock_ventas).where(eq(stock_ventas.id, id)).get()
  if (venta === undefined) throw new ErrorHttp(404, 'Venta no encontrada')
  return venta
}

// --- Alta ---

function ivaDeProductos(tx: Ejecutor, ids: number[]): Map<number, number> {
  const filas = tx
    .select({ id: stock_productos.id, iva: stock_productos.iva })
    .from(stock_productos)
    .where(inArray(stock_productos.id, ids))
    .all()
  return new Map(filas.map((f) => [f.id, f.iva]))
}

// El descuento al total se reparte entre las líneas para que el IVA y las devoluciones cuadren.
function lineasConDescuento(lineas: VentaDatos['lineas'], descuentoTotal: number) {
  const netos = lineas.map((l) => Math.max(0, aCentimos(l.cantidad * l.precio_unitario) - aCentimos(l.descuento)))
  const bruto = netos.reduce((suma, n) => suma + n, 0)
  const rebaja = aCentimos(descuentoTotal)
  if (rebaja > bruto) throw new ErrorHttp(400, 'El descuento no puede superar el total de la venta')
  const extra = repartir(rebaja, netos)
  const conDescuento = lineas.map((l, i) => {
    const importe = aCentimos(l.cantidad * l.precio_unitario)
    return { ...l, descuento: aEuros(importe - (netos[i] ?? 0) + (extra[i] ?? 0)) }
  })
  return { lineas: conDescuento, total: aEuros(bruto - rebaja) }
}

export function crearVenta(db: BD, opciones: { datos: VentaDatos; usuario: string; ahora: Date }) {
  const { datos, usuario, ahora } = opciones
  const { lineas, descuento_total, pagos, entregado, ...cabecera } = datos
  return db.transaction((tx) => {
    exigirCajaAbierta(tx, cabecera.fecha)
    verificarStockSalida(tx, lineas)
    const ivas = ivaDeProductos(tx, idsDe(lineas))
    const venta = lineasConDescuento(lineas, descuento_total)
    const cobro = cuadrarPagos(pagos, venta.total)
    const efectivo = efectivoDe(cobro)
    const recibido = efectivo > 0 ? entregado : null
    if (recibido !== null && aCentimos(recibido) < aCentimos(efectivo)) {
      throw new ErrorHttp(400, 'El efectivo entregado no cubre el pago en efectivo')
    }
    const { id } = tx
      .insert(stock_ventas)
      .values({
        ...cabecera,
        total: venta.total,
        creado: fechaHoraLocal(ahora),
        usuario,
        estado: 'completada',
        entregado: recibido,
      })
      .returning({ id: stock_ventas.id })
      .get()
    tx.insert(stock_ventas_lineas)
      .values(venta.lineas.map((l) => ({ ...l, venta_id: id, iva: ivas.get(l.producto_id) ?? 10 })))
      .run()
    if (cobro.length > 0) {
      tx.insert(stock_ventas_pagos)
        .values(cobro.map((p) => ({ ...p, venta_id: id })))
        .run()
    }
    return { id, total: venta.total, paciente_id: cabecera.paciente_id }
  }, INMEDIATA)
}

// --- Corrección (cliente, notas y forma de pago) ---

export function corregirVenta(db: BD, opciones: { id: number; datos: CorreccionVentaDatos }) {
  const { id, datos } = opciones
  return db.transaction((tx) => {
    const venta = cabeceraVenta(tx, id)
    if (venta.estado === 'anulada') throw new ErrorHttp(409, 'No se puede corregir una venta anulada')
    const pagosAntes = pagosDe(tx, id)
    // Las ventas antiguas sin forma de pago pueden seguir así si no se indica ninguna.
    const pagos = datos.pagos.length === 0 && pagosAntes.length === 0 ? [] : cuadrarPagos(datos.pagos, venta.total)
    const cambianPagos = textoPagos(pagos) !== textoPagos(pagosAntes)
    if (cambianPagos) exigirCajaAbierta(tx, venta.fecha ?? '')
    const entregado = efectivoDe(pagos) === efectivoDe(pagosAntes) ? venta.entregado : null
    tx.update(stock_ventas)
      .set({ paciente_id: datos.paciente_id, notas: datos.notas, entregado })
      .where(eq(stock_ventas.id, id))
      .run()
    if (cambianPagos) {
      tx.delete(stock_ventas_pagos).where(eq(stock_ventas_pagos.venta_id, id)).run()
      if (pagos.length > 0) {
        tx.insert(stock_ventas_pagos)
          .values(pagos.map((p) => ({ ...p, venta_id: id })))
          .run()
      }
    }
    return {
      antes: { paciente_id: venta.paciente_id, notas: venta.notas, pagos: textoPagos(pagosAntes) },
      despues: { paciente_id: datos.paciente_id, notas: datos.notas, pagos: textoPagos(pagos) },
    }
  }, INMEDIATA)
}

// --- Anulación ---

export function anularVenta(db: BD, opciones: { id: number; motivo: string; usuario: string; ahora: Date }) {
  const { id, motivo, usuario, ahora } = opciones
  return db.transaction((tx) => {
    const venta = cabeceraVenta(tx, id)
    if (venta.estado === 'anulada') throw new ErrorHttp(409, 'La venta ya está anulada')
    const devolucion = tx
      .select({ id: stock_devoluciones.id })
      .from(stock_devoluciones)
      .where(eq(stock_devoluciones.venta_id, id))
      .get()
    if (devolucion !== undefined) {
      throw new ErrorHttp(409, 'La venta ya tiene devoluciones: registra otra devolución en lugar de anularla')
    }
    if (venta.fecha !== fechaLocal(ahora)) {
      throw new ErrorHttp(
        409,
        'Solo se pueden anular las ventas de hoy. Para una venta de otro día, registra una devolución',
      )
    }
    exigirCajaAbierta(tx, venta.fecha)
    tx.update(stock_ventas)
      .set({
        estado: 'anulada',
        anulacion_motivo: motivo,
        anulacion_fecha: fechaHoraLocal(ahora),
        anulacion_usuario: usuario,
      })
      .where(eq(stock_ventas.id, id))
      .run()
    return { id, total: venta.total, paciente_id: venta.paciente_id }
  }, INMEDIATA)
}

// --- Devoluciones ---

function lineasDeVenta(tx: Ejecutor, ventaId: number) {
  const lineas = tx
    .select({ ...getTableColumns(stock_ventas_lineas), producto_nombre: stock_productos.nombre })
    .from(stock_ventas_lineas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_ventas_lineas.producto_id))
    .where(eq(stock_ventas_lineas.venta_id, ventaId))
    .all()
  const previas = tx
    .select({
      venta_linea_id: stock_devoluciones_lineas.venta_linea_id,
      cantidad: sql<number>`sum(${stock_devoluciones_lineas.cantidad})`.mapWith(Number),
      importe: sql<number>`sum(${stock_devoluciones_lineas.importe})`.mapWith(Number),
    })
    .from(stock_devoluciones_lineas)
    .innerJoin(stock_devoluciones, eq(stock_devoluciones.id, stock_devoluciones_lineas.devolucion_id))
    .where(eq(stock_devoluciones.venta_id, ventaId))
    .groupBy(stock_devoluciones_lineas.venta_linea_id)
    .all()
  const porLinea = new Map(previas.map((p) => [p.venta_linea_id, p]))
  return new Map(
    lineas.map((l) => [
      l.id,
      {
        ...l,
        neto: aCentimos(l.cantidad * l.precio_unitario) - aCentimos(l.descuento),
        devuelto: porLinea.get(l.id)?.cantidad ?? 0,
        reembolsado: aCentimos(porLinea.get(l.id)?.importe ?? 0),
      },
    ]),
  )
}

function quedanPorDevolver(quedan: number): string {
  return quedan === 1 ? 'Solo queda 1 unidad' : `Solo quedan ${quedan} unidades`
}

export function crearDevolucion(
  db: BD,
  opciones: { ventaId: number; datos: DevolucionDatos; usuario: string; ahora: Date },
) {
  const { ventaId, datos, usuario, ahora } = opciones
  const { lineas, ...cabecera } = datos
  return db.transaction((tx) => {
    const venta = cabeceraVenta(tx, ventaId)
    if (venta.estado === 'anulada') throw new ErrorHttp(409, 'La venta está anulada: no se puede devolver')
    const hoy = fechaLocal(ahora)
    exigirCajaAbierta(tx, hoy)
    const deLaVenta = lineasDeVenta(tx, ventaId)
    const filas = lineas.map((pedida) => {
      const linea = deLaVenta.get(pedida.venta_linea_id)
      if (linea === undefined) throw new ErrorHttp(400, 'La línea no pertenece a esta venta')
      const quedan = linea.cantidad - linea.devuelto
      if (quedan <= 0) throw new ErrorHttp(409, `«${linea.producto_nombre}» ya se ha devuelto entero`)
      if (pedida.cantidad > quedan) {
        throw new ErrorHttp(409, `${quedanPorDevolver(quedan)} de «${linea.producto_nombre}» por devolver`)
      }
      // Al devolver lo último se reembolsa lo que falte, para que los redondeos no dejen céntimos.
      const importe =
        pedida.cantidad === quedan
          ? linea.neto - linea.reembolsado
          : Math.round((linea.neto * pedida.cantidad) / linea.cantidad)
      linea.devuelto += pedida.cantidad
      linea.reembolsado += importe
      return {
        venta_linea_id: linea.id,
        producto_id: linea.producto_id,
        cantidad: pedida.cantidad,
        importe: aEuros(importe),
        reingresa: pedida.reingresa ? 1 : 0,
      }
    })
    const importe = aEuros(filas.reduce((suma, f) => suma + aCentimos(f.importe), 0))
    const { id } = tx
      .insert(stock_devoluciones)
      .values({ ...cabecera, venta_id: ventaId, fecha: hoy, creado: fechaHoraLocal(ahora), usuario, importe })
      .returning({ id: stock_devoluciones.id })
      .get()
    tx.insert(stock_devoluciones_lineas)
      .values(filas.map((f) => ({ ...f, devolucion_id: id })))
      .run()
    return { id, importe, paciente_id: venta.paciente_id }
  }, INMEDIATA)
}

// --- Resumen de caja ---

function porMetodo<F extends { metodo: string; importe: number }>(filas: F[]) {
  const suma = (metodo: string) =>
    filas.filter((f) => f.metodo === metodo).reduce((s, f) => s + aCentimos(f.importe), 0)
  return { efectivo: suma('efectivo'), tarjeta: suma('tarjeta'), bizum: suma('bizum') }
}

type PorMetodo = ReturnType<typeof porMetodo>

function enEuros(m: PorMetodo): PorMetodo {
  return { efectivo: aEuros(m.efectivo), tarjeta: aEuros(m.tarjeta), bizum: aEuros(m.bizum) }
}

function centimos(filas: { total: number }[]): number {
  return filas.reduce((s, f) => s + aCentimos(f.total), 0)
}

// Cifras de un día: ventas completadas de ese día y devoluciones hechas ese día (de cualquier venta).
export function resumenCaja(tx: Ejecutor, fecha: string) {
  const ventas = tx
    .select({ id: stock_ventas.id, total: stock_ventas.total, estado: stock_ventas.estado })
    .from(stock_ventas)
    .where(eq(stock_ventas.fecha, fecha))
    .all()
  const completadas = ventas.filter((v) => v.estado === 'completada')
  const anuladas = ventas.filter((v) => v.estado === 'anulada')
  const pagos = tx
    .select({ metodo: stock_ventas_pagos.metodo, importe: stock_ventas_pagos.importe })
    .from(stock_ventas_pagos)
    .innerJoin(stock_ventas, eq(stock_ventas.id, stock_ventas_pagos.venta_id))
    .where(and(eq(stock_ventas.fecha, fecha), eq(stock_ventas.estado, 'completada')))
    .all()
  const devoluciones = tx
    .select({ metodo: stock_devoluciones.metodo_reembolso, importe: stock_devoluciones.importe })
    .from(stock_devoluciones)
    .where(eq(stock_devoluciones.fecha, fecha))
    .all()
  const totalVentas = centimos(completadas)
  const cobrado = porMetodo(pagos)
  const devuelto = porMetodo(devoluciones)
  const sinIndicar = totalVentas - cobrado.efectivo - cobrado.tarjeta - cobrado.bizum
  const totalDevuelto = devuelto.efectivo + devuelto.tarjeta + devuelto.bizum
  return {
    fecha,
    num_ventas: completadas.length,
    total_ventas: aEuros(totalVentas),
    num_anuladas: anuladas.length,
    total_anuladas: aEuros(centimos(anuladas)),
    num_devoluciones: devoluciones.length,
    total_devoluciones: aEuros(totalDevuelto),
    cobrado: { ...enEuros(cobrado), sin_indicar: aEuros(sinIndicar) },
    devuelto: enEuros(devuelto),
    neto: {
      ...enEuros({
        efectivo: cobrado.efectivo - devuelto.efectivo,
        tarjeta: cobrado.tarjeta - devuelto.tarjeta,
        bizum: cobrado.bizum - devuelto.bizum,
      }),
      sin_indicar: aEuros(sinIndicar),
    },
    total_neto: aEuros(totalVentas - totalDevuelto),
    cierre: cierreDe(tx, fecha),
  }
}
