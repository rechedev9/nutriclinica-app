import { useState } from 'react'
import { useMermas, useDeleteMerma } from '../hooks/useStock'
import { MermaModal } from '../components/MermaModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'
import type { MotivoMerma } from '@/types'

const MOTIVO_LABEL: Record<MotivoMerma, string> = {
  caducidad: 'Caducidad',
  accidente_rotura: 'Accidente / Rotura',
  devolucion_cliente: 'Devolución cliente',
}

const MOTIVO_CLS: Record<MotivoMerma, string> = {
  caducidad: 'bg-amber-500/10 text-amber-600',
  accidente_rotura: 'bg-danger/10 text-danger',
  devolucion_cliente: 'bg-primary/10 text-primary',
}

const alertaIcono = (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export function MermasTab() {
  const { data: mermas, isLoading } = useMermas()
  const del = useDeleteMerma()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)

  if (isLoading) return <CenteredSpinner />
  const rows = mermas ?? []

  const totalCaducidad = rows.filter((m) => m.motivo === 'caducidad').length
  const totalAccidente = rows.filter((m) => m.motivo === 'accidente_rotura').length
  const totalDevolucion = rows.filter((m) => m.motivo === 'devolucion_cliente').length

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar merma?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Total registros</div>
          <div className="mt-1 text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-amber-600">Caducidad</div>
          <div className="mt-1 text-2xl font-extrabold">{totalCaducidad}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-danger">Accidente / Rotura</div>
          <div className="mt-1 text-2xl font-extrabold">{totalAccidente}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-primary">Devolución cliente</div>
          <div className="mt-1 text-2xl font-extrabold">{totalDevolucion}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Mermas</h3>
        <Button onClick={() => setOpen(true)}>+ Nueva merma</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={alertaIcono}
          title="Sin mermas registradas"
          subtitle="Registra aquí las pérdidas de producto por caducidad, accidente o devolución."
          action={<Button onClick={() => setOpen(true)}>+ Nueva merma</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-3 font-semibold">Fecha</th>
                <th className="p-3 font-semibold">Producto</th>
                <th className="p-3 font-semibold">Proveedor</th>
                <th className="p-3 font-semibold">Motivo</th>
                <th className="p-3 text-right font-semibold">Cantidad</th>
                <th className="p-3 font-semibold">Notas</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2">
                  <td className="p-3 text-ink-muted">{m.fecha ? fmtFecha(m.fecha) : '—'}</td>
                  <td className="p-3 font-semibold">{m.producto_nombre ?? '—'}</td>
                  <td className="p-3 text-ink-muted">{m.proveedor_nombre ?? '—'}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold ${MOTIVO_CLS[m.motivo]}`}>
                      {MOTIVO_LABEL[m.motivo]}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums font-bold">
                    {m.cantidad} <span className="font-normal text-ink-muted">{m.unidad ?? 'ud'}</span>
                  </td>
                  <td className="p-3 text-ink-muted">{m.notas ?? '—'}</td>
                  <td className="p-3 text-right">
                    <Button variant="danger" size="sm" onClick={() => onDelete(m.id)}>
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MermaModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
