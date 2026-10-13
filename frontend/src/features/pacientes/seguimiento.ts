import { diasDesde, haceCuanto } from '@/lib/format/fecha'

// Sin revisión en este plazo, el cliente aparece como pendiente de seguimiento.
export const DIAS_REVISION_PENDIENTE = 45

interface ConRevision {
  ultima_revision: string | null | undefined
}

export function seguimiento(
  p: ConRevision,
  hoy: Date = new Date(),
): { texto: string; pendiente: boolean; dias: number | null } {
  const dias = diasDesde(p.ultima_revision, hoy)
  if (dias == null) return { texto: 'Sin revisiones', pendiente: true, dias }
  return { texto: `Última ${haceCuanto(dias)}`, pendiente: dias > DIAS_REVISION_PENDIENTE, dias }
}

// Clientes con la revisión pendiente: primero los que no tienen ninguna y después
// los que llevan más tiempo sin revisión.
export function pendientesOrdenados<T extends ConRevision & { nombre: string }>(
  clientes: readonly T[],
  hoy: Date = new Date(),
): T[] {
  return clientes
    .map((c) => ({ c, seg: seguimiento(c, hoy) }))
    .filter((x) => x.seg.pendiente)
    .toSorted((a, b) => {
      const da = a.seg.dias ?? Number.POSITIVE_INFINITY
      const db = b.seg.dias ?? Number.POSITIVE_INFINITY
      if (da !== db) return da > db ? -1 : 1
      return a.c.nombre.localeCompare(b.c.nombre, 'es')
    })
    .map((x) => x.c)
}
