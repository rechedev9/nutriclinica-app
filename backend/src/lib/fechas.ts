function dos(n: number): string {
  return String(n).padStart(2, '0')
}

// "AAAA-MM-DD" en hora local.
export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

// "AAAA-MM-DD HH:MM:SS" en hora local, el mismo formato que datetime('now','localtime').
export function fechaHoraLocal(d: Date): string {
  return `${fechaLocal(d)} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`
}

// "AAAAMMDD_HHMMSS" para nombres de archivo.
export function selloArchivo(d: Date): string {
  return fechaHoraLocal(d).replaceAll('-', '').replaceAll(':', '').replace(' ', '_')
}

// parseFecha devuelve el día AAAA-MM-DD con que empieza el texto (admite sufijo de hora) o null.
export function parseFecha(texto: string): string | null {
  const dia = texto.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
  const d = new Date(`${dia}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dia) return null
  return dia
}

// sumarDias devuelve la fecha AAAA-MM-DD desplazada n días.
export function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
