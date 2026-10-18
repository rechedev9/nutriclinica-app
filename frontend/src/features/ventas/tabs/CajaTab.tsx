import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
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
import { normaliza } from '@/lib/format/texto'
import { cn } from '@/lib/cn'
import { anadirProducto, aVentaInput, errorCarrito, importeLinea, totalesCarrito } from '../carrito'
import type { LineaCarrito } from '../carrito'
import { CARRITO_VACIO, useCarritoGuardado } from '../carrito-guardado'
import { useCreateVenta, useResumenCaja } from '../hooks/useVentas'
import { CobroModal } from '../components/CobroModal'
import { DescuentoInput } from '../components/DescuentoInput'
import { TicketModal } from '../components/TicketModal'
import type { AlmacenRow, PagoInput } from '@/types'

const MAX_RESULTADOS = 40

function coincide(producto: AlmacenRow, texto: string): boolean {
  if (producto.codigo_barras !== null && producto.codigo_barras.startsWith(texto.trim())) return true
  return normaliza(producto.nombre).includes(normaliza(texto))
}

export function CajaTab() {
  const { cliente } = useSearch({ from: '/_sesion/_app/ventas/caja' })
  const { data: almacen, isLoading, isError, error, refetch, isFetching } = useAlmacen()
  const { data: clientes = [] } = usePacientes()
  const { data: me } = useMe()
  const [hoy] = useState(() => hoyLocal())
  const { data: caja } = useResumenCaja(hoy)
  const crear = useCreateVenta()
  const confirm = useConfirm()
  const [carrito, setCarrito] = useCarritoGuardado(cliente ?? null)
  const [busqueda, setBusqueda] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [ventaCobrada, setVentaCobrada] = useState<number | null>(null)
  const [conNota, setConNota] = useState(carrito.notas !== '')
  const buscador = useRef<HTMLInputElement>(null)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los productos" />

  const productos = almacen ?? []
  const stockDe = new Map(productos.map((p) => [p.id, p.stock_actual]))
  // Las existencias se leen siempre del almacén: el carrito guardado puede ser de hace un rato.
  const lineas = carrito.lineas.map((l) => ({ ...l, stock: stockDe.get(l.producto_id) ?? 0 }))
  const totales = totalesCarrito(lineas, carrito.descuento)
  const problema = errorCarrito(lineas, carrito.descuento)
  const cajaCerrada = (caja?.cierre ?? null) !== null
  const filtrados = busqueda.trim() === '' ? productos : productos.filter((p) => coincide(p, busqueda))
  const resultados = filtrados.slice(0, MAX_RESULTADOS)

  function cambiarLineas(nuevas: LineaCarrito[]) {
    setCarrito((c) => ({ ...c, lineas: nuevas }))
  }

  function cambiarLinea(i: number, cambio: Partial<LineaCarrito>) {
    cambiarLineas(lineas.map((l, j) => (j === i ? { ...l, ...cambio } : l)))
  }

  function quitarLinea(i: number) {
    cambiarLineas(lineas.filter((_, j) => j !== i))
  }

  function anadir(p: AlmacenRow) {
    if (p.stock_actual <= 0) {
      toast.error(`No queda stock de «${p.nombre}»`)
      return
    }
    cambiarLineas(
      anadirProducto(lineas, {
        producto_id: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        precio_unitario: p.precio_venta,
        stock: p.stock_actual,
      }),
    )
    setBusqueda('')
    buscador.current?.focus()
  }

  // El lector de códigos teclea el código y pulsa Intro.
  function onKeyDownBuscador(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const texto = busqueda.trim()
    if (texto === '') return
    const exacto = productos.find((p) => p.codigo_barras === texto)
    const elegido = exacto ?? (filtrados.length === 1 ? filtrados[0] : undefined)
    if (elegido) anadir(elegido)
    else if (filtrados.length === 0) toast.error(`Ningún producto coincide con «${texto}»`)
    else toast.info('Hay varios productos: elige uno de la lista')
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
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
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
        <Input
          ref={buscador}
          autoFocus
          aria-label="Buscar producto o escanear código de barras"
          placeholder="Escanea el código de barras o busca por nombre…"
          className="py-3 text-base"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={onKeyDownBuscador}
        />
        {productos.length === 0 ? (
          <p className="rounded-card bg-surface p-6 text-center text-sm text-ink-muted shadow-card">
            Aún no hay productos.{' '}
            <Link to="/stock/almacen" className="font-semibold text-primary hover:underline">
              Dalos de alta en el almacén
            </Link>
            .
          </p>
        ) : resultados.length === 0 ? (
          <p className="rounded-card bg-surface p-6 text-center text-sm text-ink-muted shadow-card">
            Ningún producto coincide con «{busqueda.trim()}».
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {resultados.map((p) => {
              const agotado = p.stock_actual <= 0
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => anadir(p)}
                    disabled={agotado}
                    className={cn(
                      'flex h-full w-full flex-col gap-1 rounded-card border border-border bg-surface p-3 text-left shadow-card transition-colors',
                      agotado ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-primary-light',
                    )}
                  >
                    <span className="line-clamp-2 text-sm font-semibold">{p.nombre}</span>
                    <span className="mt-auto flex items-baseline justify-between gap-2">
                      <span className="font-bold tabular-nums">{fmtMoneda(p.precio_venta)}</span>
                      <span className={cn('text-xs tabular-nums', agotado ? 'text-danger' : 'text-ink-muted')}>
                        {agotado ? 'Sin stock' : `${p.stock_actual} ${p.unidad || 'ud'}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {filtrados.length > resultados.length && (
          <p className="text-center text-xs text-ink-muted">
            Se muestran {resultados.length} de {filtrados.length}. Escribe más para afinar la búsqueda.
          </p>
        )}
      </section>

      <section
        aria-label="Carrito"
        className="flex flex-col gap-3 self-start rounded-card bg-surface p-4 shadow-card lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            Carrito{' '}
            {totales.unidades > 0 && (
              <span className="text-sm font-semibold tabular-nums text-ink-muted">({totales.unidades} uds.)</span>
            )}
          </h3>
          {lineas.length > 0 && (
            <Button variant="dangerGhost" size="sm" onClick={() => void vaciar()}>
              Vaciar
            </Button>
          )}
        </div>

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

        {lineas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Escanea o pulsa un producto para añadirlo.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {lineas.map((l, i) => (
              <li key={`${l.producto_id}-${i}`} className="flex flex-col gap-2 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{l.nombre}</span>
                  <span className="shrink-0 font-bold tabular-nums">{fmtMoneda(importeLinea(l))}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Quitar una unidad de ${l.nombre}`}
                      onClick={() => (l.cantidad <= 1 ? quitarLinea(i) : cambiarLinea(i, { cantidad: l.cantidad - 1 }))}
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
                  <span className="text-xs text-ink-muted">×</span>
                  <Input
                    aria-label={`Precio de ${l.nombre}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-20 px-2 py-1 text-right text-sm tabular-nums"
                    value={l.precio_unitario}
                    onChange={(e) => cambiarLinea(i, { precio_unitario: Number(e.target.value) || 0 })}
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-ink-muted">Dto.</span>
                    <DescuentoInput
                      etiqueta={`Descuento de ${l.nombre}`}
                      valor={l.descuento}
                      onChange={(descuento) => cambiarLinea(i, { descuento })}
                    />
                  </div>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    className="ml-auto"
                    aria-label={`Quitar ${l.nombre}`}
                    onClick={() => quitarLinea(i)}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lineas.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Subtotal</span>
              <span className="tabular-nums">{fmtMoneda(totales.bruto)}</span>
            </div>
            {totales.descuento_lineas > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-muted">Descuentos por producto</span>
                <span className="tabular-nums">-{fmtMoneda(totales.descuento_lineas)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Descuento a toda la venta</span>
              <DescuentoInput
                etiqueta="Descuento a toda la venta"
                valor={carrito.descuento}
                onChange={(descuento) => setCarrito((c) => ({ ...c, descuento }))}
              />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold">Total</span>
              <span className="text-2xl font-extrabold tabular-nums">{fmtMoneda(totales.total)}</span>
            </div>
          </div>
        )}

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

        {lineas.length > 0 && problema !== null && (
          <p role="alert" className="text-sm text-danger">
            {problema}
          </p>
        )}
        <Button
          className="py-3 text-base"
          disabled={lineas.length === 0 || problema !== null || cajaCerrada}
          onClick={() => setCobrando(true)}
        >
          Cobrar {lineas.length > 0 && fmtMoneda(totales.total)}
        </Button>
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
