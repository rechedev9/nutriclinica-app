import { useState } from 'react'
import { useCompras, useDeleteCompra } from '../hooks/useStock'
import { CompraModal } from '../components/CompraModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import type { Compra } from '@/types'
import { intentar } from '@/lib/api/intentar'

export function ComprasTab() {
  const { data: compras, isLoading, isError, error, refetch, isFetching } = useCompras()
  const del = useDeleteCompra()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Compra | undefined>()
  const [expanded, setExpanded] = useState<number | null>(null)

  function abrirNueva() {
    setEditing(undefined)
    setOpen(true)
  }

  function abrirEditar(c: Compra) {
    setEditing(c)
    setOpen(true)
  }

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="las compras" />
  const todos = compras ?? []

  const rows = todos.filter((c) => {
    const fecha = (c.fecha ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })

  const totalGastado = rows.reduce((s, c) => s + c.total, 0)
  const hayFiltro = desde !== '' || hasta !== ''
  const rangoInvalido = desde !== '' && hasta !== '' && desde > hasta

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar compra?', confirmText: 'Eliminar', danger: true })
    if (ok) await intentar(del.mutateAsync(id))
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Compras{hayFiltro ? ' (filtradas)' : ''}</div>
          <div className="mt-1 text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Total gastado{hayFiltro ? ' (filtrado)' : ''}</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtMoneda(totalGastado)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Compras</h3>
        <Button onClick={abrirNueva}>+ Nueva compra</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted">Filtrar por fecha:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-ink-muted">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-ink-muted">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {hayFiltro && (
          <button
            onClick={() => {
              setDesde('')
              setHasta('')
            }}
            className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface hover:text-ink"
          >
            Limpiar
          </button>
        )}
        {rangoInvalido && (
          <span role="alert" className="text-sm text-danger">
            La fecha «Desde» es posterior a «Hasta».
          </span>
        )}
      </div>

      {todos.length === 0 ? (
        <EmptyState
          icon={
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          }
          title="Sin compras registradas"
          subtitle="Registra tus compras a proveedores para que el stock se actualice solo."
          action={<Button onClick={abrirNueva}>+ Nueva compra</Button>}
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
          title="Sin compras en ese período"
          subtitle="Prueba a ampliar el rango de fechas o limpia el filtro."
          action={
            <button
              onClick={() => {
                setDesde('')
                setHasta('')
              }}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
            >
              Limpiar filtro
            </button>
          }
        />
      ) : (
        rows.map((c) => (
          <div key={c.id} className="rounded-card bg-surface shadow-card">
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex-1">
                  <div className="font-semibold">
                    {c.fecha
                      ? c.fecha.includes('T')
                        ? new Date(c.fecha).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : fmtFecha(c.fecha)
                      : 'Sin fecha'}
                  </div>
                  <div className="text-[13px] text-ink-muted">
                    {c.proveedor_nombre ?? 'Sin proveedor'} · {c.lineas.length} línea(s)
                    {c.fecha?.includes('T') && <> · {c.fecha.slice(11, 16)}</>}
                  </div>
                </div>
                <div className="font-bold">{fmtMoneda(c.total)}</div>
              </button>
              <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)}>
                Editar
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(c.id)}>
                Borrar
              </Button>
            </div>
            {expanded === c.id && (
              <div className="border-t border-border p-4 text-sm">
                {c.lineas.map((l) => (
                  <div key={l.id} className="flex justify-between py-0.5">
                    <span>
                      {l.producto_nombre} × {l.cantidad} {l.unidad}
                    </span>
                    <span className="font-semibold">{fmtMoneda(l.cantidad * l.precio_unitario)}</span>
                  </div>
                ))}
                {c.notas && <p className="mt-2 text-ink-muted">{c.notas}</p>}
              </div>
            )}
          </div>
        ))
      )}

      <CompraModal open={open} onClose={() => setOpen(false)} compra={editing} />
    </div>
  )
}
