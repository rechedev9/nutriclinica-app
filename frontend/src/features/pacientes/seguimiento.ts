import { diasDesde, haceCuanto } from '@/lib/format/fecha'

// Sin revisión en este plazo, el cliente aparece como pendiente de seguimiento.
export const DIAS_REVISION_PENDIENTE = 45

interface ConRevision {
  ultima_revision: string | null | undefined
}

export type Seguimiento =
  | { estado: 'sin'; texto: 'Sin revisiones'; dias: null }
  | { estado: 'vencida'; texto: string; dias: number }
  | { estado: 'al_dia'; texto: string; dias: number }

export function seguimiento(p: ConRevision, hoy: Date = new Date()): Seguimiento {
  const dias = diasDesde(p.ultima_revision, hoy)
  if (dias == null) return { estado: 'sin', texto: 'Sin revisiones', dias: null }
  const texto = `Última ${haceCuanto(dias)}`
  if (dias > DIAS_REVISION_PENDIENTE) return { estado: 'vencida', texto, dias }
  return { estado: 'al_dia', texto, dias }
}

// Clientes con la revisión pendiente: primero los que no tienen ninguna y después
// los que llevan más tiempo sin revisión.
export function pendientesOrdenados<T extends ConRevision & { nombre: string }>(
  clientes: readonly T[],
  hoy: Date = new Date(),
): T[] {
  return clientes
    .map((c) => ({ c, seg: seguimiento(c, hoy) }))
    .filter((x) => x.seg.estado !== 'al_dia')
    .toSorted((a, b) => {
      const da = a.seg.dias ?? Number.POSITIVE_INFINITY
      const db = b.seg.dias ?? Number.POSITIVE_INFINITY
      if (da !== db) return da > db ? -1 : 1
      return a.c.nombre.localeCompare(b.c.nombre, 'es')
    })
    .map((x) => x.c)
}
