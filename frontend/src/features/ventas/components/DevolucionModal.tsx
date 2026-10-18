import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { fmtMoneda } from '@/lib/format/moneda'
import { intentar } from '@/lib/api/intentar'
import { METODOS, importeDevolucion, reembolsadoPorLinea, sumarImportes } from '../carrito'
import { useDevolucion } from '../hooks/useVentas'
import { MotivoField } from './MotivoField'
import type { MetodoPago, Venta } from '@/types'

const SUGERENCIAS = [
  'Producto defectuoso',
  'Caducado o en mal estado',
  'No le ha sentado bien',
  'Se equivocó de producto',
]

interface Fila {
  cantidad: number
  reingresa: boolean
}

// Por defecto se devuelve por el mismo medio con el que se pagó, si fue uno solo.
function metodoPorDefecto(venta: Venta): MetodoPago {
  const [unico, ...otros] = venta.pagos
  return unico !== undefined && otros.length === 0 ? unico.metodo : 'efectivo'
}

export function DevolucionModal({ venta, onClose }: { venta: Venta; onClose: () => void }) {
  const devolver = useDevolucion()
  const reembolsado = reembolsadoPorLinea(venta.devoluciones)
  const pendientes = venta.lineas.filter((l) => l.cantidad - l.devuelto > 0)
  const [filas, setFilas] = useState<Map<number, Fila>>(
    () =>
      new Map(
        pendientes.map((l) => [
          l.id,
          { cantidad: pendientes.length === 1 ? l.cantidad - l.devuelto : 0, reingresa: true },
        ]),
      ),
  )
  const [motivo, setMotivo] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>(() => metodoPorDefecto(venta))
  const [notas, setNotas] = useState('')

  const elegidas = pendientes.flatMap((l) => {
    const fila = filas.get(l.id)
    if (fila === undefined || fila.cantidad <= 0) return []
    const importe = importeDevolucion(l, { cantidad: fila.cantidad, reembolsado: reembolsado.get(l.id) ?? 0 })
    return [{ linea: l, fila, importe }]
  })
  const total = sumarImportes(elegidas.map((e) => e.importe))
  const excedida = elegidas.find((e) => e.fila.cantidad > e.linea.cantidad - e.linea.devuelto)
  const error =
    elegidas.length === 0
      ? 'Indica cuántas unidades devuelve'
      : excedida !== undefined
        ? `De «${excedida.linea.producto_nombre}» solo quedan ${excedida.linea.cantidad - excedida.linea.devuelto} por devolver`
        : motivo.trim() === ''
          ? 'Indica el motivo de la devolución'
          : null

  function cambiar(id: number, cambio: Partial<Fila>) {
    setFilas((actual) => {
      const nueva = new Map(actual)
      const fila = nueva.get(id) ?? { cantidad: 0, reingresa: true }
      nueva.set(id, { ...fila, ...cambio })
      return nueva
    })
  }

  async function confirmar() {
    if (error !== null) return
    const ok = await intentar(
      devolver.mutateAsync({
        id: venta.id,
        body: {
          motivo: motivo.trim(),
          metodo_reembolso: metodo,
          notas: notas.trim() === '' ? null : notas.trim(),
          lineas: elegidas.map((e) => ({
            venta_linea_id: e.linea.id,
            cantidad: e.fila.cantidad,
            reingresa: e.fila.reingresa,
          })),
        },
      }),
    )
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Devolución de la venta ${venta.numero}`} className="w-[min(640px,94vw)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {pendientes.map((l) => {
            const fila = filas.get(l.id) ?? { cantidad: 0, reingresa: true }
            const quedan = l.cantidad - l.devuelto
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="text-sm font-semibold">{l.producto_nombre}</div>
                  <div className="text-xs text-ink-muted">
                    Compró {l.cantidad}
                    {l.devuelto > 0 && `, ya devolvió ${l.devuelto}`} · {fmtMoneda(l.importe)}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-sm">
                  Devuelve
                  <Input
                    type="number"
                    min="0"
                    max={quedan}
                    className="w-16 px-2 py-1 text-center tabular-nums"
                    value={fila.cantidad}
                    onChange={(e) => cambiar(l.id, { cantidad: Number(e.target.value) || 0 })}
                  />
                  <span className="text-ink-muted">de {quedan}</span>
                </label>
                <label
                  className="flex items-center gap-1.5 text-sm"
                  title="Desmárcalo si el producto está abierto o dañado y no se puede volver a vender"
                >
                  <input
                    type="checkbox"
                    checked={fila.reingresa}
                    onChange={(e) => cambiar(l.id, { reingresa: e.target.checked })}
                  />
                  Vuelve al almacén
                </label>
              </div>
            )
          })}
        </div>

        <MotivoField
          etiqueta="Motivo de la devolución (obligatorio)"
          valor={motivo}
          onChange={setMotivo}
          sugerencias={SUGERENCIAS}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Se devuelve el dinero en">
            <Select
              value={metodo}
              onChange={(e) => {
                const elegido = METODOS.find((m) => m.valor === e.target.value)?.valor
                if (elegido) setMetodo(elegido)
              }}
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notas (opcional)">
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Field>
        </div>

        <div className="flex items-baseline justify-between rounded-lg bg-surface-2 px-4 py-3">
          <span className="text-sm font-semibold">A devolver al cliente</span>
          <span className="text-2xl font-extrabold tabular-nums">{fmtMoneda(total)}</span>
        </div>

        {error !== null && elegidas.length > 0 && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button isLoading={devolver.isPending} disabled={error !== null} onClick={() => void confirmar()}>
            Registrar devolución
          </Button>
        </div>
      </div>
    </Modal>
  )
}
