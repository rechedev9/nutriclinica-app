import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { fmtMoneda } from '@/lib/format/moneda'
import { cn } from '@/lib/cn'
import { cambio, efectivoDe, entregasRapidas, errorPagos, importeEditable, leerImporte } from '../carrito'
import type { ModoCobro } from '../ultimo-cobro'
import { PagosEditor, pagosDe } from './PagosEditor'
import type { PagoEditable } from './PagosEditor'
import type { PagoInput } from '@/types'

const MODOS: { valor: ModoCobro; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'bizum', etiqueta: 'Bizum' },
  { valor: 'mixto', etiqueta: 'Mixto' },
]

interface Props {
  total: number
  modoInicial: ModoCobro
  isLoading: boolean
  onClose: () => void
  onCobrar: (cobro: { pagos: PagoInput[]; entregado: number | null; modo: ModoCobro }) => void
}

export function CobroModal({ total, modoInicial, isLoading, onClose, onCobrar }: Props) {
  const [modo, setModo] = useState<ModoCobro>(modoInicial)
  const [entregadoTexto, setEntregadoTexto] = useState('')
  const [filas, setFilas] = useState<PagoEditable[]>([
    { metodo: 'efectivo', importe: '' },
    { metodo: 'tarjeta', importe: '' },
  ])

  const entregado = leerImporte(entregadoTexto)
  const pagos: PagoInput[] =
    modo === 'mixto' ? pagosDe(filas).filter((p) => p.importe !== 0) : [{ metodo: modo, importe: total }]
  const efectivo = efectivoDe(pagos)

  let error = total === 0 ? null : errorPagos(pagos, total)
  if (error === null && entregado !== null && efectivo > 0) {
    if (Number.isNaN(entregado)) error = 'El importe entregado no es un número'
    else if (cambio(efectivo, entregado) > 0) error = 'Lo entregado no cubre el efectivo'
  }

  function cobrar() {
    if (error !== null) return
    onCobrar({ pagos: total === 0 ? [] : pagos, entregado: efectivo > 0 ? entregado : null, modo })
  }

  return (
    <Modal open onClose={onClose} title="Cobrar" className="w-[min(480px,94vw)]">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          cobrar()
        }}
      >
        <div className="rounded-lg bg-surface-2 px-4 py-3 text-center">
          <div className="text-[13px] text-ink-muted">Total a cobrar</div>
          <div className="text-3xl font-extrabold tabular-nums">{fmtMoneda(total)}</div>
        </div>

        {total > 0 && (
          <div role="radiogroup" aria-label="Forma de pago" className="grid grid-cols-4 gap-2">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                role="radio"
                aria-checked={modo === m.valor}
                onClick={() => setModo(m.valor)}
                className={cn(
                  'rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors',
                  modo === m.valor
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border bg-surface text-ink-muted hover:bg-surface-2',
                )}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>
        )}

        {modo === 'mixto' && total > 0 && <PagosEditor filas={filas} onChange={setFilas} total={total} />}

        {efectivo > 0 && (
          <div className="flex flex-col gap-2">
            <Field label={modo === 'mixto' ? `Entrega en efectivo (${fmtMoneda(efectivo)})` : 'Entrega el cliente'}>
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="Importe exacto"
                className="text-right text-lg tabular-nums"
                value={entregadoTexto}
                onChange={(e) => setEntregadoTexto(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {entregasRapidas(efectivo).map((importe) => (
                <Button
                  key={importe}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEntregadoTexto(importeEditable(importe))}
                >
                  {fmtMoneda(importe)}
                </Button>
              ))}
            </div>
            {entregado !== null && !Number.isNaN(entregado) && entregado >= efectivo && (
              <div className="flex items-baseline justify-between rounded-lg bg-primary-light px-4 py-2 text-primary">
                <span className="text-sm font-semibold">Cambio</span>
                <span className="text-2xl font-extrabold tabular-nums">{fmtMoneda(cambio(entregado, efectivo))}</span>
              </div>
            )}
          </div>
        )}

        {error !== null && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={error !== null}>
            Cobrar {fmtMoneda(total)}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
