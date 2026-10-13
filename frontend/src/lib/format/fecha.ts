// Port de los formateadores de fecha de la SPA original.

export function fmtFecha(d: string | null | undefined): string {
  if (!d) return ''
  // Acepta tanto fechas (YYYY-MM-DD) como datetimes (YYYY-MM-DD HH:MM:SS / con 'T').
  const s = (d.split('T')[0] ?? '').split(' ')[0] ?? ''
  const [y, m, dd] = s.split('-')
  if (!y || !m || !dd) return '-'
  return `${dd}/${m}/${y}`
}

export function fmtFechaCorta(iso: string): string {
  if (Number.isNaN(new Date(iso).getTime())) return '-'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fmtDatetime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return (
    d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  )
}

// Días naturales entre una fecha (YYYY-MM-DD) y hoy; null si la fecha no es válida.
export function diasDesde(fecha: string | null | undefined, hoy: Date = new Date()): number | null {
  const [, anio, mes, dia] = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? '') ?? []
  if (anio === undefined) return null
  const inicio = Date.UTC(Number(anio), Number(mes) - 1, Number(dia))
  const fin = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((fin - inicio) / 86_400_000)
}

export function haceCuanto(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 14) return `hace ${dias} días`
  if (dias < 60) return `hace ${Math.round(dias / 7)} semanas`
  const meses = Math.round(dias / 30)
  if (meses < 24) return `hace ${meses} meses`
  return `hace ${Math.round(dias / 365)} años`
}

// Port exacto de calcEdad (index.html:1397).
export function calcEdad(fechaNac: string | null | undefined): number | null {
  if (!fechaNac) return null
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let e = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--
  return e
}
