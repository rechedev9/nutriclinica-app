import { useNavigate } from 'react-router-dom'
import { usePacientes } from './hooks/usePacientes'
import { Avatar } from '@/components/ui/Avatar'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { calcEdad, fmtFecha } from '@/lib/format/fecha'
import type { Paciente } from '@/types'

function meta(p: Paciente): string {
  if (p.peso && p.talla) return `${p.peso} kg · ${p.talla} cm`
  const edad = calcEdad(p.fecha_nac)
  if (edad != null) return `${edad} años`
  if (p.fecha_nac) return `Nac. ${fmtFecha(p.fecha_nac)}`
  return 'Sin datos'
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-extrabold">{value}</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-muted">
      {children}
    </span>
  )
}

// PacientesOverview es la pantalla de inicio del módulo (cuando no hay paciente
// seleccionado): aprovecha todo el ancho con un resumen y una rejilla de fichas.
export function PacientesOverview() {
  const { data: pacientes = [], isLoading } = usePacientes()
  const navigate = useNavigate()

  if (isLoading) return <CenteredSpinner />

  if (pacientes.length === 0) {
    return (
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
    )
  }

  const totalRevisiones = pacientes.reduce((s, p) => s + p.num_revisiones, 0)
  const totalFotos = pacientes.reduce((s, p) => s + p.num_fotos, 0)

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h2 className="text-xl font-bold">Pacientes</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Selecciona una ficha para ver su detalle, o crea un paciente nuevo.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Pacientes" value={pacientes.length} />
        <Kpi label="Revisiones" value={totalRevisiones} />
        <Kpi label="Fotos" value={totalFotos} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {pacientes.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/pacientes/${p.id}`)}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <Avatar nombre={p.nombre} className="h-11 w-11 text-base" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.nombre}</div>
                <div className="truncate text-[13px] text-ink-muted">{meta(p)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip>{p.num_revisiones} rev.</Chip>
              <Chip>{p.num_fotos} fotos</Chip>
              {p.consentimiento === 1 && (
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-[12px] font-medium text-primary">
                  RGPD ✓
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
