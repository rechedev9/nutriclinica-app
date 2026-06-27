import { useState } from 'react'
import { useProveedores, useDeleteProveedor } from '../hooks/useStock'
import { ProveedorModal } from '../components/ProveedorModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { Proveedor } from '@/types'

export function ProveedoresTab() {
  const { data: proveedores, isLoading } = useProveedores()
  const del = useDeleteProveedor()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Proveedor | undefined>()

  if (isLoading) return <CenteredSpinner />
  const rows = proveedores ?? []

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar proveedor?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Proveedores</h3>
        <Button
          onClick={() => {
            setEditing(undefined)
            setOpen(true)
          }}
        >
          + Nuevo proveedor
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">Sin proveedores.</div>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-3 font-semibold">Nombre</th>
                <th className="p-3 font-semibold">Teléfono</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-semibold">{p.nombre}</td>
                  <td className="p-3 text-ink-muted">{p.telefono ?? '—'}</td>
                  <td className="p-3 text-ink-muted">{p.email ?? '—'}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(p)
                        setOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(p.id)}>
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProveedorModal open={open} onClose={() => setOpen(false)} proveedor={editing} />
    </div>
  )
}
