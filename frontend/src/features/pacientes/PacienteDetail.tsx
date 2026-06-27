import { useState } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { usePacientes, useDeletePaciente } from './hooks/usePacientes'
import { PacienteModal } from './components/PacienteModal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { calcEdad, fmtFecha } from '@/lib/format/fecha'
import { cn } from '@/lib/cn'
import { useNavigate } from 'react-router-dom'
import type { Paciente } from '@/types'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="rounded-md bg-surface-2 px-2 py-1 text-[13px]">
      <span className="font-semibold">{value}</span> <span className="text-ink-muted">{label}</span>
    </span>
  )
}

const tabs = [
  { to: 'ficha', label: 'Ficha clínica' },
  { to: 'revisiones', label: 'Revisiones', count: 'num_revisiones' as const },
  { to: 'fotos', label: 'Fotos', count: 'num_fotos' as const },
  { to: 'analisis', label: 'Análisis' },
]

export function PacienteDetail() {
  const { id } = useParams()
  const pid = Number(id)
  const { data: pacientes, isLoading } = usePacientes()
  const del = useDeletePaciente()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  if (isLoading) return <CenteredSpinner />
  const paciente = pacientes?.find((p) => p.id === pid)
  if (!paciente) return <div className="p-8 text-ink-muted">Paciente no encontrado</div>

  const edad = calcEdad(paciente.fecha_nac)

  async function onDelete() {
    const ok = await confirm({
      title: '¿Eliminar paciente?',
      message: `Se borrarán también sus revisiones y fotos. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (ok) {
      await del.mutateAsync(paciente!.id)
      navigate('/pacientes')
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <div className="flex shrink-0 items-center gap-3.5 border-b border-border bg-surface px-6 py-4 max-md:flex-wrap print-hide">
        <Avatar nombre={paciente.nombre} className="h-[52px] w-[52px] text-xl shadow-[0_6px_16px_-4px_rgba(15,123,146,.45)]" />
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

      <div className="flex gap-1 border-b border-border bg-surface px-4 max-md:overflow-x-auto no-scrollbar print-hide">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[15px] font-semibold transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )
            }
          >
            {t.label}
            {t.count && (paciente as Paciente)[t.count] > 0 && (
              <Badge>{(paciente as Paciente)[t.count]}</Badge>
            )}
          </NavLink>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto max-md:overflow-visible">
        <Outlet context={paciente} />
      </div>

      <PacienteModal open={editing} onClose={() => setEditing(false)} paciente={paciente} />
    </div>
  )
}
