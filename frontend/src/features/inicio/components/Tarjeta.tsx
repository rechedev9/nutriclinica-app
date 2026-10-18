import type { ReactNode } from 'react'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'

export const enlaceSutil =
  'rounded-lg text-[13px] font-semibold text-primary transition-colors duration-150 ease-out [@media(hover:hover)]:hover:underline'

export const filaEnlace =
  'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-surface-2'

export function Tarjeta(props: { titulo: string; subtitulo?: string; enlace?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{props.titulo}</h3>
          {props.subtitulo && <p className="text-[13px] text-ink-muted">{props.subtitulo}</p>}
        </div>
        {props.enlace && <div className="shrink-0 whitespace-nowrap">{props.enlace}</div>}
      </div>
      {props.children}
    </section>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-muted">{children}</p>
}

interface Consulta {
  isError: boolean
  error: unknown
  isFetching: boolean
  refetch: () => Promise<unknown>
}

// Mientras falte algún dato de la tarjeta: el error de la primera consulta que falló o el spinner.
export function SinDatos({ consultas, recurso }: { consultas: readonly Consulta[]; recurso: string }) {
  const fallo = consultas.find((c) => c.isError)
  if (fallo === undefined) return <CenteredSpinner />
  return (
    <ErrorState
      error={fallo.error}
      onRetry={() => void fallo.refetch()}
      isRetrying={fallo.isFetching}
      recurso={recurso}
      className="p-6"
    />
  )
}
