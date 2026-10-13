import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { useAlmacen, useProductos, useDeleteProducto } from '../hooks/useStock'
import { ProductoModal } from '../components/ProductoModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { fmtMoneda } from '@/lib/format/moneda'
import type { AlmacenRow, Producto } from '@/types'
import { intentar } from '@/lib/api/intentar'
import { fmtFecha } from '@/lib/format/fecha'
import { normaliza } from '@/lib/format/texto'
import {
  coincideEstado,
  contarPorEstado,
  estadoDe,
  ordenPorDefecto,
  prioridadEstado,
  type EstadoStock,
  type FiltroEstado,
} from '../estado-almacen'

type SortKey = 'nombre' | 'estado' | 'stock_actual' | 'precio_coste' | 'precio_venta' | 'margen' | 'valor_stock'

function valorOrden(p: AlmacenRow, key: SortKey): string | number {
  switch (key) {
    case 'nombre':
      return p.nombre.toLowerCase()
    case 'estado':
      return prioridadEstado(estadoDe(p.stock_actual, p.stock_minimo))
    case 'stock_actual':
      return p.stock_actual
    case 'precio_coste':
      return p.precio_coste
    case 'precio_venta':
      return p.precio_venta
    case 'margen':
      return p.precio_venta - p.precio_coste
    case 'valor_stock':
      return Math.max(0, p.stock_actual) * p.precio_coste
  }
}

function ThOrdenable({
  label,
  sortKey,
  align,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  align?: 'right'
  sort: { key: SortKey; dir: 'asc' | 'desc' } | null
  onSort: (key: SortKey) => void
}) {
  const activo = sort?.key === sortKey
  return (
    <th
      className={cn(
        'px-3 py-2.5 font-semibold cursor-pointer select-none transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink',
        align === 'right' && 'text-right',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {label}
        <span className={cn('text-[10px]', !activo && 'opacity-0')}>{sort?.dir === 'desc' ? '▼' : '▲'}</span>
      </span>
    </th>
  )
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold tabular-nums', danger && 'text-danger')}>{value}</div>
    </div>
  )
}

function KpiAlertas({ value, activo, onClick }: { value: number; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        'rounded-card border p-4 text-left shadow-card transition-colors duration-150 ease-out',
        activo
          ? 'border-primary/30 bg-primary-light'
          : 'border-transparent bg-surface [@media(hover:hover)]:hover:bg-surface-2',
      )}
    >
      <div className="text-[13px] text-ink-muted">Alertas de mínimo</div>
      <div className={cn('mt-1 text-2xl font-extrabold tabular-nums', value > 0 && 'text-danger')}>{value}</div>
      <div className="mt-0.5 text-[12px] text-ink-muted">
        {activo ? 'Mostrando solo alertas' : 'Pulsa para filtrar'}
      </div>
    </button>
  )
}

function Filtro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors duration-150 ease-out',
        activo
          ? 'border-primary/30 bg-primary-light text-primary'
          : 'border-border bg-surface text-ink-muted [@media(hover:hover)]:hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

const ETIQUETA_ESTADO: Record<EstadoStock, { label: string; cls: string }> = {
  agotado: { label: 'Agotado', cls: 'bg-danger/10 text-danger' },
  bajo: { label: 'Bajo mínimo', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ok: { label: 'En stock', cls: 'text-ink-muted' },
}

function EstadoBadge({ estado }: { estado: EstadoStock }) {
  const { label, cls } = ETIQUETA_ESTADO[estado]
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold', cls)}>
      {label}
    </span>
  )
}

function Acciones({ onEditar, onBorrar }: { onEditar: () => void; onBorrar: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      <Button variant="ghost" size="sm" onClick={onEditar}>
        Editar
      </Button>
      <Button variant="dangerGhost" size="sm" onClick={onBorrar}>
        Borrar
      </Button>
    </div>
  )
}

function secundaria(p: AlmacenRow): string {
  return [p.categoria, p.proveedor_nombre].filter((x): x is string => !!x).join(' · ')
}

const cajaIcono = (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08V12" />
  </svg>
)

