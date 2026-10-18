import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { intentar } from '@/lib/api/intentar'
import { cn } from '@/lib/cn'
import { useAlmacen, useCreateRecuento } from '../hooks/useStock'
import { fmtCantidad, fmtCantidadConSigno } from '../movimientos'
import { diferenciaDe, errorContado, errorRecuento, lineasParaEnviar, resumenRecuento } from '../recuento'
import type { LineaRecuento } from '../recuento'
import type { AlmacenRow } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  // Producto con el que se abre el recuento (desde sus movimientos); sin él, la lista empieza vacía.
  productoInicial?: number
}

const MOTIVO_POR_DEFECTO = 'Recuento de inventario'

function lineaDe(p: AlmacenRow): LineaRecuento {
  return { producto_id: p.id, esperado: p.stock_actual, contado: '' }
}

export function RecuentoModal({ open, onClose, productoInicial }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Recuento de inventario" className="w-[min(760px,94vw)]">
      {/* Se monta al abrir: cada recuento empieza limpio y un refresco del almacén no borra lo escrito. */}
      {open && <FormularioRecuento onClose={onClose} productoInicial={productoInicial} />}
    </Modal>
  )
}

function FormularioRecuento({ onClose, productoInicial }: Omit<Props, 'open'>) {
  const { data: almacen = [] } = useAlmacen()
  const create = useCreateRecuento()
  const [lineas, setLineas] = useState<LineaRecuento[]>(() => {
    const inicial = almacen.find((p) => p.id === productoInicial)
    return inicial ? [lineaDe(inicial)] : []
  })
  const [motivo, setMotivo] = useState(MOTIVO_POR_DEFECTO)
  const [notas, setNotas] = useState('')

  const porId = new Map(almacen.map((p) => [p.id, p]))
  const enLista = new Set(lineas.map((l) => l.producto_id))
  const disponibles = almacen.filter((p) => !enLista.has(p.id))
  const error = errorRecuento({ lineas, motivo })
  const resumen = resumenRecuento(lineas)

  function anadir(id: number) {
    const producto = porId.get(id)
    if (producto) setLineas((ls) => [...ls, lineaDe(producto)])
  }

  function cambiar(id: number, contado: string) {
    setLineas((ls) => ls.map((l) => (l.producto_id === id ? { ...l, contado } : l)))
  }

  async function submit() {
    const ok = await intentar(
      create.mutateAsync({ motivo: motivo.trim(), notas: notas.trim() || null, lineas: lineasParaEnviar(lineas) }),
    )
    if (ok) onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">
        Escribe las unidades que hay de verdad en el almacén. La diferencia con el stock del sistema se registra como
        ajuste. Deja en blanco los productos que no cuentes.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Añadir producto" className="min-w-56 flex-1">
          <Select value="" onChange={(e) => anadir(Number(e.target.value))} disabled={disponibles.length === 0}>
            <option value="">{disponibles.length === 0 ? 'Ya están todos' : 'Selecciona un producto'}</option>
            {disponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          variant="outline"
          onClick={() => setLineas((ls) => [...ls, ...disponibles.map(lineaDe)])}
          disabled={disponibles.length === 0}
        >
          Añadir todos
        </Button>
      </div>

      {lineas.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-3 py-6 text-center text-sm text-ink-muted">
          Añade los productos que vas a contar.
        </p>
      ) : (
        <div className="max-h-[45vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-surface">
                <th className="px-3 py-2 font-semibold">Producto</th>
                <th className="px-3 py-2 text-right font-semibold">En el sistema</th>
                <th className="px-3 py-2 text-right font-semibold">Contadas</th>
                <th className="px-3 py-2 text-right font-semibold">Diferencia</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => {
                const producto = porId.get(l.producto_id)
                const diferencia = diferenciaDe(l)
                const problema = errorContado(l.contado)
                return (
                  <tr key={l.producto_id} className="border-b border-border last:border-0">
                    <td className="max-w-[16rem] px-3 py-2">
                      <div className="truncate font-semibold">{producto?.nombre ?? `Producto ${l.producto_id}`}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {fmtCantidad(l.esperado)} <span className="text-ink-muted">{producto?.unidad ?? 'ud'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Unidades contadas de ${producto?.nombre ?? 'el producto'}`}
                        aria-invalid={problema !== null}
                        className="ml-auto w-24 text-right"
                        value={l.contado}
                        onChange={(e) => cambiar(l.producto_id, e.target.value)}
                      />
                      {problema && <div className="mt-1 text-right text-xs text-danger">{problema}</div>}
                    </td>
                    <td
                      className={cn(
                        'whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums',
                        diferencia !== null && diferencia < 0 && 'text-danger',
                        diferencia !== null && diferencia > 0 && 'text-success',
                        diferencia === 0 && 'text-ink-muted',
                      )}
                    >
                      {diferencia === null ? '' : diferencia === 0 ? 'Cuadra' : fmtCantidadConSigno(diferencia)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        onClick={() => setLineas((ls) => ls.filter((x) => x.producto_id !== l.producto_id))}
                      >
                        Quitar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Motivo *" error={motivo.trim() === '' ? 'Indica el motivo del recuento' : undefined}>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Notas">
          <Textarea rows={1} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-ink-muted">
          {resumen.contados} contado(s) · {resumen.conDiferencia} con diferencia
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} isLoading={create.isPending} disabled={error !== null} title={error ?? undefined}>
            Registrar recuento
          </Button>
        </div>
      </div>
    </div>
  )
}
