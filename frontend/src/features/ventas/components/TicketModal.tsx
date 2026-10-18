import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { fmtMoneda } from '@/lib/format/moneda'
import { useTienda, useVenta } from '../hooks/useVentas'
import { cambio, efectivoDe } from '../carrito'
import { Ticket, TicketImprimible, imprimirTicket } from './Ticket'

// Lo que ve el dependiente justo después de cobrar: cambio a devolver y ticket para imprimir.
export function TicketModal({ ventaId, onClose }: { ventaId: number; onClose: () => void }) {
  const { data: venta } = useVenta(ventaId)
  const { data: tienda } = useTienda()
  const efectivo = venta ? efectivoDe(venta.pagos) : 0
  const entregado = venta?.entregado ?? null
  const devolver = entregado !== null && efectivo > 0 ? cambio(entregado, efectivo) : 0

  return (
    <Modal open onClose={onClose} title={venta ? `Venta ${venta.numero} cobrada` : 'Venta cobrada'}>
      {!venta ? (
        <CenteredSpinner />
      ) : (
        <div className="flex flex-col gap-4">
          {devolver > 0 && (
            <div className="flex items-baseline justify-between rounded-lg bg-primary-light px-4 py-3 text-primary">
              <span className="font-semibold">Cambio a devolver</span>
              <span className="text-3xl font-extrabold tabular-nums">{fmtMoneda(devolver)}</span>
            </div>
          )}
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-surface-2 p-4">
            <Ticket venta={venta} tienda={tienda} />
          </div>
          <TicketImprimible venta={venta} tienda={tienda} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={imprimirTicket}>
              Imprimir ticket
            </Button>
            <Button autoFocus onClick={onClose}>
              Nueva venta
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
