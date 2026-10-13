import { useState } from 'react'
import { usePacienteContext } from './context'
import { Button } from '@/components/ui/Button'
import { ImcBadge } from '@/components/ui/ImcBadge'
import { calcIMC } from '@/lib/calc'
import { fmtFecha } from '@/lib/format/fecha'
import { descargarExcelPacientes } from '@/lib/api/downloads'
import { intentar } from '@/lib/api/intentar'
import { PacienteModal } from '../components/PacienteModal'
import { camposSinRellenar, cuerpoConConsentimiento } from '../components/ficha'
import { useHistorial } from '../hooks/useHistorial'
import { useUpdatePaciente } from '../hooks/usePacientes'
import { textoUltimoCambio, ultimoCambioFicha } from '../historial'

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className="mt-0.5 break-words text-[15px] font-semibold">{value}</div>
    </div>
  )
}

function Seccion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</div>
      {children}
    </div>
  )
}

const REJILLA = 'grid grid-cols-1 gap-x-6 gap-y-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

export function FichaTab() {
  const p = usePacienteContext()
  const imc = calcIMC(p.peso, p.talla)
  const actualizar = useUpdatePaciente()
  const [editando, setEditando] = useState(false)
  const pendientes = camposSinRellenar(p)
  const { data: historial } = useHistorial(p.id)
  const ultimo = historial ? ultimoCambioFicha(historial) : null
  const consentido = p.consentimiento === 1

  async function registrarConsentimiento() {
    await intentar(actualizar.mutateAsync({ id: p.id, body: cuerpoConConsentimiento(p) }))
  }

  const imcBadge = imc ? <ImcBadge clase={imc.cls}>{`${imc.val} · ${imc.etiq}`}</ImcBadge> : null

  const hayPersonales = [p.dni, p.sexo, p.fecha_nac, p.grupo_sanguineo, p.telefono, p.email].some(Boolean)
  const hayCorporales = [p.peso, p.talla, imc, p.objetivo, p.actividad_fisica].some(Boolean)
  const hayAlertas = !!(p.intolerancias || p.patologias)

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {!consentido && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-card border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-amber-800 dark:text-amber-300">
              Consentimiento RGPD pendiente
            </div>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Registra que el cliente acepta el tratamiento de sus datos de seguimiento. Quedará anotado con fecha en el
              historial.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            isLoading={actualizar.isPending}
            onClick={registrarConsentimiento}
          >
            Registrar consentimiento
          </Button>
        </div>
      )}

      {consentido && (
        <div className="flex items-center gap-1.5 text-[13px] text-success">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            Consentimiento RGPD registrado
            {p.consentimiento_fecha ? ` · ${fmtFecha(p.consentimiento_fecha.slice(0, 10))}` : ''}
          </span>
        </div>
      )}

      {hayPersonales && (
        <Seccion title="Datos personales">
          <div className={REJILLA}>
            <Campo label="DNI / NIF" value={p.dni} />
            <Campo label="Sexo" value={p.sexo} />
            <Campo label="Fecha de nacimiento" value={p.fecha_nac ? fmtFecha(p.fecha_nac) : ''} />
            <Campo
              label="Grupo sanguíneo"
              value={p.grupo_sanguineo && <span className="text-danger">🩸 {p.grupo_sanguineo}</span>}
            />
            <Campo label="Teléfono" value={p.telefono && <span className="tabular-nums">{p.telefono}</span>} />
            <Campo label="Email" value={p.email} />
          </div>
        </Seccion>
      )}

      {(hayCorporales || hayAlertas) && (
        <Seccion title="Datos corporales">
          {hayCorporales && (
            <div className={REJILLA}>
              <Campo label="Peso inicial (kg)" value={p.peso && <span className="tabular-nums">{p.peso}</span>} />
              <Campo label="Talla (cm)" value={p.talla && <span className="tabular-nums">{p.talla}</span>} />
              <Campo label="IMC" value={imcBadge} />
              <Campo label="Objetivo" value={p.objetivo} />
              <Campo label="Actividad física" value={p.actividad_fisica} />
            </div>
          )}
          {hayAlertas && (
            <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${hayCorporales ? 'mt-4' : ''}`}>
              <Campo label="Intolerancias / alergias" value={p.intolerancias} />
              <Campo label="Patologías" value={p.patologias} />
            </div>
          )}
        </Seccion>
      )}

      {pendientes.length > 0 && (
        <p className="px-1 text-[13px] text-ink-muted">
          Sin rellenar: {pendientes.join(', ')}.{' '}
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="font-semibold text-primary underline-offset-2 transition-colors duration-150 ease-out [@media(hover:hover)]:hover:underline"
          >
            Completar
          </button>
        </p>
      )}

      {p.notas && (
        <Seccion title="Notas / observaciones">
          <p className="whitespace-pre-wrap break-words text-[15px]">{p.notas}</p>
        </Seccion>
      )}

      {ultimo && (
        <p className="px-1 text-[13px] text-ink-muted">
          {textoUltimoCambio({ cambio: ultimo, formatearFecha: fmtFecha })}
        </p>
      )}

      <div>
        <Button variant="outline" onClick={() => descargarExcelPacientes(p.id)}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar Excel
        </Button>
      </div>

      <PacienteModal open={editando} onClose={() => setEditando(false)} paciente={p} />
    </div>
  )
}
