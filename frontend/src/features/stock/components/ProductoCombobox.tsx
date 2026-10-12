import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useCreateProducto } from '../hooks/useStock'
import { normaliza } from '@/lib/format/texto'
import type { Producto } from '@/types'

interface Props {
  productos: Producto[]
  value: number
  onSelect: (producto: Producto) => void
}

const unidades = ['ud', 'bote', 'saco', 'bolsa', 'caja', 'kg', 'gr', 'l', 'ml']

export function ProductoCombobox({ productos, value, onSelect }: Props) {
  const seleccionado = productos.find((p) => p.id === value)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [creando, setCreando] = useState(false)
  const [precioCoste, setPrecioCoste] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [unidad, setUnidad] = useState('ud')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const create = useCreateProducto()

  function onBlurInput(e: FocusEvent<HTMLInputElement>) {
    const next = e.relatedTarget as Node | null
    if (next && containerRef.current?.contains(next)) return
    setOpen(false)
  }

  const filtrados = query.trim()
    ? productos.filter((p) => normaliza(p.nombre).includes(normaliza(query)))
    : productos
  const hayCoincidenciaExacta = productos.some((p) => normaliza(p.nombre) === normaliza(query))
  const puedeCrear = query.trim().length > 0 && !hayCoincidenciaExacta

  useEffect(() => {
    setHighlighted(0)
  }, [query, open])

  function abrirParaEditar() {
    setQuery(seleccionado?.nombre ?? '')
    setCreando(false)
    setOpen(true)
  }

  function seleccionar(p: Producto) {
    onSelect(p)
    setOpen(false)
    setQuery('')
  }

  const negativo = (s: string) => s.trim() !== '' && !(Number(s) >= 0)
  const errorCreacion = negativo(precioCoste) || negativo(precioVenta) ? 'El precio no puede ser negativo' : null

  function empezarCreacion() {
    setCreando(true)
    setPrecioCoste('')
    setPrecioVenta('')
    setUnidad('ud')
  }

  async function confirmarCreacion() {
    const nombre = query.trim()
    if (!nombre) return
    if (errorCreacion) return
    try {
      const producto = await create.mutateAsync({
        nombre,
        precio_coste: precioCoste.trim() === '' ? null : Number(precioCoste),
        precio_venta: precioVenta.trim() === '' ? null : Number(precioVenta),
        unidad,
      })
      seleccionar(producto)
    } catch {
      // El aviso lo muestra el onError del hook; se conserva el formulario de alta.
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (creando) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setCreando(false)
      }
      return
    }
    const total = filtrados.length + (puedeCrear ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted < filtrados.length) {
        const p = filtrados[highlighted]
        if (p) seleccionar(p)
      } else if (puedeCrear) {
        empezarCreacion()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        className="pr-9"
        value={open ? query : (seleccionado?.nombre ?? '')}
        placeholder="Buscar o crear producto…"
        onFocus={abrirParaEditar}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlurInput}
      />
      <button
        type="button"
        title="Buscar o crear producto"
        aria-label="Buscar o crear producto"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-success"
        onMouseDown={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface shadow-card"
          onMouseLeave={() => setHighlighted(-1)}
        >
          {creando ? (
            <div className="flex flex-col gap-2 p-3">
              <div className="text-[13px] font-semibold">Crear «{query.trim()}»</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Precio coste"
                  value={precioCoste}
                  onChange={(e) => setPrecioCoste(e.target.value)}
                  autoFocus
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Precio venta"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                />
              </div>
              {errorCreacion && <p role="alert" className="text-xs text-danger">{errorCreacion}</p>}
              <select
                className="w-full rounded-lg border border-border bg-app px-3 py-2 text-[15px] outline-none focus:border-primary focus:bg-surface"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
              >
                {unidades.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); setCreando(false) }}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  isLoading={create.isPending}
                  disabled={errorCreacion !== null}
                  onMouseDown={(e) => { e.preventDefault(); confirmarCreacion() }}
                >
                  Crear y usar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {filtrados.length === 0 && !puedeCrear && (
                <div className="p-3 text-[13px] text-ink-muted">Sin productos.</div>
              )}
              {filtrados.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-[14px] ${i === highlighted ? 'bg-surface-2' : ''}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    seleccionar(p)
                  }}
                >
                  {p.nombre}
                  {p.categoria && <span className="ml-2 text-[12px] text-ink-muted">{p.categoria}</span>}
                </button>
              ))}
              {puedeCrear && (
                <button
                  type="button"
                  className={`block w-full border-t border-border px-3 py-2 text-left text-[14px] font-semibold text-primary ${
                    highlighted === filtrados.length ? 'bg-surface-2' : ''
                  }`}
                  onMouseEnter={() => setHighlighted(filtrados.length)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    empezarCreacion()
                  }}
                >
                  + Crear «{query.trim()}»
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
