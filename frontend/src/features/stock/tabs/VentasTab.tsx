import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentas, useDeleteVenta } from '../hooks/useStock'
import { VentaModal } from '../components/VentaModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'

export function VentasTab() {
  const { data: ventas, isLoading } = useVentas()
  const del = useDeleteVenta()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  if (isLoading) return <CenteredSpinner />
  const todos = ventas ?? []

  const rows = todos.filter((v) => {
    const fecha = v.fecha ?? ''
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })

  const totalIngresado = rows.reduce((s, v) => s + v.total, 0)
  const hayFiltro = desde !== '' || hasta !== ''

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar venta?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Ventas{hayFiltro ? ' (filtradas)' : ''}</div>
          <div className="mt-1 text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Total ingresado{hayFiltro ? ' (filtrado)' : ''}</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtMoneda(totalIngresado)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Ventas</h3>
        <Button onClick={() => setOpen(true)}>+ Nueva venta</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted">Filtrar por fecha:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-ink-muted">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-ink-muted">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {hayFiltro && (
          <button
            onClick={() => { setDesde(''); setHasta('') }}
            className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface hover:text-ink"
          >
            Limpiar
          </button>
        )}
      </div>

      {todos.length === 0 ? (
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          title="Sin ventas en ese período"
          subtitle="Prueba a ampliar el rango de fechas o limpia el filtro."
          action={
            <button
              onClick={() => { setDesde(''); setHasta('') }}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
            >
              Limpiar filtro
            </button>
          }
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
                <div className="font-bold">{fmtMoneda(v.total)}</div>
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
                    <span className="font-semibold">{fmtMoneda(l.cantidad * l.precio_unitario)}</span>
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
