import { hoyLocal } from '@/lib/format/fecha'
import { DIAS_SEMANA, MESES, desplazarDias } from './calculos'

// Ventas completadas y devoluciones de un día, en euros (GET /api/inicio/resumen).
interface DiaVentas {
  fecha: string
  num_ventas: number
  ventas: number
  devoluciones: number
}

interface Rango {
  desde: string
  hasta: string
}

interface Periodos {
  actual: Rango
  anterior: Rango
}

interface Comparacion {
  actual: number
  anterior: number
  // Porcentaje entero de cambio; null si el periodo anterior no tuvo ventas.
  variacion: number | null
  num_ventas: number
}

interface ComparacionTicket {
  actual: number | null
  anterior: number | null
  variacion: number | null
}

const aCentimos = (importe: number) => Math.round(importe * 100)
const aEuros = (centimos: number) => centimos / 100

export function variacion(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

// Cada periodo en curso frente al mismo tramo del anterior, para comparar lo comparable:
// hoy con el mismo día de la semana pasada, la semana hasta hoy y el mes hasta el mismo día.
export function rangosPulso(hoy: Date): { hoy: Periodos; semana: Periodos; mes: Periodos } {
  const dia = hoyLocal(hoy)
  const haceUnaSemana = hoyLocal(desplazarDias(hoy, -7))
  const lunes = desplazarDias(hoy, -((hoy.getDay() + 6) % 7))
  const diasMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate()
  const mismoDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(hoy.getDate(), diasMesPasado))
  return {
    hoy: { actual: { desde: dia, hasta: dia }, anterior: { desde: haceUnaSemana, hasta: haceUnaSemana } },
    semana: {
      actual: { desde: hoyLocal(lunes), hasta: dia },
      anterior: { desde: hoyLocal(desplazarDias(lunes, -7)), hasta: haceUnaSemana },
    },
    mes: {
      actual: { desde: hoyLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: dia },
      anterior: {
        desde: hoyLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
        hasta: hoyLocal(mismoDiaMesPasado),
      },
    },
  }
}

// Neto = ventas menos devoluciones, como en la caja; el ticket medio usa las ventas brutas.
function totales(dias: readonly DiaVentas[], rango: Rango) {
  let neto = 0
  let ventas = 0
  let num = 0
  for (const d of dias) {
    if (d.fecha < rango.desde || d.fecha > rango.hasta) continue
    neto += aCentimos(d.ventas) - aCentimos(d.devoluciones)
    ventas += aCentimos(d.ventas)
    num += d.num_ventas
  }
  return { neto, ventas, num }
}

function comparar(dias: readonly DiaVentas[], periodos: Periodos): Comparacion {
  const actual = totales(dias, periodos.actual)
  const anterior = totales(dias, periodos.anterior)
  return {
    actual: aEuros(actual.neto),
    anterior: aEuros(anterior.neto),
    variacion: variacion(actual.neto, anterior.neto),
    num_ventas: actual.num,
  }
}

function ticketMedio(t: { ventas: number; num: number }): number | null {
  return t.num > 0 ? Math.round(t.ventas / t.num) : null
}

export function pulsoTienda(dias: readonly DiaVentas[], hoy: Date) {
  const rangos = rangosPulso(hoy)
  const ticketActual = ticketMedio(totales(dias, rangos.mes.actual))
  const ticketAnterior = ticketMedio(totales(dias, rangos.mes.anterior))
  const ticket: ComparacionTicket = {
    actual: ticketActual === null ? null : aEuros(ticketActual),
    anterior: ticketAnterior === null ? null : aEuros(ticketAnterior),
    variacion: ticketActual === null || ticketAnterior === null ? null : variacion(ticketActual, ticketAnterior),
  }
  return {
    hoy: comparar(dias, rangos.hoy),
    semana: comparar(dias, rangos.semana),
    mes: comparar(dias, rangos.mes),
    ticket,
  }
}

// Con qué periodo se compara cada cifra («frente a 71,90 € la semana pasada»).
export function referenciasPulso(hoy: Date): { hoy: string; semana: string; mes: string } {
  const mesPasado = MESES[(hoy.getMonth() + 11) % 12] ?? ''
  const hasta = Math.min(hoy.getDate(), new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate())
  return {
    hoy: `el ${DIAS_SEMANA[hoy.getDay()] ?? ''} pasado`,
    semana: 'la semana pasada',
    mes: hasta === 1 ? `el 1 de ${mesPasado}` : `del 1 al ${hasta} de ${mesPasado}`,
  }
}
