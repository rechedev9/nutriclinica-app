import type { Historial } from '@/types'

type Entrada = Historial[number]

export interface UltimoCambio {
  usuario: string
  fecha: string
  creado: boolean
}

// El historial llega de la más reciente a la más antigua: la primera entrada que cumple es el último cambio.
function ultimo(entradas: readonly Entrada[], cumple: (e: Entrada) => boolean): UltimoCambio | null {
  const e = entradas.find((x) => x.estado < 400 && cumple(x))
  if (e?.fecha == null) return null
  return { usuario: e.usuario ?? '', fecha: e.fecha, creado: e.metodo === 'POST' }
}

// Última alta o edición de la ficha del cliente.
export function ultimoCambioFicha(entradas: readonly Entrada[]): UltimoCambio | null {
  return ultimo(
    entradas,
    (e) => /^\/api\/pacientes(\/\d+)?$/.test(e.ruta) && (e.metodo === 'POST' || e.metodo === 'PUT'),
  )
}

// Última alta o edición de una revisión: la edición lleva su id en la ruta y el alta en el detalle.
export function ultimoCambioRevision(entradas: readonly Entrada[], revisionId: number): UltimoCambio | null {
  return ultimo(
    entradas,
    (e) =>
      (e.metodo === 'PUT' && e.ruta === `/api/revisiones/${revisionId}`) ||
      (e.metodo === 'POST' && e.ruta.endsWith('/revisiones') && e.detalle?.registro_id === revisionId),
  )
}

// «Modificado por ana el 12/03/2026 a las 18:30».
export function textoUltimoCambio(opciones: {
  cambio: UltimoCambio
  formatearFecha: (fecha: string) => string
}): string {
  const { cambio, formatearFecha } = opciones
  const hora = cambio.fecha.slice(11, 16)
  const quien = cambio.usuario === '' ? 'un usuario' : cambio.usuario
  const cuando = hora === '' ? '' : ` a las ${hora}`
  return `${cambio.creado ? 'Creado' : 'Modificado'} por ${quien} el ${formatearFecha(cambio.fecha)}${cuando}`
}
