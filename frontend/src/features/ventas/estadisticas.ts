import type { EstadisticasVentas, MetodoPago, ProductoEstadistica } from '@/types'
import { etiquetaMetodo } from './carrito'
import { PERIODO_INICIAL } from './periodos'
import type { BusquedaEstadisticas, Periodo } from './periodos'

// Periodos, comparación y agrupaciones de la pestaña Estadísticas. Las cifras llegan ya
// agregadas del servidor (GET /api/ventas/estadisticas); aquí solo se reparten y ordenan.

export interface Rango {
  desde: string
  hasta: string
}

export type Granularidad = 'dia' | 'semana' | 'mes'

export type Criterio = 'neto' | 'unidades' | 'margen'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const aCentimos = (importe: number) => Math.round(importe * 100)
const aEuros = (centimos: number) => centimos / 100

function dos(n: number): string {
  return String(n).padStart(2, '0')
}

function fechaUTC(dia: string): Date {
  return new Date(`${dia}T00:00:00Z`)
}

function aDia(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function sumarDias(dia: string, n: number): string {
  const d = fechaUTC(dia)
  d.setUTCDate(d.getUTCDate() + n)
  return aDia(d)
}

// Días del rango, contando los dos extremos.
function diasDelRango(rango: Rango): number {
  return Math.round((fechaUTC(rango.hasta).getTime() - fechaUTC(rango.desde).getTime()) / 86_400_000) + 1
}

function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

// Día `dia` del mes, sin pasar del último (31 de marzo → 30 de abril).
function diaDelMes(opciones: { anio: number; mes: number; dia: number }): string {
  const d = new Date(Date.UTC(opciones.anio, opciones.mes - 1, 1))
  const ultimo = ultimoDiaDelMes(d.getUTCFullYear(), d.getUTCMonth() + 1)
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(Math.min(opciones.dia, ultimo))}`
}

function partes(dia: string) {
  return { anio: Number(dia.slice(0, 4)), mes: Number(dia.slice(5, 7)), dia: Number(dia.slice(8, 10)) }
}

// Rango del periodo elegido, o null si el personalizado no es válido.
export function rangoDe(opciones: { busqueda: BusquedaEstadisticas; hoy: string }): Rango | null {
  const { busqueda, hoy } = opciones
  const { anio, mes } = partes(hoy)
  switch (busqueda.periodo ?? PERIODO_INICIAL) {
    case 'hoy':
      return { desde: hoy, hasta: hoy }
    case '7d':
      return { desde: sumarDias(hoy, -6), hasta: hoy }
    case '30d':
      return { desde: sumarDias(hoy, -29), hasta: hoy }
    case 'mes':
      return { desde: diaDelMes({ anio, mes, dia: 1 }), hasta: hoy }
    case 'mes_anterior':
      return { desde: diaDelMes({ anio, mes: mes - 1, dia: 1 }), hasta: diaDelMes({ anio, mes: mes - 1, dia: 31 }) }
    case 'anio':
      return { desde: `${anio}-01-01`, hasta: hoy }
    case 'personalizado': {
      const { desde, hasta } = busqueda
      if (desde === undefined || hasta === undefined || desde > hasta) return null
      return { desde, hasta }
    }
  }
}

// Periodo con el que se compara: el mismo tramo del mes o del año anterior en los periodos de
// calendario, y los mismos días justo antes en los demás.
export function rangoAnterior(periodo: Periodo, rango: Rango): Rango {
  const desde = partes(rango.desde)
  const hasta = partes(rango.hasta)
  // Un mes completo se compara con el mes anterior completo, tenga los días que tenga.
  const finDeMes = hasta.dia === ultimoDiaDelMes(hasta.anio, hasta.mes)
  switch (periodo) {
    case 'mes':
    case 'mes_anterior':
      return {
        desde: diaDelMes({ anio: desde.anio, mes: desde.mes - 1, dia: 1 }),
        hasta: diaDelMes({ anio: hasta.anio, mes: hasta.mes - 1, dia: finDeMes ? 31 : hasta.dia }),
      }
    case 'anio':
      return {
        desde: `${desde.anio - 1}-01-01`,
        hasta: diaDelMes({ anio: hasta.anio - 1, mes: hasta.mes, dia: hasta.dia }),
      }
    default:
      return { desde: sumarDias(rango.desde, -diasDelRango(rango)), hasta: sumarDias(rango.desde, -1) }
  }
}

export function granularidadDe(rango: Rango): Granularidad {
  const dias = diasDelRango(rango)
  if (dias <= 31) return 'dia'
  if (dias <= 120) return 'semana'
  return 'mes'
}

// «12 oct», «12 oct 2025» si se pide el año.
function fechaCorta(dia: string, conAnio = false): string {
  const { anio, mes, dia: d } = partes(dia)
  return `${d} ${MESES[mes - 1] ?? ''}${conAnio ? ` ${anio}` : ''}`
}

export function textoRango(rango: Rango): string {
  if (rango.desde === rango.hasta) return fechaCorta(rango.desde, true)
  const mismoAnio = rango.desde.slice(0, 4) === rango.hasta.slice(0, 4)
  return `${fechaCorta(rango.desde, !mismoAnio)} a ${fechaCorta(rango.hasta, true)}`
}

function lunesDe(dia: string): string {
  return sumarDias(dia, -((fechaUTC(dia).getUTCDay() + 6) % 7))
}

interface Tramo {
  clave: string
  etiqueta: string
  neto: number
  tickets: number
}

function claveDe(dia: string, granularidad: Granularidad): string {
  if (granularidad === 'semana') return lunesDe(dia)
  if (granularidad === 'mes') return dia.slice(0, 7)
  return dia
}

// Tramos consecutivos que cubren el rango entero, con cero donde no hubo ventas.
export function serieEvolucion(opciones: {
  rango: Rango
  porDia: EstadisticasVentas['por_dia']
  granularidad: Granularidad
}): Tramo[] {
  const { rango, porDia, granularidad } = opciones
  const tramos = new Map<string, { etiqueta: string; neto: number; tickets: number }>()
  for (let dia = rango.desde; dia <= rango.hasta; dia = sumarDias(dia, 1)) {
    const clave = claveDe(dia, granularidad)
    if (tramos.has(clave)) continue
    const { anio, mes } = partes(dia)
    const etiqueta = granularidad === 'mes' ? `${MESES[mes - 1] ?? ''} ${String(anio).slice(2)}` : fechaCorta(dia)
    tramos.set(clave, { etiqueta, neto: 0, tickets: 0 })
  }
  for (const d of porDia) {
    if (d.fecha < rango.desde || d.fecha > rango.hasta) continue
    const tramo = tramos.get(claveDe(d.fecha, granularidad))
    if (tramo === undefined) continue
    tramo.neto += aCentimos(d.neto)
    tramo.tickets += d.tickets
  }
  return [...tramos].map(([clave, t]) => ({ clave, ...t, neto: aEuros(t.neto) }))
}

// Suma por día de la semana, de lunes a domingo.
export function ventasPorDiaSemana(porDia: EstadisticasVentas['por_dia']): Tramo[] {
  const dias = DIAS_SEMANA.map((etiqueta, i) => ({ clave: String(i), etiqueta, neto: 0, tickets: 0 }))
  for (const d of porDia) {
    const dia = dias[(fechaUTC(d.fecha).getUTCDay() + 6) % 7]
    if (dia === undefined) continue
    dia.neto += aCentimos(d.neto)
    dia.tickets += d.tickets
  }
  return dias.map((d) => ({ ...d, neto: aEuros(d.neto) }))
}

// Horas seguidas desde la primera hasta la última con ventas, con cero en las de en medio.
export function ventasPorHora(porHora: EstadisticasVentas['por_hora']): Tramo[] {
  const horas = porHora.map((h) => h.hora)
  if (horas.length === 0) return []
  const primera = Math.min(...horas)
  return Array.from({ length: Math.max(...horas) - primera + 1 }, (_, i) => {
    const hora = primera + i
    const datos = porHora.find((h) => h.hora === hora)
    return { clave: String(hora), etiqueta: `${dos(hora)}:00`, neto: datos?.neto ?? 0, tickets: datos?.tickets ?? 0 }
  })
}

// Variación en % frente al periodo anterior; null si antes no hubo nada con que comparar.
export function variacion(opciones: { actual: number; anterior: number }): number | null {
  const { actual, anterior } = opciones
  if (anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

// Diferencia en puntos entre dos porcentajes (para tasas, donde un % de un % confunde).
export function puntos(opciones: { actual: number | null; anterior: number | null }): number | null {
  const { actual, anterior } = opciones
  return actual === null || anterior === null ? null : actual - anterior
}

export function fmtPorcentaje(valor: number): string {
  return `${valor.toFixed(1).replace('.', ',')} %`
}

export function fmtUnidades(valor: number): string {
  return String(Math.round(valor * 100) / 100).replace('.', ',')
}

function valorSegun(p: ProductoEstadistica, criterio: Criterio): number | null {
  if (criterio === 'margen') return p.margen
  return criterio === 'unidades' ? p.unidades : p.neto
}

// Los primeros productos según el criterio; por margen solo entran los que tienen coste.
export function topProductos(opciones: {
  productos: readonly ProductoEstadistica[]
  criterio: Criterio
  limite: number
}): { producto: ProductoEstadistica; valor: number }[] {
  const { productos, criterio, limite } = opciones
  return productos
    .flatMap((producto) => {
      const valor = valorSegun(producto, criterio)
      return valor === null ? [] : [{ producto, valor }]
    })
    .toSorted((a, b) => b.valor - a.valor || a.producto.nombre.localeCompare(b.producto.nombre, 'es'))
    .slice(0, limite)
}

const SIN_CATEGORIA = 'Sin categoría'

export function ventasPorCategoria(productos: readonly ProductoEstadistica[]) {
  const categorias = new Map<string, { neto: number; unidades: number }>()
  for (const p of productos) {
    const nombre = p.categoria ?? SIN_CATEGORIA
    const actual = categorias.get(nombre) ?? { neto: 0, unidades: 0 }
    categorias.set(nombre, { neto: actual.neto + aCentimos(p.neto), unidades: actual.unidades + p.unidades })
  }
  return [...categorias]
    .map(([categoria, c]) => ({ categoria, neto: aEuros(c.neto), unidades: Math.round(c.unidades * 1000) / 1000 }))
    .toSorted((a, b) => b.neto - a.neto || a.categoria.localeCompare(b.categoria, 'es'))
}

type ClaveMetodo = keyof EstadisticasVentas['metodos']

const ORDEN_METODOS: ClaveMetodo[] = ['efectivo', 'tarjeta', 'bizum', 'sin_indicar']

function esMetodoPago(clave: ClaveMetodo): clave is MetodoPago {
  return clave !== 'sin_indicar'
}

// Métodos con algún cobro, en orden fijo para que cada uno conserve su color.
export function repartoMetodos(metodos: EstadisticasVentas['metodos']) {
  return ORDEN_METODOS.map((clave, indice) => ({
    clave,
    indice,
    etiqueta: esMetodoPago(clave) ? etiquetaMetodo(clave) : 'Sin indicar',
    importe: metodos[clave],
  })).filter((m) => m.importe > 0)
}
