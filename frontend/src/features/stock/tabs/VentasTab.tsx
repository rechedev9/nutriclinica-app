import { useState } from 'react'
import { useVentas, useDeleteVenta } from '../hooks/useStock'
import { VentaModal } from '../components/VentaModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'

export function VentasTab() {
  const { data: ventas, isLoading } = useVentas()
  const del = useDeleteVenta()
  const confirm = useConfirm()
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
        <div className="rounded-card bg-white p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Ventas</div>
          <div className="mt-1 text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="rounded-card bg-white p-4 shadow-card">
          <div className="text-[13px] text-ink-muted">Total ingresado</div>
          <div className="mt-1 text-2xl font-extrabold">{totalIngresado.toFixed(2)} €</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Ventas</h3>
        <Button onClick={() => setOpen(true)}>+ Nueva venta</Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">Sin ventas registradas.</div>
      ) : (
        rows.map((v) => (
          <div key={v.id} className="rounded-card bg-white shadow-card">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setExpanded(expanded === v.id ? null : v.id)} className="flex flex-1 items-center gap-3 text-left">
                <div className="flex-1">
                  <div className="font-semibold">{v.fecha ? fmtFecha(v.fecha) : 'Sin fecha'}</div>
                  <div className="text-[13px] text-ink-muted">
                    {v.paciente_nombre ?? 'Venta libre'} · {v.lineas.length} línea(s)
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
