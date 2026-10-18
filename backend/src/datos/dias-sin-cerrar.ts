import { and, eq, gte, lt } from 'drizzle-orm'
import type { Ejecutor } from '../db/cliente'
import { caja_cierres, stock_devoluciones, stock_ventas } from '../db/esquema'
import { sumarDias } from '../lib/fechas'

const DIAS_AVISO_CAJA = 30

function desdeSinCerrar(cerrados: readonly string[], hoy: string): string | null {
  let primero: string | null = null
  for (const fecha of cerrados) {
    if (primero === null || fecha < primero) primero = fecha
  }
  if (primero === null) return null
  const limite = sumarDias(hoy, -DIAS_AVISO_CAJA)
  return primero > limite ? primero : limite
}

export function diasSinCerrar(opciones: {
  movimientos: readonly string[]
  cerrados: readonly string[]
  hoy: string
}): string[] {
  const { movimientos, cerrados, hoy } = opciones
  const desde = desdeSinCerrar(cerrados, hoy)
  if (desde === null) return []
  const cerrado = new Set(cerrados)
  return [...new Set(movimientos)]
    .filter((fecha) => fecha >= desde && fecha < hoy && cerrado.has(fecha) === false)
    .toSorted((a, b) => b.localeCompare(a))
}

export function estadoCaja(db: Ejecutor, hoy: string): { cerrada_hoy: boolean; sin_cerrar: string[] } {
  const cerrados = db
    .select({ fecha: caja_cierres.fecha })
    .from(caja_cierres)
    .all()
    .map((c) => c.fecha)
  const cerradaHoy = cerrados.includes(hoy)
  const desde = desdeSinCerrar(cerrados, hoy)
  if (desde === null) return { cerrada_hoy: cerradaHoy, sin_cerrar: [] }
  const conVentas = db
    .selectDistinct({ fecha: stock_ventas.fecha })
    .from(stock_ventas)
    .where(and(eq(stock_ventas.estado, 'completada'), gte(stock_ventas.fecha, desde), lt(stock_ventas.fecha, hoy)))
    .all()
  const conDevoluciones = db
    .selectDistinct({ fecha: stock_devoluciones.fecha })
    .from(stock_devoluciones)
    .where(and(gte(stock_devoluciones.fecha, desde), lt(stock_devoluciones.fecha, hoy)))
    .all()
  const movimientos = [...conVentas, ...conDevoluciones].flatMap((f) => (f.fecha === null ? [] : [f.fecha]))
  return { cerrada_hoy: cerradaHoy, sin_cerrar: diasSinCerrar({ movimientos, cerrados, hoy }) }
}
