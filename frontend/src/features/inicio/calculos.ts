const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

// «Martes, 13 de octubre».
export function fechaLarga(hoy: Date): string {
  const dia = DIAS_SEMANA[hoy.getDay()] ?? ''
  const mes = MESES[hoy.getMonth()] ?? ''
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${hoy.getDate()} de ${mes}`
}

export function resumenDia(datos: { pendientes: number; productos: number }): string {
  const { pendientes, productos } = datos
  if (pendientes === 0 && productos === 0) return 'Todo al día: ninguna revisión pendiente ni producto que reponer.'
  const partes: string[] = []
  if (pendientes > 0)
    partes.push(`${pendientes} ${pendientes === 1 ? 'cliente' : 'clientes'} con la revisión pendiente`)
  if (productos > 0) partes.push(`${productos} ${productos === 1 ? 'producto' : 'productos'} por reponer`)
  return partes.join(' · ')
}

// Total y número de ventas del mes de `hoy` (las fechas llegan como YYYY-MM-DD).
export function ventasDelMes(
  ventas: readonly { fecha: string | null; total: number }[],
  hoy: Date,
): { total: number; cantidad: number } {
  const prefijo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-`
  let total = 0
  let cantidad = 0
  for (const v of ventas) {
    if (!v.fecha?.startsWith(prefijo)) continue
    total += v.total
    cantidad++
  }
  return { total, cantidad }
}
