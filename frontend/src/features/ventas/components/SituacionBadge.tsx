import { Badge } from '@/components/ui/Badge'
import type { SituacionVenta } from '@/types'

export const SITUACIONES: { valor: SituacionVenta; etiqueta: string; clase: string }[] = [
  { valor: 'completada', etiqueta: 'Completada', clase: 'bg-success/10 text-success' },
  { valor: 'devuelta_parcial', etiqueta: 'Devolución parcial', clase: 'bg-primary-light text-primary' },
  { valor: 'devuelta', etiqueta: 'Devuelta', clase: 'bg-surface-2 text-ink-muted' },
  { valor: 'anulada', etiqueta: 'Anulada', clase: 'bg-danger/10 text-danger' },
]

export function SituacionBadge({ situacion }: { situacion: SituacionVenta }) {
  const s = SITUACIONES.find((x) => x.valor === situacion)
  return <Badge className={s?.clase}>{s?.etiqueta ?? situacion}</Badge>
}
