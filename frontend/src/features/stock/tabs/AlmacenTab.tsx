import { useDeferredValue, useMemo, useState } from 'react'
import { useAlmacen, useProductos, useDeleteProducto } from '../hooks/useStock'
import { ProductoModal } from '../components/ProductoModal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { fmtMoneda } from '@/lib/format/moneda'
import { fmtFecha } from '@/lib/format/fecha'
import type { AlmacenRow, Producto } from '@/types'

type SortKey =
  | 'nombre'
  | 'categoria'
  | 'proveedor_nombre'
  | 'estado'
  | 'stock_actual'
  | 'precio_coste'
  | 'precio_venta'
  | 'margen'
  | 'valor_stock'
  | 'creado'

function valorOrden(p: AlmacenRow, key: SortKey): string | number {
  switch (key) {
    case 'nombre':
      return p.nombre.toLowerCase()
    case 'categoria':
      return (p.categoria ?? '').toLowerCase()
    case 'proveedor_nombre':
      return (p.proveedor_nombre ?? '').toLowerCase()
    case 'estado':
      return p.stock_actual <= 0 ? 0 : p.stock_actual <= p.stock_minimo ? 1 : 2
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
    case 'creado':
      return p.creado ?? ''
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
      className={cn('p-3 font-semibold cursor-pointer select-none hover:text-ink', align === 'right' && 'text-right')}
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
      <div className={cn('mt-1 text-2xl font-extrabold', danger && 'text-danger')}>{value}</div>
    </div>
  )
}

// estadoStock clasifica un producto por su stock frente al mínimo.
function estadoStock(actual: number, minimo: number): { label: string; cls: string } {
  if (actual <= 0) return { label: 'Agotado', cls: 'bg-danger/10 text-danger' }
  if (actual <= minimo) return { label: 'Stock bajo', cls: 'bg-amber-500/10 text-amber-500' }
  return { label: 'En stock', cls: 'bg-success/10 text-success' }
}

const cajaIcono = (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08V12" />
  </svg>
)

export function AlmacenTab() {
  const { data: almacen, isLoading } = useAlmacen()
  const { data: productos = [] } = useProductos()
  const del = useDeleteProducto()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | undefined>()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)
  const deferredQ = useDeferredValue(q)

  function onSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const rows = useMemo(() => almacen ?? [], [almacen])
  const categorias = useMemo(
    () => [...new Set(rows.map((p) => p.categoria).filter((c): c is string => !!c))].sort(),
    [rows],
  )
  const filtradas = useMemo(() => {
    const term = deferredQ.trim().toLowerCase()
    return rows.filter((p) => {
      const coincideTexto =
        !term || p.nombre.toLowerCase().includes(term) || (p.categoria ?? '').toLowerCase().includes(term)
      const coincideCat = !cat || p.categoria === cat
      return coincideTexto && coincideCat
    })
  }, [rows, deferredQ, cat])
  const ordenadas = useMemo(() => {
    if (!sort) return filtradas
    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    return [...filtradas].sort((a, b) => {
      const va = valorOrden(a, key)
      const vb = valorOrden(b, key)
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * factor
      return ((va as number) - (vb as number)) * factor
    })
  }, [filtradas, sort])

  if (isLoading) return <CenteredSpinner />

  const sinStock = rows.filter((p) => p.stock_actual <= p.stock_minimo).length
  const valCoste = rows.reduce((s, p) => s + Math.max(0, p.stock_actual) * p.precio_coste, 0)
  const valVenta = rows.reduce((s, p) => s + Math.max(0, p.stock_actual) * p.precio_venta, 0)

  function nuevo() {
    setEditing(undefined)
    setModalOpen(true)
  }

  async function onDelete(id: number) {
    const ok = await confirm({ title: '¿Eliminar producto?', confirmText: 'Eliminar', danger: true })
    if (ok) await del.mutateAsync(id)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Productos" value={String(rows.length)} />
        <Kpi label="Alertas de mínimo" value={String(sinStock)} danger={sinStock > 0} />
        <Kpi label="Valor a coste" value={fmtMoneda(valCoste)} />
        <Kpi label="Valor a venta" value={fmtMoneda(valVenta)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Productos</h3>
        <div className="flex items-center gap-2">
          {categorias.length > 0 && (
            <select
              className="rounded-lg border border-border bg-app py-2 pl-3 pr-8 text-[15px] outline-none focus:border-primary focus:bg-surface"
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
            <div className="relative">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="w-56 rounded-lg border border-border bg-app py-2 pl-9 pr-3 text-[15px] outline-none focus:border-primary focus:bg-surface"
                placeholder="Buscar producto…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          <Button onClick={nuevo}>+ Nuevo producto</Button>
        </div>
      </div>

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
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <ThOrdenable label="Producto" sortKey="nombre" sort={sort} onSort={onSort} />
                <ThOrdenable label="Categoría" sortKey="categoria" sort={sort} onSort={onSort} />
                <ThOrdenable label="Proveedor" sortKey="proveedor_nombre" sort={sort} onSort={onSort} />
                <ThOrdenable label="Estado" sortKey="estado" sort={sort} onSort={onSort} />
                <ThOrdenable label="Stock" sortKey="stock_actual" align="right" sort={sort} onSort={onSort} />
                <ThOrdenable label="Coste" sortKey="precio_coste" align="right" sort={sort} onSort={onSort} />
                <ThOrdenable label="Venta" sortKey="precio_venta" align="right" sort={sort} onSort={onSort} />
                <ThOrdenable label="Margen" sortKey="margen" align="right" sort={sort} onSort={onSort} />
                <ThOrdenable label="Valor stock" sortKey="valor_stock" align="right" sort={sort} onSort={onSort} />
                <ThOrdenable label="Alta" sortKey="creado" sort={sort} onSort={onSort} />
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((p) => {
                const est = estadoStock(p.stock_actual, p.stock_minimo)
                const margenU = p.precio_venta - p.precio_coste
                const margenPct = p.precio_venta > 0 ? Math.round((margenU / p.precio_venta) * 100) : null
                const valorStock = Math.max(0, p.stock_actual) * p.precio_coste
                return (
                  <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2">
                    <td className="p-3 font-semibold">{p.nombre}</td>
                    <td className="p-3 text-ink-muted">{p.categoria ?? '—'}</td>
                    <td className="p-3 text-ink-muted">{p.proveedor_nombre ?? '—'}</td>
                    <td className="p-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold', est.cls)}>
                        {est.label}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums">
                      {p.stock_actual} <span className="font-normal text-ink-muted">{p.unidad ?? 'ud'}</span>
                      {p.stock_minimo > 0 && (
                        <div className="text-[11px] font-normal text-ink-muted">mín. {p.stock_minimo}</div>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{fmtMoneda(p.precio_coste)}</td>
                    <td className="p-3 text-right tabular-nums">{fmtMoneda(p.precio_venta)}</td>
                    <td className={cn('p-3 text-right tabular-nums', margenU < 0 && 'text-danger')}>
                      {fmtMoneda(margenU)}
                      {margenPct != null && <span className="ml-1 text-[12px] text-ink-muted">({margenPct}%)</span>}
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">{fmtMoneda(valorStock)}</td>
                    <td className="p-3 text-ink-muted">{fmtFecha(p.creado)}</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(productos.find((x) => x.id === p.id))
                          setModalOpen(true)
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDelete(p.id)}>
                        Borrar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductoModal open={modalOpen} onClose={() => setModalOpen(false)} producto={editing} />
    </div>
  )
}
