import { useState } from 'react'
import { useUsuarios, useDeleteUsuario } from './useUsuarios'
import { useMe } from '@/features/auth/useAuth'
import { UsuarioModal } from './UsuarioModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtFecha } from '@/lib/format/fecha'
import type { Usuario } from '@/types'
import { intentar } from '@/lib/api/intentar'

export function UsuariosPage() {
  const { data: usuarios, isLoading, isError, error, refetch, isFetching } = useUsuarios()
  const del = useDeleteUsuario()
  const { data: me } = useMe()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | undefined>()

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los usuarios" />
  const rows = usuarios ?? []

  async function onDelete(u: Usuario) {
    const ok = await confirm({
      title: `¿Eliminar a ${u.usuario}?`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (ok) await intentar(del.mutateAsync(u.id))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Usuarios</h2>
        <Button
          onClick={() => {
            setEditing(undefined)
            setOpen(true)
          }}
        >
          + Nuevo usuario
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-muted">
              <th className="p-3 font-semibold">Usuario</th>
              <th className="p-3 font-semibold">Rol</th>
              <th className="p-3 font-semibold">Creado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3 font-semibold">{u.usuario}</td>
                <td className="p-3">
                  {u.rol === 'admin' ? (
                    <Badge className="bg-primary text-white">Administrador</Badge>
                  ) : (
                    <Badge>Usuario</Badge>
                  )}
                </td>
                <td className="p-3 text-ink-muted">{u.creado ? fmtFecha(u.creado) : '-'}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(u)
                      setOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  {u.id !== me?.id && (
                    <Button variant="danger" size="sm" onClick={() => onDelete(u)}>
                      Borrar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UsuarioModal open={open} onClose={() => setOpen(false)} usuario={editing} />
    </div>
  )
}
