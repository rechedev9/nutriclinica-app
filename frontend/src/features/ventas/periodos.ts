// Periodos de la pestaña Estadísticas y su lectura de la URL. Va aparte porque lo importa el
// router, que está en el paquete inicial; el resto de cálculos se carga con la pestaña.

export const PERIODOS = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: '7d', etiqueta: '7 días' },
  { valor: '30d', etiqueta: '30 días' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'mes_anterior', etiqueta: 'Mes anterior' },
  { valor: 'anio', etiqueta: 'Este año' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
] as const

export type Periodo = (typeof PERIODOS)[number]['valor']

export const PERIODO_INICIAL: Periodo = '30d'

export interface BusquedaEstadisticas {
  periodo?: Periodo
  desde?: string
  hasta?: string
}

function esDia(texto: unknown): texto is string {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const d = new Date(`${texto}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto
}

export function leerBusqueda(busqueda: Record<string, unknown>): BusquedaEstadisticas {
  const periodo = PERIODOS.find((p) => p.valor === busqueda.periodo)?.valor
  if (periodo === undefined) return {}
  if (periodo !== 'personalizado') return { periodo }
  const desde = esDia(busqueda.desde) ? busqueda.desde : undefined
  const hasta = esDia(busqueda.hasta) ? busqueda.hasta : undefined
  return { periodo, ...(desde === undefined ? {} : { desde }), ...(hasta === undefined ? {} : { hasta }) }
}
