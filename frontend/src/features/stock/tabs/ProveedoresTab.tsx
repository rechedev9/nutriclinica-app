import { useState } from 'react'
import { useProveedores, useDeleteProveedor } from '../hooks/useStock'
import { ProveedorModal } from '../components/ProveedorModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { Proveedor } from '@/types'

export function ProveedoresTab() {
  const { data: proveedores, isLoading } = useProveedores()
  const del = useDeleteProveedor()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Proveedor | undefined>()
  const [busqueda, setBusqueda] = useState('')

  if (isLoading) return <CenteredSpinner />
  const rows = (proveedores ?? []).filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  )

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar proveedor?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  function nuevo() {
    setEditing(undefined)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Proveedores</h3>
        <Button onClick={nuevo}>+ Nuevo proveedor</Button>
      </div>

      {(proveedores ?? []).length > 0 && (
        <Input
          placeholder="Buscar proveedor…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-xs"
        />
      )}

      {(proveedores ?? []).length === 0 ? (
        <EmptyState
          icon={
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
              <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
            </svg>
          }
          title="Sin proveedores"
          subtitle="Añade tus proveedores para asociarlos a las compras y tener su contacto a mano."
          action={<Button onClick={nuevo}>+ Nuevo proveedor</Button>}
        />
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No hay proveedores que coincidan con la búsqueda.</p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-3 font-semibold">Nombre</th>
                <th className="p-3 font-semibold">Teléfono</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3 font-semibold">Notas</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2">
                  <td className="p-3 font-semibold">{p.nombre}</td>
                  <td className="p-3">
                    {p.telefono ? (
                      <a href={`tel:${p.telefono}`} className="text-primary hover:underline">
                        {p.telefono}
                      </a>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {p.email ? (
                      <a href={`mailto:${p.email}`} className="text-primary hover:underline">
                        {p.email}
                      </a>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="p-3 max-w-[220px] text-ink-muted truncate" title={p.notas ?? ''}>
                    {p.notas ?? <span className="text-ink-muted">—</span>}
                  </td>
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
