import { useState } from 'react'
import { useCompras, useDeleteCompra } from '../hooks/useStock'
import { CompraModal } from '../components/CompraModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'

export function ComprasTab() {
  const { data: compras, isLoading } = useCompras()
  const del = useDeleteCompra()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  if (isLoading) return <CenteredSpinner />
  const rows = compras ?? []
  const totalGastado = rows.reduce((s, c) => s + c.total, 0)

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar compra?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Compras</div>
          <div className="mt-1 text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Total gastado</div>
          <div className="mt-1 text-2xl font-extrabold">{totalGastado.toFixed(2)} €</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Compras</h3>
        <Button onClick={() => setOpen(true)}>+ Nueva compra</Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">Sin compras registradas.</div>
      ) : (
        rows.map((c) => (
          <div key={c.id} className="rounded-card bg-surface shadow-card">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="flex flex-1 items-center gap-3 text-left">
                <div className="flex-1">
                  <div className="font-semibold">{c.fecha ? fmtFecha(c.fecha) : 'Sin fecha'}</div>
                  <div className="text-[13px] text-ink-muted">
                    {c.proveedor_nombre ?? 'Sin proveedor'} · {c.lineas.length} línea(s)
                  </div>
                </div>
                <div className="font-bold">{c.total.toFixed(2)} €</div>
              </button>
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
                    <span className="font-semibold">{(l.cantidad * l.precio_unitario).toFixed(2)} €</span>
                  </div>
                ))}
                {c.notas && <p className="mt-2 text-ink-muted">{c.notas}</p>}
              </div>
            )}
          </div>
        ))
      )}

      <CompraModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
