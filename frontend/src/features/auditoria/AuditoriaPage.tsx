import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  COLOR_ACCION,
  ETIQUETA_ACCION,
  agruparPorDia,
  describirEstado,
  describirRuta,
  resumenLegible,
  tipoAccion,
  tituloDia,
} from './descripcion'
import { DetalleCambios } from './DetalleCambios'
import type { TipoAccion } from './descripcion'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { Chevron } from '@/components/ui/Chevron'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/cn'
import { normaliza } from '@/lib/format/texto'

function useAuditoria() {
  return useQuery({
    queryKey: qk.auditoria,
    queryFn: () => pedir(servidor.auditoria.get({ query: { limite: '300' } })),
  })
}

const TIPOS_FILTRO: TipoAccion[] = ['alta', 'edicion', 'borrado', 'exportacion', 'sesion']

const campo =
  'rounded-lg border border-border bg-app py-2 text-[15px] outline-hidden transition-colors focus:border-primary focus:bg-surface'

function esTipoAccion(valor: string): valor is TipoAccion {
  return TIPOS_FILTRO.some((t) => t === valor)
}

export function AuditoriaPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditoria()
  const { data: pacientes = [] } = usePacientes()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<TipoAccion | ''>('')
  const [usuario, setUsuario] = useState('')
  const [soloRechazadas, setSoloRechazadas] = useState(false)
  const [abiertas, setAbiertas] = useState<ReadonlySet<number>>(new Set())
  const deferredQ = useDeferredValue(q)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return (
      <ErrorState
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        recurso="el registro de auditoría"
      />
    )

  const nombres = new Map(pacientes.map((p) => [p.id, p.nombre]))
  const entradas = (data ?? []).map((e) => {
    const { recurso, pacienteId: deRuta } = describirRuta(e.ruta)
    const pacienteId = deRuta ?? e.paciente_id
    return {
      ...e,
      recurso,
      pacienteId,
      paciente: pacienteId === null ? null : (nombres.get(pacienteId) ?? null),
      tipo: tipoAccion(e.metodo, e.ruta),
      motivo: describirEstado(e.estado, e.ruta),
    }
  })
  const usuarios = [...new Set(entradas.map((e) => e.usuario).filter((u): u is string => !!u))].toSorted()
  const rechazadas = entradas.filter((e) => e.motivo !== null).length

  const term = normaliza(deferredQ)
  const visibles = entradas.filter(
    (e) =>
      (!tipo || e.tipo === tipo) &&
      (!usuario || e.usuario === usuario) &&
      (!soloRechazadas || e.motivo !== null) &&
      (!term || normaliza(`${e.usuario ?? ''} ${e.recurso} ${e.paciente ?? ''}`).includes(term)),
  )
  const porDia = agruparPorDia(visibles)

  function alternar(id: number) {
    setAbiertas((previas) => {
      const nuevas = new Set(previas)
      if (!nuevas.delete(id)) nuevas.add(id)
      return nuevas
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Registro de auditoría</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Quién creó, modificó, borró o exportó datos, y cuándo. Se muestran las 300 operaciones más recientes.
          </p>
        </div>
        {entradas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={cn(campo, 'w-52 px-3')}
              placeholder="Buscar usuario o recurso…"
              aria-label="Buscar en el registro"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className={cn(campo, 'pl-3 pr-8')}
              aria-label="Filtrar por acción"
              value={tipo}
              onChange={(e) => setTipo(esTipoAccion(e.target.value) ? e.target.value : '')}
            >
              <option value="">Todas las acciones</option>
              {TIPOS_FILTRO.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_ACCION[t]}
                </option>
              ))}
            </select>
            {usuarios.length > 1 && (
              <select
                className={cn(campo, 'pl-3 pr-8')}
                aria-label="Filtrar por usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
            {rechazadas > 0 && (
              <button
                aria-pressed={soloRechazadas}
                onClick={() => setSoloRechazadas((v) => !v)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-[15px] font-semibold transition-colors',
                  soloRechazadas
                    ? 'border-danger/30 bg-danger/10 text-danger'
                    : 'border-border bg-surface text-ink-muted hover:text-ink',
                )}
              >
                Rechazadas <span className="tabular-nums opacity-70">{rechazadas}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {entradas.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Sin actividad registrada todavía.</p>
      ) : visibles.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Ninguna operación coincide con el filtro.</p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="w-20 p-3 font-semibold">Hora</th>
                <th className="p-3 font-semibold">Usuario</th>
                <th className="p-3 font-semibold">Acción</th>
                <th className="p-3 font-semibold">Sobre qué</th>
                <th className="p-3 font-semibold">Resultado</th>
              </tr>
            </thead>
            {[...porDia].map(([dia, filas]) => (
              <tbody key={dia}>
                <tr className="border-b border-border bg-surface-2">
                  <th
                    colSpan={5}
                    scope="colgroup"
                    className="px-3 py-1.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-muted"
                  >
                    {dia ? tituloDia(dia) : 'Sin fecha'}
                  </th>
                </tr>
                {filas.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="p-3 tabular-nums text-ink-muted">{e.fecha?.slice(11, 16) || '-'}</td>
                    <td className="p-3 font-semibold">{e.usuario || '-'}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold',
                          e.tipo ? COLOR_ACCION[e.tipo] : 'bg-surface-2 text-ink-muted',
                        )}
                      >
                        {e.tipo ? ETIQUETA_ACCION[e.tipo] : e.metodo}
                      </span>
                    </td>
                    <td className="p-3" title={e.ruta}>
                      {e.recurso}
                      {e.pacienteId !== null && (
                        <>
                          {' · '}
                          {e.paciente ? (
                            <Link
                              to="/pacientes/$id"
                              params={{ id: String(e.pacienteId) }}
                              className="font-medium text-primary hover:underline"
                            >
                              {e.paciente}
                            </Link>
                          ) : (
                            <span className="text-ink-muted">cliente nº {e.pacienteId}</span>
                          )}
                        </>
                      )}
                      {e.detalle?.resumen && (
                        <div className="mt-0.5 break-words text-[13px] text-ink-muted">
                          {resumenLegible(e.detalle.resumen)}
                        </div>
                      )}
                      {e.detalle && e.detalle.cambios.length > 0 && (
                        <>
                          <button
                            type="button"
                            aria-expanded={abiertas.has(e.id)}
                            onClick={() => alternar(e.id)}
                            className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-primary"
                          >
                            {e.detalle.cambios.length === 1 ? '1 cambio' : `${e.detalle.cambios.length} cambios`}
                            <Chevron abierto={abiertas.has(e.id)} />
                          </button>
                          {abiertas.has(e.id) && <DetalleCambios cambios={e.detalle.cambios} />}
                        </>
                      )}
                    </td>
                    <td className="p-3">
                      {e.motivo === null ? (
                        <span className="text-ink-muted">Correcto</span>
                      ) : (
                        <span className="font-semibold text-danger" title={`Código ${e.estado}`}>
                          Rechazada: {e.motivo}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  )
}
