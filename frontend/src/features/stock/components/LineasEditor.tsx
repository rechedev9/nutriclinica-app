import type { LineaInput, Producto } from '@/types'
import { Select, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

interface Props {
  productos: Producto[]
  lineas: LineaInput[]
  onChange: (lineas: LineaInput[]) => void
  precioDe: (p: Producto) => number // precio por defecto (coste o venta)
}

export function LineasEditor({ productos, lineas, onChange, precioDe }: Props) {
  function update(i: number, patch: Partial<LineaInput>) {
    onChange(lineas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function add() {
    onChange([...lineas, { producto_id: 0, cantidad: 1, precio_unitario: 0 }])
  }
  function remove(i: number) {
    onChange(lineas.filter((_, idx) => idx !== i))
  }
  function onProducto(i: number, productoId: number) {
    const prod = productos.find((p) => p.id === productoId)
    update(i, { producto_id: productoId, precio_unitario: prod ? precioDe(prod) : 0 })
  }

  const total = lineas.reduce((s, l) => s + l.cantidad * (l.precio_unitario ?? 0), 0)

  return (
    <div className="flex flex-col gap-2">
      {lineas.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] items-center gap-2 max-md:grid-cols-2">
          <Select value={l.producto_id} onChange={(e) => onProducto(i, Number(e.target.value))}>
            <option value={0}>Producto…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            step="0.1"
            value={l.cantidad}
            onChange={(e) => update(i, { cantidad: Number(e.target.value) })}
            placeholder="Cant."
          />
          <Input
            type="number"
            step="0.01"
            value={l.precio_unitario ?? 0}
            onChange={(e) => update(i, { precio_unitario: Number(e.target.value) })}
            placeholder="€/ud"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="flex h-9 items-center justify-center rounded-lg text-danger hover:bg-danger/5"
            aria-label="Quitar línea"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + Añadir línea
        </Button>
        <div className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink-muted">
          Total: {total.toFixed(2)} €
        </div>
      </div>
    </div>
  )
}
