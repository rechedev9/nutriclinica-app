import { useState } from 'react'
import { useAlmacen, useProductos, useDeleteProducto } from '../hooks/useStock'
import { ProductoModal } from '../components/ProductoModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import type { Producto } from '@/types'

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold', danger && 'text-danger')}>{value}</div>
    </div>
  )
}

export function AlmacenTab() {
  const { data: almacen, isLoading } = useAlmacen()
  const { data: productos = [] } = useProductos()
  const del = useDeleteProducto()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | undefined>()

  if (isLoading) return <CenteredSpinner />
  const rows = almacen ?? []
  const sinStock = rows.filter((p) => p.stock_actual <= p.stock_minimo).length
  const valCoste = rows.reduce((s, p) => s + Math.max(0, p.stock_actual) * p.precio_coste, 0)
  const valVenta = rows.reduce((s, p) => s + Math.max(0, p.stock_actual) * p.precio_venta, 0)

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar producto?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Productos" value={String(rows.length)} />
        <Kpi label="Alertas mínimo" value={String(sinStock)} danger={sinStock > 0} />
        <Kpi label="Valor a coste" value={`${valCoste.toFixed(2)} €`} />
        <Kpi label="Valor a venta" value={`${valVenta.toFixed(2)} €`} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Productos</h3>
        <Button
          onClick={() => {
            setEditing(undefined)
            setModalOpen(true)
          }}
        >
          + Nuevo producto
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">No hay productos. Crea el primero.</div>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-3 font-semibold">Producto</th>
                <th className="p-3 font-semibold">Categoría</th>
                <th className="p-3 font-semibold">Stock</th>
                <th className="p-3 font-semibold">Coste</th>
                <th className="p-3 font-semibold">Venta</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const bajo = p.stock_actual <= p.stock_minimo
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-semibold">{p.nombre}</td>
                    <td className="p-3 text-ink-muted">{p.categoria ?? '—'}</td>
                    <td className={cn('p-3 font-bold', bajo && 'text-danger')}>
                      {p.stock_actual} {p.unidad}
                    </td>
                    <td className="p-3">{p.precio_coste.toFixed(2)} €</td>
                    <td className="p-3">{p.precio_venta.toFixed(2)} €</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(productos.find((x) => x.id === p.id))
                          setModalOpen(true)
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDelete(p.id)}>
                        Borrar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductoModal open={modalOpen} onClose={() => setModalOpen(false)} producto={editing} />
    </div>
  )
}
