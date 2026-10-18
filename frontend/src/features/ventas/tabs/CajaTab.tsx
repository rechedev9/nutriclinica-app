import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useMe } from '@/features/auth/useAuth'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { useAlmacen } from '@/features/stock/hooks/useStock'
import { fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { resumenLineas } from '@/lib/format/texto'
import { lineasParaRepetir, masVendidos, ultimaCompra } from '../caja-rapida'
import { anadirProducto, aVentaInput, errorCarrito, importeLinea, totalesCarrito } from '../carrito'
import type { LineaCarrito } from '../carrito'
import { CARRITO_VACIO, useCarritoGuardado } from '../carrito-guardado'
import { useCreateVenta, useResumenCaja, useVentas } from '../hooks/useVentas'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { CobroModal } from '../components/CobroModal'
import { DescuentoInput } from '../components/DescuentoInput'
import { TicketModal } from '../components/TicketModal'
import type { AlmacenRow, PagoInput, Venta } from '@/types'

const MAX_RAPIDOS = 8
const DIAS_MAS_VENDIDOS = 30

function haceDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return hoyLocal(d)
}

export function CajaTab() {
  const { cliente } = useSearch({ from: '/_sesion/_app/ventas/caja' })
  const { data: almacen, isLoading, isError, error, refetch, isFetching } = useAlmacen()
  const { data: clientes = [] } = usePacientes()
  const { data: ventas = [] } = useVentas()
  const { data: me } = useMe()
  const [hoy] = useState(() => hoyLocal())
  const { data: caja } = useResumenCaja(hoy)
  const crear = useCreateVenta()
  const confirm = useConfirm()
  const [carrito, setCarrito] = useCarritoGuardado(cliente ?? null)
  const [cobrando, setCobrando] = useState(false)
  const [ventaCobrada, setVentaCobrada] = useState<number | null>(null)
  const [conNota, setConNota] = useState(carrito.notas !== '')
  const buscador = useRef<HTMLInputElement>(null)

  const productos = almacen ?? []
  const stockDe = new Map(productos.map((p) => [p.id, p.stock_actual]))
  // Las existencias se leen siempre del almacén: el carrito guardado puede ser de hace un rato.
  const lineas = carrito.lineas.map((l) => ({ ...l, stock: stockDe.get(l.producto_id) ?? 0 }))
  const totales = totalesCarrito(lineas, carrito.descuento)
  const problema = errorCarrito(lineas, carrito.descuento)
  const cajaCerrada = (caja?.cierre ?? null) !== null
  const porId = new Map(productos.map((p) => [p.id, p]))
  const rapidos = masVendidos(ventas, { desde: haceDias(DIAS_MAS_VENDIDOS), limite: MAX_RAPIDOS }).flatMap((id) => {
    const p = porId.get(id)
    return p === undefined ? [] : [p]
  })
  const ultima = carrito.pacienteId === null ? undefined : ultimaCompra(ventas, carrito.pacienteId)

  const atajo = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (e.key !== 'F2' && e.key !== 'F9') return
    // Con un diálogo abierto los atajos de la caja no deben actuar por detrás.
    if (document.querySelector('[role="dialog"], [role="alertdialog"]') !== null) return
    e.preventDefault()
    if (e.key === 'F2') {
      buscador.current?.focus()
      buscador.current?.select()
    } else if (cajaCerrada) toast.error(`La caja de hoy (${fmtFecha(hoy)}) está cerrada`)
    else if (problema !== null) toast.error(problema)
    else setCobrando(true)
  })
  useEffect(() => {
    const escuchar = (e: globalThis.KeyboardEvent) => atajo(e)
    window.addEventListener('keydown', escuchar)
    return () => window.removeEventListener('keydown', escuchar)
  }, [])

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los productos" />

  function cambiarLineas(nuevas: LineaCarrito[]) {
    setCarrito((c) => ({ ...c, lineas: nuevas }))
  }

  function cambiarLinea(i: number, cambio: Partial<LineaCarrito>) {
    cambiarLineas(lineas.map((l, j) => (j === i ? { ...l, ...cambio } : l)))
  }

  function quitarLinea(i: number) {
    cambiarLineas(lineas.filter((_, j) => j !== i))
  }

  function anadir(p: AlmacenRow, cantidad: number) {
    cambiarLineas(
      anadirProducto(lineas, {
        producto_id: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        precio_unitario: p.precio_venta,
        stock: p.stock_actual,
        cantidad,
      }),
    )
    buscador.current?.focus()
  }

  function repetir(venta: Venta) {
    const { lineas: nuevas, avisos } = lineasParaRepetir(venta, productos)
    if (nuevas.length === 0) {
      toast.error('No se puede repetir esa compra', { description: avisos.join('. ') })
      return
    }
    cambiarLineas(nuevas.reduce((carro, l) => anadirProducto(carro, l), lineas))
    if (avisos.length > 0) toast.warning('Compra repetida en parte', { description: avisos.join('. ') })
  }

  async function vaciar() {
    const ok = await confirm({ title: '¿Vaciar el carrito?', confirmText: 'Vaciar', danger: true })
    if (ok) setCarrito(CARRITO_VACIO)
  }

  function cobrar(cobro: { pagos: PagoInput[]; entregado: number | null }) {
    const cuerpo = aVentaInput({
      lineas,
      descuentoTotal: carrito.descuento,
      pacienteId: carrito.pacienteId,
      notas: carrito.notas,
      ...cobro,
    })
    crear.mutate(cuerpo, {
      onSuccess: (r) => {
        setCobrando(false)
        setCarrito(CARRITO_VACIO)
        setConNota(false)
        setVentaCobrada(r.id)
      },
    })
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {cajaCerrada && (
        <div role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm lg:col-span-2">
          <span className="font-semibold text-danger">La caja de hoy ({fmtFecha(hoy)}) está cerrada.</span>{' '}
          {me?.rol === 'admin'
            ? 'Para seguir vendiendo, reábrela en '
            : 'Para seguir vendiendo, pide a un administrador que la reabra en '}
          <Link to="/ventas/cierre" className="font-semibold text-primary hover:underline">
            Cierre de caja
          </Link>
          .
        </div>
      )}

      <section className="flex min-w-0 flex-col gap-3">
        {productos.length === 0 ? (
          <p className="rounded-card bg-surface p-6 text-center text-sm text-ink-muted shadow-card">
            Aún no hay productos.{' '}
            <Link to="/stock/almacen" className="font-semibold text-primary hover:underline">
              Dalos de alta en el almacén
            </Link>
            .
          </p>
        ) : (
          <BuscadorProductos
            ref={buscador}
            productos={productos}
            sugeridos={rapidos.length > 0 ? rapidos : productos}
            tituloSugeridos={rapidos.length > 0 ? `Más vendidos (últimos ${DIAS_MAS_VENDIDOS} días)` : 'Productos'}
            onElegir={anadir}
          />
        )}

        <div aria-label="Carrito" className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border text-xs tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Producto</th>
                <th className="px-2 py-2.5 text-right font-semibold">Precio</th>
                <th className="px-2 py-2.5 text-center font-semibold">Cantidad</th>
                <th className="px-2 py-2.5 text-right font-semibold">Importe</th>
                <th className="w-12 px-2 py-2.5">
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    El carrito está vacío. Busca un producto arriba para añadirlo.
                  </td>
                </tr>
              ) : (
                lineas.map((l, i) => (
                  <tr key={`${l.producto_id}-${i}`}>
                    <td className="px-4 py-2 font-semibold">{l.nombre}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtMoneda(l.precio_unitario)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Quitar una unidad de ${l.nombre}`}
                          onClick={() =>
                            l.cantidad <= 1 ? quitarLinea(i) : cambiarLinea(i, { cantidad: l.cantidad - 1 })
                          }
                        >
                          −
                        </Button>
                        <Input
                          aria-label={`Cantidad de ${l.nombre}`}
                          type="number"
                          min="1"
                          className="w-14 px-1 py-1 text-center text-sm tabular-nums"
                          value={l.cantidad}
                          onChange={(e) => cambiarLinea(i, { cantidad: Number(e.target.value) || 0 })}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Añadir una unidad de ${l.nombre}`}
                          onClick={() => cambiarLinea(i, { cantidad: l.cantidad + 1 })}
                        >
                          +
                        </Button>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-bold tabular-nums">{fmtMoneda(importeLinea(l))}</td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        aria-label={`Quitar ${l.nombre}`}
                        onClick={() => quitarLinea(i)}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {lineas.length > 0 && problema !== null && (
          <p role="alert" className="text-sm text-danger">
            {problema}
          </p>
        )}
      </section>

      <section
        aria-label="Cobro"
        className="flex flex-col gap-3 self-start rounded-card bg-surface p-4 shadow-card lg:sticky lg:top-4"
      >
        <Field label="Cliente">
          <Select
            value={carrito.pacienteId ?? ''}
            onChange={(e) =>
              setCarrito((c) => ({ ...c, pacienteId: e.target.value === '' ? null : Number(e.target.value) }))
            }
          >
            <option value="">Venta sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        {ultima && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
            <div className="min-w-0">
              <div className="font-semibold">Última compra · {fmtFecha(ultima.fecha)}</div>
              <div className="truncate text-ink-muted" title={resumenLineas(ultima.lineas)}>
                {resumenLineas(ultima.lineas)}
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => repetir(ultima)}>
              Repetir
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal{totales.unidades > 0 && ` (${totales.unidades} uds.)`}</span>
            <span className="tabular-nums">{fmtMoneda(totales.bruto)}</span>
          </div>
          {totales.descuento_lineas > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-muted">Descuentos por producto</span>
              <span className="tabular-nums">-{fmtMoneda(totales.descuento_lineas)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">Descuento</span>
            <DescuentoInput
              etiqueta="Descuento a toda la venta"
              valor={carrito.descuento}
              onChange={(descuento) => setCarrito((c) => ({ ...c, descuento }))}
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-bold">Total</span>
            <span className="text-3xl font-extrabold tabular-nums">{fmtMoneda(totales.total)}</span>
          </div>
        </div>

        {conNota ? (
          <Field label="Nota (sale en el historial, no en el ticket)">
            <Textarea
              value={carrito.notas}
              onChange={(e) => setCarrito((c) => ({ ...c, notas: e.target.value }))}
              className="min-h-[56px]"
            />
          </Field>
        ) : (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setConNota(true)}>
            + Añadir nota
          </Button>
        )}

        <Button
          className="py-3 text-base"
          title="F9"
          disabled={lineas.length === 0 || problema !== null || cajaCerrada}
          onClick={() => setCobrando(true)}
        >
          Cobrar {lineas.length > 0 && fmtMoneda(totales.total)}
        </Button>
        {lineas.length > 0 && (
          <Button variant="dangerGhost" size="sm" onClick={() => void vaciar()}>
            Vaciar carrito
          </Button>
        )}
      </section>

      {cobrando && (
        <CobroModal
          total={totales.total}
          isLoading={crear.isPending}
          onClose={() => setCobrando(false)}
          onCobrar={cobrar}
        />
      )}
      {ventaCobrada !== null && (
        <TicketModal
          ventaId={ventaCobrada}
          onClose={() => {
            setVentaCobrada(null)
            buscador.current?.focus()
          }}
        />
      )}
    </div>
  )
}
