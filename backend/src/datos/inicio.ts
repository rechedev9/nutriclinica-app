import { and, eq, gte, isNotNull, max, sql } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import {
  pacientes,
  stock_devoluciones,
  stock_devoluciones_lineas,
  stock_productos,
  stock_ventas,
  stock_ventas_lineas,
} from '../db/esquema'
import { aEuros } from '../lib/dinero'
import { fechaLocal, sumarDias } from '../lib/fechas'
import { estadoCaja } from './dias-sin-cerrar'

const DIAS_HABITOS = 365

const completada = eq(stock_ventas.estado, 'completada')

// El pulso compara el mes en curso con el anterior (y la semana y el día con los de la semana
// pasada, que caen siempre dentro de ese tramo): hacen falta datos desde el día 1 del mes pasado.
export function inicioDelPulso(hoy: string): string {
  const anio = Number(hoy.slice(0, 4))
  const mes = Number(hoy.slice(5, 7))
  return mes === 1 ? `${anio - 1}-12-01` : `${anio}-${String(mes - 1).padStart(2, '0')}-01`
}

// Ventas completadas y devoluciones por día, con la regla de la caja: una devolución
// cuenta el día en que se hace. Las sumas van en céntimos para no arrastrar decimales.
function ventasPorDia(db: BD, desde: string) {
  const ventas = db
    .select({
      fecha: stock_ventas.fecha,
      num_ventas: sql<number>`count(*)`.mapWith(Number),
      centimos: sql<number>`sum(round(${stock_ventas.total} * 100))`.mapWith(Number),
    })
    .from(stock_ventas)
    .where(and(completada, gte(stock_ventas.fecha, desde)))
    .groupBy(stock_ventas.fecha)
    .all()
  const devoluciones = db
    .select({
      fecha: stock_devoluciones.fecha,
      centimos: sql<number>`sum(round(${stock_devoluciones.importe} * 100))`.mapWith(Number),
    })
    .from(stock_devoluciones)
    .where(gte(stock_devoluciones.fecha, desde))
    .groupBy(stock_devoluciones.fecha)
    .all()
  const dias = new Map<string, { fecha: string; num_ventas: number; ventas: number; devoluciones: number }>()
  const dia = (fecha: string) => {
    const existente = dias.get(fecha)
    if (existente !== undefined) return existente
    const nuevo = { fecha, num_ventas: 0, ventas: 0, devoluciones: 0 }
    dias.set(fecha, nuevo)
    return nuevo
  }
  for (const v of ventas) {
    if (v.fecha === null) continue
    const fila = dia(v.fecha)
    fila.num_ventas = v.num_ventas
    fila.ventas = aEuros(v.centimos)
  }
  for (const d of devoluciones) dia(d.fecha).devoluciones = aEuros(d.centimos)
  return [...dias.values()].toSorted((a, b) => a.fecha.localeCompare(b.fecha))
}

function ultimasComprasPorCliente(db: BD) {
  return db
    .select({ paciente_id: stock_ventas.paciente_id, fecha: max(stock_ventas.fecha) })
    .from(stock_ventas)
    .where(and(completada, isNotNull(stock_ventas.paciente_id)))
    .groupBy(stock_ventas.paciente_id)
    .all()
    .flatMap((f) =>
      f.paciente_id === null || f.fecha === null ? [] : [{ paciente_id: f.paciente_id, fecha: f.fecha }],
    )
}

function ultimasVentasPorProducto(db: BD) {
  return db
    .select({ producto_id: stock_ventas_lineas.producto_id, fecha: max(stock_ventas.fecha) })
    .from(stock_ventas_lineas)
    .innerJoin(stock_ventas, eq(stock_ventas.id, stock_ventas_lineas.venta_id))
    .where(completada)
    .groupBy(stock_ventas_lineas.producto_id)
    .all()
    .flatMap((f) => (f.fecha === null ? [] : [{ producto_id: f.producto_id, fecha: f.fecha }]))
}

// Días en que cada cliente compró cada producto activo en el último año, sin las líneas
// devueltas enteras. Solo los pares con dos días o más: los que permiten ver un hábito.
function habitosDeCompra(db: BD, hoy: string) {
  const devuelto = sql`coalesce((select sum(${stock_devoluciones_lineas}.cantidad) from ${stock_devoluciones_lineas}
    where ${stock_devoluciones_lineas}.venta_linea_id = ${stock_ventas_lineas}.id), 0)`
  const filas = db
    .selectDistinct({
      paciente_id: pacientes.id,
      paciente_nombre: pacientes.nombre,
      producto_id: stock_productos.id,
      producto_nombre: stock_productos.nombre,
      fecha: stock_ventas.fecha,
    })
    .from(stock_ventas_lineas)
    .innerJoin(stock_ventas, eq(stock_ventas.id, stock_ventas_lineas.venta_id))
    .innerJoin(pacientes, eq(pacientes.id, stock_ventas.paciente_id))
    .innerJoin(stock_productos, eq(stock_productos.id, stock_ventas_lineas.producto_id))
    .where(
      and(
        completada,
        eq(stock_productos.activo, 1),
        gte(stock_ventas.fecha, sumarDias(hoy, -DIAS_HABITOS)),
        sql`${stock_ventas_lineas.cantidad} > ${devuelto}`,
      ),
    )
    .orderBy(stock_ventas.fecha)
    .all()
  const pares = new Map<
    string,
    { paciente_id: number; paciente_nombre: string; producto_id: number; producto_nombre: string; fechas: string[] }
  >()
  for (const { fecha, ...par } of filas) {
    if (fecha === null) continue
    const clave = `${par.paciente_id}-${par.producto_id}`
    const existente = pares.get(clave)
    if (existente === undefined) pares.set(clave, { ...par, fechas: [fecha] })
    else existente.fechas.push(fecha)
  }
  return [...pares.values()].filter((p) => p.fechas.length >= 2)
}

// Lo que Inicio necesita de las ventas, ya agregado, para no descargar todo el historial.
export function resumenInicio(db: BD, ahora: Date) {
  const hoy = fechaLocal(ahora)
  return {
    hoy,
    dias: ventasPorDia(db, inicioDelPulso(hoy)),
    caja: estadoCaja(db, hoy),
    ultimas_compras: ultimasComprasPorCliente(db),
    ultimas_ventas_producto: ultimasVentasPorProducto(db),
    habitos: habitosDeCompra(db, hoy),
  }
}
