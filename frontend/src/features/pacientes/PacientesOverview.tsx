import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePacientes } from './hooks/usePacientes'
import { PacienteModal } from './components/PacienteModal'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { calcIMC, type IMCClase } from '@/lib/calc'
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

// Colores del distintivo de IMC (mismos que en la ficha del paciente).
function imcStyle(cls: IMCClase): { background: string; color: string } {
  switch (cls) {
    case 'imc-normal':
      return { background: '#dcfce7', color: '#15803d' }
    case 'imc-obesidad':
      return { background: '#fee2e2', color: '#b91c1c' }
    default:
      return { background: '#fef9c3', color: '#a16207' }
  }
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
  const deferredQ = useDeferredValue(q)

  const filtrados = useMemo(() => {
    const term = normaliza(deferredQ)
    if (!term) return pacientes
    return pacientes.filter((p) => normaliza(p.nombre).includes(term))
  }, [pacientes, deferredQ])

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return (
      <div className="flex flex-1 flex-col p-6">
        <Cabecera onNew={onNew} q={q} setQ={setQ} sinBusqueda />
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los pacientes" />
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
          title="Aún no hay pacientes"
          subtitle="Crea el primero con el botón «Nuevo paciente»"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <Cabecera onNew={onNew} q={q} setQ={setQ} />

      {filtrados.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-muted">Ningún paciente coincide con «{q}».</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtrados.map((p) => {
            const imc = calcIMC(p.peso, p.talla)
            return (
              <button
                key={p.id}
                onClick={() => void navigate({ to: '/pacientes/$id', params: { id: String(p.id) } })}
                className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar nombre={p.nombre} className="h-11 w-11 text-base" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.nombre}</div>
                    <div className="truncate text-[13px] text-ink-muted">{meta(p)}</div>
                  </div>
                  {imc && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold"
                      style={imcStyle(imc.cls)}
                    >
                      IMC {imc.val}
                    </span>
                  )}
                </div>
                {p.objetivo && (
                  <div className="truncate text-[13px] text-ink-muted">
                    <span className="text-ink-muted/70">Objetivo:</span> {p.objetivo}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Cabecera({
  onNew,
  q,
  setQ,
  sinBusqueda,
}: {
  onNew: () => void
  q: string
  setQ: (v: string) => void
  sinBusqueda?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">Pacientes</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Selecciona una ficha para ver su detalle, o crea un paciente nuevo.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!sinBusqueda && (
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="w-56 rounded-lg border border-border bg-app py-2 pl-9 pr-3 text-[15px] outline-none focus:border-primary focus:bg-surface"
              placeholder="Buscar paciente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        )}
        <Button onClick={onNew}>+ Nuevo paciente</Button>
      </div>
    </div>
  )
}
