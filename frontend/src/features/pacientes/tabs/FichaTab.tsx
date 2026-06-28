import { usePacienteContext } from './context'
import { Button } from '@/components/ui/Button'
import { calcIMC } from '@/lib/calc'
import { fmtFecha } from '@/lib/format/fecha'
import { descargarExcelPacientes } from '@/lib/api/downloads'

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold">{value || '—'}</div>
    </div>
  )
}

function Seccion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</div>
      {children}
    </div>
  )
}

export function FichaTab() {
  const p = usePacienteContext()
  const imc = calcIMC(p.peso, p.talla)

  return (
    <div className="flex flex-col gap-4 p-6">
      <Seccion title="Datos personales">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
          <Campo label="DNI / NIF" value={p.dni} />
          <Campo label="Sexo" value={p.sexo} />
          <Campo label="Fecha de nacimiento" value={p.fecha_nac ? fmtFecha(p.fecha_nac) : ''} />
          <Campo
            label="Grupo sanguíneo"
            value={p.grupo_sanguineo && <span className="text-danger">🩸 {p.grupo_sanguineo}</span>}
          />
          <Campo label="Teléfono" value={p.telefono} />
          <Campo label="Email" value={p.email} />
          <Campo
            label="Consentimiento RGPD"
            value={
              p.consentimiento === 1 ? (
                <span className="text-success">
                  ✓ Otorgado{p.consentimiento_fecha ? ` · ${fmtFecha(p.consentimiento_fecha.slice(0, 10))}` : ''}
                </span>
              ) : (
                <span className="text-danger">Pendiente</span>
              )
            }
          />
        </div>
      </Seccion>

      <Seccion title="Datos clínicos">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
          <Campo label="Peso inicial (kg)" value={p.peso} />
          <Campo label="Talla (cm)" value={p.talla} />
          <Campo
            label="IMC"
            value={
              imc ? (
                <span
                  className="rounded px-1.5 py-0.5"
                  style={{
                    background:
                      imc.cls === 'imc-normal'
                        ? '#dcfce7'
                        : imc.cls === 'imc-bajo'
                          ? '#fef9c3'
                          : imc.cls === 'imc-sobrepeso'
                            ? '#fef9c3'
                            : '#fee2e2',
                    color:
                      imc.cls === 'imc-normal'
                        ? '#15803d'
                        : imc.cls === 'imc-obesidad'
                          ? '#b91c1c'
                          : '#a16207',
                  }}
                >
                  {imc.val} · {imc.etiq}
                </span>
              ) : (
                ''
              )
            }
          />
          <Campo label="Objetivo" value={p.objetivo} />
          <Campo label="Actividad física" value={p.actividad_fisica} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Campo label="Intolerancias / alergias" value={p.intolerancias} />
          <Campo label="Patologías" value={p.patologias} />
        </div>
      </Seccion>

      {p.notas && (
        <Seccion title="Notas / observaciones">
          <p className="whitespace-pre-wrap text-[15px]">{p.notas}</p>
        </Seccion>
      )}

      <div>
        <Button variant="outline" onClick={() => descargarExcelPacientes(p.id)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar Excel
        </Button>
      </div>
    </div>
  )
}
