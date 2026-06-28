import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentas, useDeleteVenta } from '../hooks/useStock'
import { VentaModal } from '../components/VentaModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'

export function VentasTab() {
  const { data: ventas, isLoading } = useVentas()
  const del = useDeleteVenta()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  if (isLoading) return <CenteredSpinner />
  const rows = ventas ?? []
  const totalIngresado = rows.reduce((s, v) => s + v.total, 0)

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar venta?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Ventas</div>
          <div className="mt-1 text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Total ingresado</div>
          <div className="mt-1 text-2xl font-extrabold">{totalIngresado.toFixed(2)} €</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Ventas</h3>
        <Button onClick={() => setOpen(true)}>+ Nueva venta</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title="Sin ventas registradas"
          subtitle="Registra las ventas de productos a tus pacientes o ventas libres."
          action={<Button onClick={() => setOpen(true)}>+ Nueva venta</Button>}
        />
      ) : (
        rows.map((v) => (
          <div key={v.id} className="rounded-card bg-surface shadow-card">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setExpanded(expanded === v.id ? null : v.id)} className="flex flex-1 items-center gap-3 text-left">
                <div className="flex-1">
                  <div className="font-semibold">{v.fecha ? fmtFecha(v.fecha) : 'Sin fecha'}</div>
                  <div className="text-[13px] text-ink-muted">
                    {v.paciente_id && v.paciente_nombre ? (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/pacientes/${v.paciente_id}`)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation()
                            navigate(`/pacientes/${v.paciente_id}`)
                          }
                        }}
                        className="cursor-pointer font-medium text-primary hover:underline"
                      >
                        {v.paciente_nombre}
                      </span>
                    ) : (
                      'Venta libre'
                    )}{' '}
                    · {v.lineas.length} línea(s)
                  </div>
                </div>
                <div className="font-bold">{v.total.toFixed(2)} €</div>
              </button>
              <Button variant="danger" size="sm" onClick={() => onDelete(v.id)}>
                Borrar
              </Button>
            </div>
            {expanded === v.id && (
              <div className="border-t border-border p-4 text-sm">
                {v.lineas.map((l) => (
                  <div key={l.id} className="flex justify-between py-0.5">
                    <span>
                      {l.producto_nombre} × {l.cantidad} {l.unidad}
                    </span>
                    <span className="font-semibold">{(l.cantidad * l.precio_unitario).toFixed(2)} €</span>
                  </div>
                ))}
                {v.notas && <p className="mt-2 text-ink-muted">{v.notas}</p>}
              </div>
            )}
          </div>
        ))
      )}

      <VentaModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
