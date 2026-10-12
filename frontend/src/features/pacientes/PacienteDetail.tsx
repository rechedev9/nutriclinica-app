import { useState } from 'react'
import { Link, Outlet, getRouteApi, useNavigate } from '@tanstack/react-router'
import { usePacientes, useDeletePaciente } from './hooks/usePacientes'
import { PacienteModal } from './components/PacienteModal'
import { PacienteContexto } from './tabs/context'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { calcEdad, fmtFecha } from '@/lib/format/fecha'
import { intentar } from '@/lib/api/intentar'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="rounded-md bg-surface-2 px-2 py-1 text-[13px]">
      <span className="font-semibold">{value}</span> <span className="text-ink-muted">{label}</span>
    </span>
  )
}

const tabs = [
  { to: '/pacientes/$id/ficha', label: 'Ficha clínica' },
  { to: '/pacientes/$id/revisiones', label: 'Revisiones', count: 'num_revisiones' },
  { to: '/pacientes/$id/fotos', label: 'Fotos', count: 'num_fotos' },
  { to: '/pacientes/$id/analisis', label: 'Análisis' },
] as const

const ruta = getRouteApi('/_sesion/_app/pacientes/$id')

export function PacienteDetail() {
  const { id } = ruta.useParams()
  const pid = Number(id)
  const { data: pacientes, isLoading, isError, error, refetch, isFetching } = usePacientes()
  const del = useDeletePaciente()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="el paciente" />
  const paciente = pacientes?.find((p) => p.id === pid)
  if (!paciente) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <h2 className="text-xl font-semibold text-ink">Paciente no encontrado</h2>
        <p className="text-sm text-ink-muted">Este paciente no existe o se ha eliminado.</p>
        <Button variant="outline" onClick={() => void navigate({ to: '/pacientes' })}>
          Volver a Pacientes
        </Button>
      </div>
    )
  }

  const edad = calcEdad(paciente.fecha_nac)
  const pacienteId = paciente.id

  async function onDelete() {
    const ok = await confirm({
      title: '¿Eliminar paciente?',
      message: `Se borrarán también sus revisiones y fotos. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (ok) {
      if (await intentar(del.mutateAsync(pacienteId))) await navigate({ to: '/pacientes' })
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-6 py-4 print-hide">
        <button
          onClick={() => void navigate({ to: '/pacientes' })}
          className="flex w-fit items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Pacientes
        </button>
        <div className="flex items-center gap-3.5 max-md:flex-wrap">
          <Avatar
            nombre={paciente.nombre}
            className="h-[52px] w-[52px] text-xl shadow-[0_6px_16px_-4px_rgba(15,123,146,.45)]"
          />
          <div className="flex-1">
            <div className="text-[22px] font-bold">{paciente.nombre}</div>
            <div className="text-sm text-ink-muted">
              {paciente.fecha_nac ? `Nac. ${fmtFecha(paciente.fecha_nac)}` : 'Sin fecha de nacimiento'}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {paciente.peso != null && <Stat value={String(paciente.peso)} label="kg" />}
              {paciente.talla != null && <Stat value={String(paciente.talla)} label="cm" />}
              {edad != null && <Stat value={String(edad)} label="años" />}
              {paciente.sexo && <Stat value={paciente.sexo} label="" />}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border bg-surface px-4 max-md:overflow-x-auto no-scrollbar print-hide">
        {tabs.map((t) => {
          const total = 'count' in t ? paciente[t.count] : 0
          return (
            <Link
              key={t.to}
              to={t.to}
              params={{ id }}
              className="flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[15px] font-semibold transition-colors"
              activeProps={{ className: 'border-primary text-primary' }}
              inactiveProps={{ className: 'border-transparent text-ink-muted hover:text-ink' }}
            >
              {t.label}
              {total > 0 && <Badge>{total}</Badge>}
            </Link>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto max-md:overflow-visible">
        <PacienteContexto value={paciente}>
          <Outlet />
        </PacienteContexto>
      </div>

      <PacienteModal open={editing} onClose={() => setEditing(false)} paciente={paciente} />
    </div>
  )
}
