import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { etiquetaMetodo } from '../carrito'
import { useTienda, useVenta } from '../hooks/useVentas'
import { AnularModal } from './AnularModal'
import { CorregirModal } from './CorregirModal'
import { DevolucionModal } from './DevolucionModal'
import { SituacionBadge } from './SituacionBadge'
import { Ticket, TicketImprimible, imprimirTicket } from './Ticket'
import type { Venta } from '@/types'

type Accion = 'anular' | 'devolver' | 'corregir'

function fechaHora(creado: string | null): string {
  if (creado === null) return ''
  return `${fmtFecha(creado)} ${creado.slice(11, 16)}`
}

// Por qué no se puede anular, o null si se puede.
function bloqueoAnular(venta: Venta, hoy: string): string | null {
  if (venta.devoluciones.length > 0) return 'Ya tiene devoluciones: si devuelve algo más, registra otra devolución.'
  if (venta.fecha !== hoy) return 'Solo se anulan las ventas de hoy. Para esta, registra una devolución.'
  return null
}

export function VentaDetalleModal({ ventaId, onClose }: { ventaId: number; onClose: () => void }) {
  const { data: venta, isLoading, isError, error, refetch, isFetching } = useVenta(ventaId)
  const { data: tienda } = useTienda()
  const [accion, setAccion] = useState<Accion | null>(null)
  const [hoy] = useState(() => hoyLocal())

  if (isLoading || isError || !venta) {
    return (
      <Modal open onClose={onClose} title="Venta">
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="la venta" />
        ) : (
          <CenteredSpinner />
        )}
      </Modal>
    )
  }

  const anulada = venta.estado === 'anulada'
  const motivoNoAnular = bloqueoAnular(venta, hoy)
  const puedeDevolver = !anulada && venta.situacion !== 'devuelta'

  return (
    <>
      <Modal open onClose={onClose} title={`Venta ${venta.numero}`} className="w-[min(860px,94vw)]">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <SituacionBadge situacion={venta.situacion} />
              <span className="text-ink-muted">
                {venta.creado ? fechaHora(venta.creado) : fmtFecha(venta.fecha)}
                {venta.usuario && ` · cobró ${venta.usuario}`}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-ink-muted">Cliente</dt>
              <dd>
                {venta.paciente_id !== null && venta.paciente_nombre ? (
                  <Link
                    to="/pacientes/$id/compras"
                    params={{ id: String(venta.paciente_id) }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {venta.paciente_nombre}
                  </Link>
                ) : (
                  'Sin cliente'
                )}
              </dd>
              <dt className="text-ink-muted">Total</dt>
              <dd className="font-semibold tabular-nums">{fmtMoneda(venta.total)}</dd>
              {venta.total_devuelto > 0 && (
                <>
                  <dt className="text-ink-muted">Devuelto</dt>
                  <dd className="tabular-nums">-{fmtMoneda(venta.total_devuelto)}</dd>
                </>
              )}
              <dt className="text-ink-muted">Pago</dt>
              <dd>
                {venta.pagos.length === 0
                  ? 'Sin indicar'
                  : venta.pagos.map((p) => `${etiquetaMetodo(p.metodo)} ${fmtMoneda(p.importe)}`).join(' + ')}
              </dd>
              {venta.notas && (
                <>
                  <dt className="text-ink-muted">Notas</dt>
                  <dd className="whitespace-pre-line">{venta.notas}</dd>
                </>
              )}
            </dl>

            {anulada && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                <div className="font-semibold text-danger">Anulada</div>
                <div>{venta.anulacion_motivo}</div>
                <div className="text-xs text-ink-muted">
                  {fechaHora(venta.anulacion_fecha)}
                  {venta.anulacion_usuario && ` · ${venta.anulacion_usuario}`}
                </div>
              </div>
            )}

            {venta.devoluciones.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-bold">Devoluciones</h4>
                {venta.devoluciones.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border p-3">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">
                        {fmtMoneda(d.importe)} en {etiquetaMetodo(d.metodo_reembolso).toLowerCase()}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {fechaHora(d.creado) || fmtFecha(d.fecha)}
                        {d.usuario && ` · ${d.usuario}`}
                      </span>
                    </div>
                    <div>{d.motivo}</div>
                    <ul className="mt-1 text-xs text-ink-muted">
                      {d.lineas.map((l) => (
                        <li key={l.venta_linea_id}>
                          {l.producto_nombre} × {l.cantidad} · {fmtMoneda(l.importe)}
                          {l.reingresa ? ' · vuelve al almacén' : ' · no vuelve al almacén'}
                        </li>
                      ))}
                    </ul>
                    {d.notas && <div className="mt-1 text-xs">{d.notas}</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={imprimirTicket}>
                Reimprimir ticket
              </Button>
              {puedeDevolver && (
                <Button variant="outline" size="sm" onClick={() => setAccion('devolver')}>
                  Devolución
                </Button>
              )}
              {!anulada && (
                <Button variant="outline" size="sm" onClick={() => setAccion('corregir')}>
                  Corregir
                </Button>
              )}
              {!anulada && motivoNoAnular === null && (
                <Button variant="danger" size="sm" onClick={() => setAccion('anular')}>
                  Anular venta
                </Button>
              )}
            </div>
            {!anulada && motivoNoAnular !== null && <p className="text-xs text-ink-muted">{motivoNoAnular}</p>}
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-surface-2 p-4">
            <Ticket venta={venta} tienda={tienda} />
          </div>
        </div>
        <TicketImprimible venta={venta} tienda={tienda} />
      </Modal>

      {accion === 'anular' && <AnularModal venta={venta} onClose={() => setAccion(null)} />}
      {accion === 'devolver' && <DevolucionModal venta={venta} onClose={() => setAccion(null)} />}
      {accion === 'corregir' && <CorregirModal venta={venta} onClose={() => setAccion(null)} />}
    </>
  )
}
