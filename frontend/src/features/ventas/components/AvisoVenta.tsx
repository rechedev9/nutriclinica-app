import { Button } from '@/components/ui/Button'
import { fmtMoneda } from '@/lib/format/moneda'
import { cambio, efectivoDe } from '../carrito'
import { useTienda, useVenta } from '../hooks/useVentas'
import { TicketImprimible, imprimirTicket } from './Ticket'

export function AvisoVenta({
  ventaId,
  onVer,
  onOcultar,
  montarImpresion,
}: {
  ventaId: number
  onVer: () => void
  onOcultar: () => void
  montarImpresion: boolean
}) {
  const { data: venta } = useVenta(ventaId)
  const { data: tienda } = useTienda()
  const efectivo = venta ? efectivoDe(venta.pagos) : 0
  const entregado = venta?.entregado ?? null
  const devolver = entregado !== null && efectivo > 0 ? cambio(entregado, efectivo) : 0

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between lg:col-span-2"
    >
      <div className="min-w-0">
        <p className="font-semibold">{venta ? `Venta ${venta.numero} cobrada` : 'Venta cobrada'}</p>
        {devolver > 0 && (
          <p className="text-primary">
            Cambio a devolver <span className="text-lg font-extrabold tabular-nums">{fmtMoneda(devolver)}</span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={venta === undefined} onClick={imprimirTicket}>
          Imprimir ticket
        </Button>
        <Button variant="outline" size="sm" onClick={onVer}>
          Ver ticket
        </Button>
        <Button variant="ghost" size="sm" onClick={onOcultar}>
          Ocultar
        </Button>
      </div>
      {venta !== undefined && montarImpresion && <TicketImprimible venta={venta} tienda={tienda} />}
    </div>
  )
}
