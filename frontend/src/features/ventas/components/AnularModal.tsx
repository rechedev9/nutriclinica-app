import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fmtMoneda } from '@/lib/format/moneda'
import { intentar } from '@/lib/api/intentar'
import { useAnularVenta } from '../hooks/useVentas'
import { MotivoField } from './MotivoField'
import type { Venta } from '@/types'

const SUGERENCIAS = ['Error al cobrar', 'Producto equivocado', 'El cliente se ha arrepentido']

export function AnularModal({ venta, onClose }: { venta: Venta; onClose: () => void }) {
  const anular = useAnularVenta()
  const [motivo, setMotivo] = useState('')
  const sinMotivo = motivo.trim() === ''

  async function confirmar() {
    if (sinMotivo) return
    if (await intentar(anular.mutateAsync({ id: venta.id, motivo: motivo.trim() }))) onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Anular venta ${venta.numero}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          La venta de {fmtMoneda(venta.total)} deja de contar en la caja y los productos vuelven al almacén. Devuelve el
          dinero al cliente por el mismo medio con el que pagó.
        </p>
        <MotivoField
          etiqueta="Motivo de la anulación (obligatorio)"
          valor={motivo}
          onChange={setMotivo}
          sugerencias={SUGERENCIAS}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button variant="danger" isLoading={anular.isPending} disabled={sinMotivo} onClick={() => void confirmar()}>
            Anular venta
          </Button>
        </div>
      </div>
    </Modal>
  )
}
