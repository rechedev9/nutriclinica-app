import { useDeferredValue, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { usePacientes } from './hooks/usePacientes'
import { PacienteModal } from './components/PacienteModal'
import { seguimiento } from './seguimiento'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ImcBadge } from '@/components/ui/ImcBadge'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { calcIMC } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { calcEdad, fmtFecha } from '@/lib/format/fecha'
import { normaliza } from '@/lib/format/texto'
import type { Paciente } from '@/types'

function meta(p: Paciente): string {
  if (p.peso && p.talla) return `${p.peso} kg · ${p.talla} cm`
  const edad = calcEdad(p.fecha_nac)
  if (edad != null) return `${edad} años`
  if (p.fecha_nac) return `Nac. ${fmtFecha(p.fecha_nac)}`
  return 'Sin datos antropométricos'
}

export function PacientesOverview() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <>
      <Listado onNew={() => setModalOpen(true)} />
      <PacienteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

function Listado({ onNew }: { onNew: () => void }) {
  const { data: pacientes = [], isLoading, isError, error, refetch, isFetching } = usePacientes()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const soloPendientes = useSearch({ strict: false, select: (b) => b.pendientes === 1 })
  const setSoloPendientes = (activo: boolean) =>
    void navigate({ to: '/pacientes', search: activo ? { pendientes: 1 } : {}, replace: true })
  const deferredQ = useDeferredValue(q)

  const pendientes = useMemo(() => pacientes.filter((p) => seguimiento(p).estado !== 'al_dia').length, [pacientes])
  const filtrados = useMemo(() => {
    const term = normaliza(deferredQ)
    return pacientes.filter(
      (p) => (!term || normaliza(p.nombre).includes(term)) && (!soloPendientes || seguimiento(p).estado !== 'al_dia'),
    )
  }, [pacientes, deferredQ, soloPendientes])

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return (
      <div className="flex flex-1 flex-col p-6">
        <Cabecera onNew={onNew} q={q} setQ={setQ} sinBusqueda />
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los clientes" />
      </div>
    )

  if (pacientes.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <Cabecera onNew={onNew} q={q} setQ={setQ} sinBusqueda />
        <EmptyState
          icon={
            <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          title="Aún no hay clientes"
          subtitle="Crea el primero con el botón «Nuevo cliente»"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <Cabecera onNew={onNew} q={q} setQ={setQ} resumen={resumen(pacientes.length, pendientes)} />

      <div className="mt-4 flex gap-1.5" role="group" aria-label="Filtrar clientes">
        <Filtro activo={!soloPendientes} onClick={() => setSoloPendientes(false)}>
          Todos <span className="tabular-nums opacity-70">{pacientes.length}</span>
        </Filtro>
        <Filtro activo={soloPendientes} onClick={() => setSoloPendientes(true)}>
          Revisión pendiente <span className="tabular-nums opacity-70">{pendientes}</span>
        </Filtro>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-muted">
          {q ? `Ningún cliente coincide con «${q}».` : 'Todos los clientes tienen la revisión al día.'}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtrados.map((p) => {
            const imc = calcIMC(p.peso, p.talla)
            const seg = seguimiento(p)
            return (
              <article
                key={p.id}
                className="flex h-full flex-col gap-2.5 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-[border-color,box-shadow] duration-150 ease-out [@media(hover:hover)]:hover:border-primary/40 [@media(hover:hover)]:hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/pacientes/$id', params: { id: String(p.id) } })}
                  className="flex w-full min-w-0 flex-col gap-2.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nombre={p.nombre} className="h-11 w-11 text-base" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{p.nombre}</div>
                      <div className="truncate text-[13px] text-ink-muted">{meta(p)}</div>
                    </div>
                    {imc && (
                      <ImcBadge
                        clase={imc.cls}
                        className="shrink-0 rounded-full px-2 text-[12px] font-semibold"
                      >{`IMC ${imc.val}`}</ImcBadge>
                    )}
                  </div>
                  {p.objetivo && (
                    <div className="truncate text-[13px] text-ink-muted">
                      <span className="text-ink-muted/70">Objetivo:</span> {p.objetivo}
                    </div>
                  )}
                </button>
                <div className="mt-auto flex w-full items-center gap-2 border-t border-border pt-2.5 text-[13px] text-ink-muted">
                  <span className="shrink-0">
                    {p.num_revisiones === 1 ? '1 revisión' : `${p.num_revisiones} revisiones`}
                  </span>
                  <span
                    title={p.ultima_revision ? fmtFecha(p.ultima_revision) : undefined}
                    className={cn(
                      'ml-auto inline-flex min-w-0 items-center gap-1.5',
                      seg.estado !== 'al_dia' && 'font-semibold text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {seg.estado !== 'al_dia' && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                    )}
                    <span className="truncate">{seg.texto}</span>
                  </span>
                  {seg.estado === 'vencida' && (
                    <Link
                      to="/pacientes/$id/revisiones"
                      params={{ id: String(p.id) }}
                      className="shrink-0 font-semibold text-primary [@media(hover:hover)]:hover:underline"
                    >
                      Revisión
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function resumen(total: number, pendientes: number): string {
  const cuantos = total === 1 ? '1 cliente' : `${total} clientes`
  if (pendientes === 0) return `${cuantos} · todas las revisiones al día`
  return `${cuantos} · ${pendientes} con la revisión pendiente`
}

function Filtro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors',
        activo
          ? 'border-primary/30 bg-primary-light text-primary'
          : 'border-border bg-surface text-ink-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function Cabecera({
  onNew,
  q,
  setQ,
  sinBusqueda,
  resumen: textoResumen,
}: {
  onNew: () => void
  q: string
  setQ: (v: string) => void
  sinBusqueda?: boolean
  resumen?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">Clientes</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{textoResumen ?? 'Crea una ficha para empezar el seguimiento.'}</p>
      </div>
      <div className="flex items-center gap-2">
        {!sinBusqueda && (
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="w-56 rounded-lg border border-border bg-app py-2 pl-9 pr-3 text-[15px] outline-hidden focus:border-primary focus:bg-surface"
              placeholder="Buscar cliente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        )}
        <Button onClick={onNew}>+ Nuevo cliente</Button>
      </div>
    </div>
  )
}
