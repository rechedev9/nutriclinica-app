export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const MESES = [
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

// El día local desplazado n días (sin hora, así no le afectan los cambios de horario).
export function desplazarDias(dia: Date, n: number): Date {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + n)
}

// Fecha local de un texto AAAA-MM-DD[ HH:MM:SS].
export function fechaDeTexto(texto: string): Date {
  return new Date(Number(texto.slice(0, 4)), Number(texto.slice(5, 7)) - 1, Number(texto.slice(8, 10)))
}

function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`
}

export function resumenDia(datos: { clientes: number; recompras: number; productos: number }): string {
  const { clientes, recompras, productos } = datos
  if (clientes === 0 && recompras === 0 && productos === 0) {
    return 'Todo al día: ningún cliente por atender ni producto que reponer.'
  }
  const partes: string[] = []
  if (clientes > 0) partes.push(`${plural(clientes, 'cliente', 'clientes')} por atender`)
  if (recompras > 0) partes.push(`${plural(recompras, 'cliente', 'clientes')} para recompra`)
  if (productos > 0) partes.push(`${plural(productos, 'producto', 'productos')} por reponer`)
  return partes.join(' · ')
}
