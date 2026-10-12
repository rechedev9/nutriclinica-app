import { useRef } from 'react'
import type { LineaInput, Producto, ProductoBase } from '@/types'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { ProductoCombobox } from './ProductoCombobox'
import { errorLinea } from '@/lib/validacion/lineas'
import { fmtMoneda } from '@/lib/format/moneda'
import type { StockPorProducto } from '@/lib/validacion/lineas'

interface Props {
  productos: Producto[]
  lineas: LineaInput[]
  onChange: (lineas: LineaInput[]) => void
  precioDe: (p: ProductoBase) => number // precio por defecto (coste o venta)
  stock?: StockPorProducto // solo en ventas: avisa si la cantidad lo supera
}

export function LineasEditor({ productos, lineas, onChange, precioDe, stock }: Props) {
  // Claves estables por fila (no el índice): así borrar una línea intermedia no
  // reutiliza el estado/foco de la fila contigua. Se sincronizan con add/remove
  // y se reconstruyen solo si la longitud cambia por fuera (reset del modal).
  const keys = useRef<string[]>([])
  const counter = useRef(0)
  const nuevaKey = () => `l${(counter.current += 1)}`
  if (keys.current.length !== lineas.length) {
    keys.current = lineas.map((_, i) => keys.current[i] ?? nuevaKey())
  }

  function update(i: number, patch: Partial<LineaInput>) {
    onChange(lineas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function add() {
    keys.current = [...keys.current, nuevaKey()]
    onChange([...lineas, { producto_id: 0, cantidad: 1, precio_unitario: 0 }])
  }
  function remove(i: number) {
    keys.current = keys.current.filter((_, idx) => idx !== i)
    onChange(lineas.filter((_, idx) => idx !== i))
  }
  function onProducto(i: number, prod: ProductoBase) {
    update(i, { producto_id: prod.id, precio_unitario: precioDe(prod) })
  }

  const total = lineas.reduce((s, l) => s + l.cantidad * (l.precio_unitario ?? 0), 0)

  return (
    <div className="flex flex-col gap-2">
      {lineas.length > 0 && (
        <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 max-md:hidden">
          <div />
          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Cantidad</div>
          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Precio €</div>
          <div />
        </div>
      )}
      {lineas.map((l, i) => {
        const problema = errorLinea(l, lineas, stock)
        return (
          <div key={keys.current[i]} className="flex flex-col gap-1">
            <div className="grid grid-cols-[1fr_80px_100px_36px] items-center gap-2 max-md:grid-cols-2">
              <ProductoCombobox productos={productos} value={l.producto_id} onSelect={(p) => onProducto(i, p)} />
              <Input
                type="number"
                step="0.1"
                min="0"
                value={l.cantidad}
                onChange={(e) => update(i, { cantidad: Number(e.target.value) })}
                placeholder="Cant."
              />
              <Input
                type="number"
                step="0.01"
                min="0"
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>
            {problema && (
              <p role="alert" className="text-xs text-danger">
                {problema}
              </p>
            )}
          </div>
        )
      })}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + Añadir línea
        </Button>
        <div className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink-muted">
          Total: {fmtMoneda(total)}
        </div>
      </div>
    </div>
  )
}
