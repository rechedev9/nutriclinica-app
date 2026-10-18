import { Link } from '@tanstack/react-router'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { haceCuanto } from '@/lib/format/fecha'
import type { Paciente } from '@/types'
import { agendaClientes, contarMotivos } from '../agenda'
import type { MotivoAgenda, TareaCliente } from '../agenda'
import { useResumenInicio } from '../hooks/useResumenInicio'
import { SinDatos, Tarjeta, Vacio, enlaceSutil, filaEnlace } from './Tarjeta'

const MAX_FILAS = 6

const ESTILO: Record<MotivoAgenda, { texto: string; punto: string }> = {
  primera: { texto: 'text-primary', punto: 'bg-primary' },
  vencida: { texto: 'text-amber-600 dark:text-amber-400', punto: 'bg-amber-500' },
  baja: { texto: 'text-danger', punto: 'bg-danger' },
  consentimiento: { texto: 'text-ink-muted', punto: 'bg-ink-muted' },
}

function descripcion(tarea: TareaCliente<Paciente>): string {
  const { motivo, dias } = tarea
  if (motivo === 'primera')
    return dias === null ? 'Sin primera revisión' : `Sin primera revisión · alta ${haceCuanto(dias)}`
  if (motivo === 'vencida') return `Revisión vencida · última ${haceCuanto(dias ?? 0)}`
  if (motivo === 'baja') return `Riesgo de baja · no viene desde ${haceCuanto(dias ?? 0)}`
  return 'Falta el consentimiento RGPD'
}

export function AgendaClientes({ hoy }: { hoy: Date }) {
  const clientes = usePacientes()
  const resumen = useResumenInicio()

  if (!clientes.data || !resumen.data) {
    return (
      <Tarjeta titulo="Agenda de clientes">
        <SinDatos consultas={[clientes, resumen]} recurso="los clientes" />
      </Tarjeta>
    )
  }

  const ultimasCompras = new Map(resumen.data.ultimas_compras.map((c) => [c.paciente_id, c.fecha]))
  const tareas = agendaClientes({ clientes: clientes.data, ultimasCompras, hoy })
  const cuenta = contarMotivos(tareas)
  const sinConsentimiento = tareas.filter((t) => t.sinConsentimiento).length
  const pendientes = tareas.length - cuenta.consentimiento
  const resumenMotivos = [
    cuenta.primera > 0 && `${cuenta.primera} sin primera revisión`,
    cuenta.vencida > 0 && `${cuenta.vencida} ${cuenta.vencida === 1 ? 'revisión vencida' : 'revisiones vencidas'}`,
    cuenta.baja > 0 && `${cuenta.baja} en riesgo de baja`,
    sinConsentimiento > 0 && `${sinConsentimiento} sin consentimiento RGPD`,
  ].filter((p) => p !== false)

  return (
    <Tarjeta
      titulo="Agenda de clientes"
      subtitulo={resumenMotivos.length > 0 ? resumenMotivos.join(' · ') : undefined}
      enlace={
        pendientes > 0 ? (
          <Link to="/pacientes" search={{ pendientes: 1 }} className={cn(enlaceSutil, 'shrink-0')}>
            Ver todos
            <span className="tabular-nums"> ({pendientes})</span>
          </Link>
        ) : undefined
      }
    >
      {clientes.data.length === 0 ? (
        <Vacio>Aún no hay clientes. Crea el primero con «Nuevo cliente».</Vacio>
      ) : tareas.length === 0 ? (
        <Vacio>Todos los clientes tienen la revisión al día y el consentimiento firmado.</Vacio>
      ) : (
        <ul className="flex flex-col">
          {tareas.slice(0, MAX_FILAS).map((tarea) => (
            <li key={tarea.cliente.id}>
              <FilaTarea tarea={tarea} />
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}

function FilaTarea({ tarea }: { tarea: TareaCliente<Paciente> }) {
  const { cliente, motivo } = tarea
  const estilo = ESTILO[motivo]
  const aRevisiones = motivo === 'primera' || motivo === 'vencida'
  return (
    <Link
      to={aRevisiones ? '/pacientes/$id/revisiones' : '/pacientes/$id/ficha'}
      params={{ id: String(cliente.id) }}
      className={filaEnlace}
    >
      <Avatar nombre={cliente.nombre} className="h-9 w-9 text-sm" />
      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
        <span className="min-w-0 truncate font-semibold sm:flex-1">{cliente.nombre}</span>
        <span className={cn('inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold', estilo.texto)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', estilo.punto)} aria-hidden="true" />
          {descripcion(tarea)}
        </span>
      </span>
    </Link>
  )
}
