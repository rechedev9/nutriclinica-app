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
