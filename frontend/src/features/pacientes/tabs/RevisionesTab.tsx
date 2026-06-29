import { useState } from 'react'
import { usePacienteContext } from './context'
import { useRevisiones, useDeleteRevision } from '../hooks/useRevisiones'
import { RevisionModal } from './RevisionModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'
import { descargarExcelRevision } from '@/lib/api/downloads'
import { ALL_MEDIDAS } from '@/types'
import type { Revision } from '@/types'

function RevisionCard({
  rev,
  onEdit,
  onDelete,
}: {
  rev: Revision
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const medidas = ALL_MEDIDAS.filter((m) => rev[m.key] != null)

  return (
    <div className="rounded-card bg-surface shadow-card">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-3 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold">{rev.fecha ? fmtFecha(rev.fecha) : 'Sin fecha'}</div>
            <div className="text-[13px] text-ink-muted">
              {rev.peso != null && `${rev.peso} kg`}
              {medidas.length > 0 && ` · ${medidas.length} medidas`}
            </div>
          </div>
          <svg
            className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => descargarExcelRevision(rev.id)} title="Exportar Excel">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
          <Button variant="danger" size="sm" onClick={onDelete}>Borrar</Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border p-4">
          {medidas.length === 0 && rev.envergadura == null ? (
            <p className="text-sm text-ink-muted">Sin medidas registradas.</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 md:grid-cols-4 lg:grid-cols-6">
              {rev.envergadura != null && (
                <div className="text-sm">
                  <div className="text-ink-muted">Envergadura</div>
                  <div className="font-semibold">{rev.envergadura} cm</div>
                </div>
              )}
              {medidas.map((m) => (
                <div key={m.key} className="text-sm">
                  <div className="flex items-center gap-1 text-ink-muted">
                    {m.grupo === 'pliegue' && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Medido con plicómetro">
                        <path d="M3 8h13" />
                        <path d="M3 16h13" />
                        <path d="M16 8c3 0 3 8 0 8" />
                        <line x1="3" y1="5" x2="3" y2="8" />
                        <line x1="3" y1="16" x2="3" y2="19" />
                      </svg>
                    )}
                    {m.short}
                  </div>
                  <div className="font-semibold">
                    {rev[m.key]} {m.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
          {rev.notas && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-muted">{rev.notas}</p>}
        </div>
      )}
    </div>
  )
}

export function RevisionesTab() {
  const p = usePacienteContext()
  const { data: revs, isLoading } = useRevisiones(p.id)
  const del = useDeleteRevision(p.id)
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Revision | undefined>()

  if (isLoading) return <CenteredSpinner />

  async function onDelete(rev: Revision) {
    const ok = await confirm({ title: '¿Eliminar revisión?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(rev.id)
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Revisiones</h3>
        <Button
          onClick={() => {
            setEditing(undefined)
            setModalOpen(true)
          }}
        >
          + Nueva revisión
        </Button>
      </div>

      {!revs || revs.length === 0 ? (
        <EmptyState title="Sin revisiones" subtitle="Crea la primera revisión antropométrica." />
      ) : (
        revs.map((rev) => (
          <RevisionCard
            key={rev.id}
            rev={rev}
            onEdit={() => {
              setEditing(rev)
              setModalOpen(true)
            }}
            onDelete={() => onDelete(rev)}
          />
        ))
      )}

      <RevisionModal open={modalOpen} onClose={() => setModalOpen(false)} pid={p.id} revision={editing} />
    </div>
  )
}
