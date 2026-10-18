import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { intentar } from '@/lib/api/intentar'
import { fmtMoneda } from '@/lib/format/moneda'
import { fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { cn } from '@/lib/cn'
import { errorRecepcion, lineasRecepcion, quedaPendiente } from '../pedidos'
import type { LineaRecepcion } from '../pedidos'
import { useRecibirPedido } from '../hooks/useStock'
import type { Pedido } from '@/types'

interface Props {
  pedido: Pedido | null
  onClose: () => void
  onRecibido?: (id: number) => void
}

// Entrar el albarán de un pedido: se propone todo lo pendiente y se corrige lo que no llegó.
export function RecepcionModal({ pedido, onClose, onRecibido }: Props) {
  const recibir = useRecibirPedido()
  const [albaran, setAlbaran] = useState('')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [cerrar, setCerrar] = useState(false)
  const [lineas, setLineas] = useState<LineaRecepcion[]>([])

  useEffect(() => {
    if (pedido === null) return
    setAlbaran('')
    setFecha(hoyLocal())
    setNotas('')
    setCerrar(false)
    setLineas(lineasRecepcion(pedido.lineas))
  }, [pedido])

  function cambiar(productoId: number, cambio: Partial<LineaRecepcion>) {
    setLineas(lineas.map((l) => (l.producto_id === productoId ? { ...l, ...cambio } : l)))
  }

  const problema = errorRecepcion(lineas)
  const faltan = quedaPendiente(lineas)
  const llegan = lineas.filter((l) => l.llega > 0)
  const total = llegan.reduce((s, l) => s + l.llega * l.precio_unitario, 0)

  async function entrar() {
    if (pedido === null || problema !== null) return
    const id = pedido.id
    const completo = faltan.length === 0
    const ok = await intentar(
      recibir.mutateAsync({
        id,
        body: {
          fecha: fecha || null,
          albaran: albaran.trim() || null,
          notas: notas.trim() || null,
          cerrar: !completo && cerrar,
          lineas: llegan.map((l) => ({
            producto_id: l.producto_id,
            cantidad: l.llega,
            precio_unitario: l.precio_unitario,
          })),
        },
      }),
    )
    if (!ok) return
    if (completo) onRecibido?.(id)
    onClose()
  }

  return (
    <Modal
      open={pedido !== null}
      onClose={onClose}
      title={pedido === null ? 'Entrar albarán' : `Entrar albarán del pedido ${pedido.numero}`}
      className="w-[min(760px,94vw)]"
    >
      {pedido !== null && (
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-ink-muted">
            {pedido.proveedor_nombre} · pedido el {fmtFecha(pedido.fecha)}. Escribe lo que viene en el albarán; lo que
            no haya llegado déjalo en 0.
          </p>
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <Field label="Nº de albarán">
              <Input
                autoFocus
                value={albaran}
                placeholder="El que figura en el papel del proveedor"
                onChange={(e) => setAlbaran(e.target.value)}
              />
            </Field>
            <Field label="Fecha de entrega">
              <Input type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
            </Field>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-surface-2 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Pedido</th>
                  <th className="px-3 py-2 text-right">Ya llegó</th>
                  <th className="px-3 py-2 text-center">Llega ahora</th>
                  <th className="px-3 py-2 text-center">Coste €/ud</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.producto_id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{l.producto_nombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.pedido} {l.unidad}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{l.recibido}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        aria-label={`Unidades de ${l.producto_nombre} que llegan`}
                        className={cn(
                          'mx-auto w-24 px-2 py-1 text-center tabular-nums',
                          l.llega > l.pendiente && 'border-amber-500',
                        )}
                        value={l.llega}
                        onChange={(e) => cambiar(l.producto_id, { llega: Number(e.target.value) || 0 })}
                      />
                      {l.llega > l.pendiente && (
                        <p className="mt-0.5 text-center text-xs text-amber-600 dark:text-amber-400">
                          Más de lo pendiente ({l.pendiente})
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Coste de ${l.producto_nombre}`}
                        className="mx-auto w-24 px-2 py-1 text-center tabular-nums"
                        value={l.precio_unitario}
                        onChange={(e) => cambiar(l.producto_id, { precio_unitario: Number(e.target.value) || 0 })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLineas(lineas.map((l) => ({ ...l, llega: l.pendiente })))}
              >
                Llegó todo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLineas(lineas.map((l) => ({ ...l, llega: 0 })))}>
                Poner todo a 0
              </Button>
            </div>
            <span className="rounded-lg bg-surface-2 px-3 py-1.5 font-semibold tabular-nums">
              Importe del albarán: {fmtMoneda(total)}
            </span>
          </div>

          {problema === null &&
            (faltan.length === 0 ? (
              <p className="rounded-lg bg-success/10 px-3 py-2 font-semibold text-success">
                Con este albarán el pedido queda completo.
              </p>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <p>
                  Quedará pendiente:{' '}
                  {faltan.map((l) => `${l.producto_nombre} (${l.falta} ${l.unidad ?? 'ud'})`).join(', ')}.
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={cerrar}
                    onChange={(e) => setCerrar(e.target.checked)}
                  />
                  El resto ya no llegará: cerrar el pedido
                </label>
              </div>
            ))}

          <Field label="Notas (opcional)">
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="min-h-[56px]" />
          </Field>
          {problema !== null && (
            <p role="alert" className="text-danger">
              {problema}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void entrar()} isLoading={recibir.isPending} disabled={problema !== null}>
              Entrar albarán y sumar al stock
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
