import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { usePacienteContext } from './context'
import { useHistorial } from '../hooks/useHistorial'
import {
  COLOR_ACCION,
  ETIQUETA_ACCION,
  agruparPorDia,
  nombreRecurso,
  resumenLegible,
  tipoAccion,
  tituloDia,
} from '@/features/auditoria/descripcion'
import { DetalleCambios } from '@/features/auditoria/DetalleCambios'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'

// Las ventas no salen en el historial: tienen su pestaña y siguen en la Auditoría general.
function EnlaceCompras({ id, children }: { id: number; children: ReactNode }) {
  return (
    <Link
      to="/pacientes/$id/compras"
      params={{ id: String(id) }}
      className="font-semibold text-primary hover:underline"
    >
      {children}
    </Link>
  )
}

export function HistorialTab() {
  const p = usePacienteContext()
  const { data, isLoading, isError, error, refetch, isFetching } = useHistorial(p.id)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="el historial" />

  const entradas = data ?? []
  if (entradas.length === 0) {
    return (
      <EmptyState
        title="Sin cambios registrados"
        subtitle="Aquí aparecerá quién modifica la ficha, el consentimiento, las revisiones y las fotos de este cliente, y cuándo. Sus compras están en la pestaña Compras."
        action={<EnlaceCompras id={p.id}>Ver sus compras</EnlaceCompras>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h3 className="text-lg font-bold">Historial</h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          Quién cambió la ficha, las revisiones y las fotos de este cliente, y cuándo. Sus compras están en{' '}
          <EnlaceCompras id={p.id}>Compras</EnlaceCompras>.
        </p>
      </div>
      {[...agruparPorDia(entradas)].map(([dia, filas]) => (
        <section key={dia} className="overflow-hidden rounded-card bg-surface shadow-card">
          <h4 className="border-b border-border bg-surface-2 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
            {dia ? tituloDia(dia) : 'Sin fecha'}
          </h4>
          <ul>
            {filas.map((e) => {
              const tipo = tipoAccion(e.metodo, e.ruta)
              return (
                <li key={e.id} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular-nums text-sm text-ink-muted">{e.fecha?.slice(11, 16) || '-'}</span>
                    <span className="text-sm font-semibold">{e.usuario || '-'}</span>
                    <span
                      className={cn(
                        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold',
                        tipo ? COLOR_ACCION[tipo] : 'bg-surface-2 text-ink-muted',
                      )}
                    >
                      {tipo ? ETIQUETA_ACCION[tipo] : e.metodo}
                    </span>
                    <span className="min-w-0 text-sm">{nombreRecurso(e.ruta)}</span>
                  </div>
                  {e.detalle?.resumen && (
                    <p className="mt-1 break-words text-[13px] text-ink-muted">{resumenLegible(e.detalle.resumen)}</p>
                  )}
                  {e.detalle && <DetalleCambios cambios={e.detalle.cambios} />}
                  {tipo === 'edicion' && e.detalle?.cambios.length === 0 && (
                    <p className="mt-1 text-[13px] text-ink-muted">Guardado sin cambios en los datos.</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