export function AlmacenTab() {
  const { data: almacen, isLoading, isError, error, refetch, isFetching } = useAlmacen()
  const {
    data: productos = [],
    isError: errorProductos,
    error: errProductos,
    refetch: refetchProductos,
  } = useProductos()
  const del = useDeleteProducto()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | undefined>()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const deferredQ = useDeferredValue(q)

  // Ascendente, descendente y, al tercer clic, de vuelta al orden por defecto (alertas primero).
  function onSort(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' }
      return prev.dir === 'asc' ? { key, dir: 'desc' } : null
    })
  }

  const rows = useMemo(() => almacen ?? [], [almacen])
  const categorias = useMemo(
    () => [...new Set(rows.map((p) => p.categoria).filter((c): c is string => !!c))].toSorted(),
    [rows],
  )
  const filtradas = useMemo(() => {
    const term = normaliza(deferredQ)
    return rows.filter((p) => {
      const coincideTexto = !term || normaliza(p.nombre).includes(term) || normaliza(p.categoria ?? '').includes(term)
      const coincideCat = !cat || p.categoria === cat
      return coincideTexto && coincideCat && coincideEstado(p, estado)
    })
  }, [rows, deferredQ, cat, estado])
  const ordenadas = useMemo(() => {
    if (!sort) return ordenPorDefecto(filtradas)
    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    return filtradas.toSorted((a, b) => {
      const va = valorOrden(a, key)
      const vb = valorOrden(b, key)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb)) * factor
    })
  }, [filtradas, sort])

  if (isLoading) return <CenteredSpinner />
  if (isError || errorProductos) {
    return (
      <ErrorState
        error={isError ? error : errProductos}
        onRetry={() => void Promise.all([refetch(), refetchProductos()])}
        isRetrying={isFetching}
        recurso="el almacén"
      />
    )
  }

  const cuentas = contarPorEstado(rows)
  const sinStock = cuentas.agotado + cuentas.bajo
  const valCoste = rows.reduce((s, p) => s + Math.max(0, p.stock_actual) * p.precio_coste, 0)
  const valVenta = rows.reduce((s, p) => s + Math.max(0, p.stock_actual) * p.precio_venta, 0)

  function nuevo() {
    setEditing(undefined)
    setModalOpen(true)
  }

  function editar(id: number) {
    setEditing(productos.find((x) => x.id === id))
    setModalOpen(true)
  }

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar producto?', confirmText: 'Eliminar', danger: true })
    if (ok) await intentar(del.mutateAsync(id))
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Productos" value={String(rows.length)} />
        <KpiAlertas
          value={sinStock}
          activo={estado === 'alertas'}
          onClick={() => setEstado((e) => (e === 'alertas' ? 'todos' : 'alertas'))}
        />
        <Kpi label="Valor a coste" value={fmtMoneda(valCoste)} />
        <Kpi label="Valor a venta" value={fmtMoneda(valVenta)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Productos</h3>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {categorias.length > 0 && (
            <select
              className="rounded-lg border border-border bg-app py-2 pl-3 pr-8 text-[15px] outline-hidden focus:border-primary focus:bg-surface"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {rows.length > 0 && (
            <div className="relative min-w-44 flex-1 sm:min-w-0 sm:flex-none">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="w-full rounded-lg sm:w-56 border border-border bg-app py-2 pl-9 pr-3 text-[15px] outline-hidden focus:border-primary focus:bg-surface"
                placeholder="Buscar producto…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          <Button onClick={nuevo}>+ Nuevo producto</Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filtro activo={estado === 'todos'} onClick={() => setEstado('todos')}>
            Todos
          </Filtro>
          <Filtro activo={estado === 'alertas'} onClick={() => setEstado('alertas')}>
            Alertas <span className="tabular-nums">{sinStock}</span>
          </Filtro>
          <Filtro activo={estado === 'agotado'} onClick={() => setEstado('agotado')}>
            Agotados <span className="tabular-nums">{cuentas.agotado}</span>
          </Filtro>
          <Filtro activo={estado === 'bajo'} onClick={() => setEstado('bajo')}>
            Bajo mínimo <span className="tabular-nums">{cuentas.bajo}</span>
          </Filtro>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={cajaIcono}
          title="Tu almacén está vacío"
          subtitle="Da de alta tus productos para controlar stock, costes y márgenes."
          action={<Button onClick={nuevo}>+ Nuevo producto</Button>}
        />
      ) : filtradas.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">Ningún producto coincide con el filtro.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card bg-surface shadow-card lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  <ThOrdenable label="Producto" sortKey="nombre" sort={sort} onSort={onSort} />
                  <ThOrdenable label="Estado" sortKey="estado" sort={sort} onSort={onSort} />
                  <ThOrdenable label="Stock" sortKey="stock_actual" align="right" sort={sort} onSort={onSort} />
                  <ThOrdenable label="Coste" sortKey="precio_coste" align="right" sort={sort} onSort={onSort} />
                  <ThOrdenable label="Venta" sortKey="precio_venta" align="right" sort={sort} onSort={onSort} />
                  <ThOrdenable label="Margen" sortKey="margen" align="right" sort={sort} onSort={onSort} />
                  <ThOrdenable label="Valor stock" sortKey="valor_stock" align="right" sort={sort} onSort={onSort} />
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((p) => {
                  const est = estadoDe(p.stock_actual, p.stock_minimo)
                  const margenU = p.precio_venta - p.precio_coste
                  const margenPct = p.precio_venta > 0 ? Math.round((margenU / p.precio_venta) * 100) : null
                  const valorStock = Math.max(0, p.stock_actual) * p.precio_coste
                  const sec = secundaria(p)
                  return (
                    <tr
                      key={p.id}
                      title={p.creado ? `Alta: ${fmtFecha(p.creado)}` : undefined}
                      className="border-b border-border transition-colors duration-150 ease-out last:border-0 [@media(hover:hover)]:hover:bg-surface-2"
                    >
                      <td className="max-w-[20rem] px-3 py-2.5">
                        <div className="truncate font-semibold" title={p.nombre}>
                          {p.nombre}
                        </div>
                        {sec && (
                          <div className="truncate text-[12px] text-ink-muted" title={sec}>
                            {sec}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <EstadoBadge estado={est} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">
                        {p.stock_actual} <span className="font-normal text-ink-muted">{p.unidad ?? 'ud'}</span>
                        {p.stock_minimo > 0 && (
                          <div className="text-[11px] font-normal text-ink-muted">mín. {p.stock_minimo}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                        {fmtMoneda(p.precio_coste)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                        {fmtMoneda(p.precio_venta)}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-3 py-2.5 text-right tabular-nums',
                          margenU < 0 && 'text-danger',
                        )}
                      >
                        {fmtMoneda(margenU)}
                        {margenPct != null && <div className="text-[12px] text-ink-muted">{margenPct}%</div>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">
                        {fmtMoneda(valorStock)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Acciones onEditar={() => editar(p.id)} onBorrar={() => void onDelete(p.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 lg:hidden">
            {ordenadas.map((p) => {
              const est = estadoDe(p.stock_actual, p.stock_minimo)
              const margenU = p.precio_venta - p.precio_coste
              const sec = secundaria(p)
              return (
                <li key={p.id} className="rounded-card bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words font-semibold">{p.nombre}</div>
                      {sec && <div className="break-words text-[12px] text-ink-muted">{sec}</div>}
                    </div>
                    <EstadoBadge estado={est} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm tabular-nums">
                    <div>
                      <dt className="text-[12px] text-ink-muted">Existencias</dt>
                      <dd className="font-bold">
                        {p.stock_actual} <span className="font-normal text-ink-muted">{p.unidad ?? 'ud'}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[12px] text-ink-muted">Venta</dt>
                      <dd>{fmtMoneda(p.precio_venta)}</dd>
                    </div>
                    <div>
                      <dt className="text-[12px] text-ink-muted">Margen</dt>
                      <dd className={cn(margenU < 0 && 'text-danger')}>{fmtMoneda(margenU)}</dd>
                    </div>
                  </dl>
                  <div className="mt-2 flex justify-end">
                    <Acciones onEditar={() => editar(p.id)} onBorrar={() => void onDelete(p.id)} />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <ProductoModal open={modalOpen} onClose={() => setModalOpen(false)} producto={editing} />
    </div>
  )
}
