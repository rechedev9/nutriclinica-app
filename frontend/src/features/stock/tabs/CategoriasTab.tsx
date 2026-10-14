import { useState } from 'react'
import { useCategorias, useDeleteCategoria } from '../hooks/useStock'
import { CategoriaModal } from '../components/CategoriaModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { Categoria } from '@/types'
import { intentar } from '@/lib/api/intentar'
import { normaliza } from '@/lib/format/texto'

export function CategoriasTab() {
  const { data: categorias, isLoading, isError, error, refetch, isFetching } = useCategorias()
  const del = useDeleteCategoria()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Categoria | undefined>()
  const [busqueda, setBusqueda] = useState('')

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="las categorías" />
  const rows = (categorias ?? []).filter((c) => normaliza(c.nombre).includes(normaliza(busqueda)))

  async function onDelete(id: number) {
    const ok = await confirm({
      title: '¿Eliminar categoría?',
      message:
        'Si hay productos usando esta categoría, no se podrá eliminar hasta que se les quite o se les asigne otra.',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (ok) await intentar(del.mutateAsync(id))
  }

  function nueva() {
    setEditing(undefined)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Categorías</h3>
        <Button onClick={nueva}>+ Nueva categoría</Button>
      </div>

      {(categorias ?? []).length > 0 && (
        <Input
          placeholder="Buscar categoría…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-xs"
        />
      )}

      {(categorias ?? []).length === 0 ? (
        <EmptyState
          icon={
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
              <circle cx="7.5" cy="7.5" r="1.5" />
            </svg>
          }
          title="Sin categorías"
          subtitle="Crea categorías para organizar tus productos (ej. Proteínas, Vitaminas…)."
          action={<Button onClick={nueva}>+ Nueva categoría</Button>}
        />
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No hay categorías que coincidan con la búsqueda.</p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-3 font-semibold">Nombre</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2">
                  <td className="p-3 font-semibold">{c.nombre}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(c)
                        setOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="dangerGhost" size="sm" onClick={() => onDelete(c.id)}>
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategoriaModal open={open} onClose={() => setOpen(false)} categoria={editing} />
    </div>
  )
}
