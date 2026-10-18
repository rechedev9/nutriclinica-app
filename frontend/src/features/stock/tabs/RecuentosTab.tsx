import { useState } from 'react'
import { useRecuentos } from '../hooks/useStock'
import { RecuentoModal } from '../components/RecuentoModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtCantidad, fmtCantidadConSigno } from '../movimientos'
import type { Recuento } from '@/types'

const listaIcono = (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="m9 14 2 2 4-4" />
  </svg>
)

function TarjetaRecuento({ recuento }: { recuento: Recuento }) {
  const conDiferencia = recuento.lineas.filter((l) => l.diferencia !== 0).length
  return (
    <li className="rounded-card bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="break-words font-semibold">{recuento.motivo}</div>
          <div className="text-[13px] text-ink-muted">
            {fmtFecha(recuento.creado)} {recuento.creado.slice(11, 16)}
            {recuento.usuario && ` · ${recuento.usuario}`}
          </div>
          {recuento.notas && <div className="mt-1 break-words text-sm text-ink-muted">{recuento.notas}</div>}
        </div>
        <span
          className={cn(
            'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold',
            conDiferencia > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-surface-2 text-ink-muted',
          )}
        >
          {conDiferencia > 0 ? `${conDiferencia} con diferencia` : 'Todo cuadra'}
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-muted">
              <th className="py-1.5 pr-3 font-semibold">Producto</th>
              <th className="px-3 py-1.5 text-right font-semibold">En el sistema</th>
              <th className="px-3 py-1.5 text-right font-semibold">Contadas</th>
              <th className="py-1.5 pl-3 text-right font-semibold">Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {recuento.lineas.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-3">{l.producto_nombre}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">{fmtCantidad(l.esperado)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtCantidad(l.contado)} <span className="text-ink-muted">{l.unidad ?? 'ud'}</span>
                </td>
                <td
                  className={cn(
                    'py-1.5 pl-3 text-right font-semibold tabular-nums',
                    l.diferencia < 0 && 'text-danger',
                    l.diferencia > 0 && 'text-success',
                    l.diferencia === 0 && 'text-ink-muted',
                  )}
                >
                  {l.diferencia === 0 ? 'Cuadra' : fmtCantidadConSigno(l.diferencia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </li>
  )
}

export function RecuentosTab() {
  const { data: recuentos = [], isLoading, isError, error, refetch, isFetching } = useRecuentos()
  const [open, setOpen] = useState(false)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los recuentos" />

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Recuentos de inventario</h3>
          <p className="text-sm text-ink-muted">
            Cada recuento ajusta el stock a lo contado y deja quién lo hizo y por qué.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Nuevo recuento</Button>
      </div>

      {recuentos.length === 0 ? (
        <EmptyState
          icon={listaIcono}
          title="Aún no has hecho ningún recuento"
          subtitle="Cuenta las unidades del almacén de vez en cuando para que el stock coincida con la realidad."
          action={<Button onClick={() => setOpen(true)}>+ Nuevo recuento</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recuentos.map((r) => (
            <TarjetaRecuento key={r.id} recuento={r} />
          ))}
        </ul>
      )}

      <RecuentoModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
