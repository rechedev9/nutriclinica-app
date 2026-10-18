import { forwardRef, useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Field'
import { fmtMoneda } from '@/lib/format/moneda'
import { normaliza } from '@/lib/format/texto'
import { cn } from '@/lib/cn'
import { leerEscaneo } from '../caja-rapida'
import type { AlmacenRow } from '@/types'

const MAX_RESULTADOS = 30

function coincide(producto: AlmacenRow, texto: string): boolean {
  if (producto.codigo_barras !== null && producto.codigo_barras.startsWith(texto)) return true
  return normaliza(producto.nombre).includes(normaliza(texto))
}

type Props = {
  productos: readonly AlmacenRow[]
  // Se ofrecen con el buscador vacío, antes de escribir nada.
  sugeridos: readonly AlmacenRow[]
  tituloSugeridos: string
  onElegir: (producto: AlmacenRow, cantidad: number) => void
}

export const BuscadorProductos = forwardRef<HTMLInputElement, Props>(function BuscadorProductos(
  { productos, sugeridos, tituloSugeridos, onElegir },
  ref,
) {
  const lista = useId()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const { cantidad, buscado } = leerEscaneo(texto)
  const opciones = (buscado === '' ? sugeridos : productos.filter((p) => coincide(p, buscado))).slice(0, MAX_RESULTADOS)
  const indice = Math.min(activo, Math.max(opciones.length - 1, 0))
  const visible = abierto && (opciones.length > 0 || buscado !== '')

  function elegir(p: AlmacenRow) {
    if (p.stock_actual <= 0) {
      toast.error(`No queda stock de «${p.nombre}»`)
      return
    }
    onElegir(p, cantidad)
    setTexto('')
    setActivo(0)
    setAbierto(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setAbierto(true)
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setActivo((indice + paso + opciones.length) % Math.max(opciones.length, 1))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (texto !== '') setTexto('')
      else setAbierto(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Un lector de códigos teclea el código entero y pulsa Intro.
      const exacto = buscado === '' ? undefined : productos.find((p) => p.codigo_barras === buscado)
      const elegido = exacto ?? opciones[indice]
      if (elegido) elegir(elegido)
      else if (buscado !== '') toast.error(`Ningún producto coincide con «${buscado}»`)
    }
  }

  return (
    <div className="relative">
      <Input
        ref={ref}
        autoFocus
        role="combobox"
        aria-expanded={visible}
        aria-controls={lista}
        aria-autocomplete="list"
        aria-activedescendant={visible && opciones[indice] ? `${lista}-${opciones[indice].id}` : undefined}
        aria-label="Añadir producto"
        placeholder="Añadir producto: escribe su nombre…"
        className="py-3 text-base"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setActivo(0)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
      />
      {visible && (
        <ul
          id={lista}
          role="listbox"
          aria-label="Productos"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-[360px] overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md"
        >
          {buscado === '' && (
            <li role="presentation" className="px-3 pt-1 pb-1.5 text-xs font-semibold text-ink-muted">
              {tituloSugeridos}
            </li>
          )}
          {opciones.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-ink-muted">
              Ningún producto coincide con «{buscado}».
            </li>
          )}
          {opciones.map((p, i) => {
            const agotado = p.stock_actual <= 0
            return (
              <li
                key={p.id}
                id={`${lista}-${p.id}`}
                role="option"
                aria-selected={i === indice}
                aria-disabled={agotado}
                // Sin esto el blur del buscador cierra la lista antes de que llegue el clic.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(p)}
                className={cn(
                  'flex cursor-pointer items-baseline gap-3 px-3 py-2 text-sm',
                  i === indice && 'bg-primary-light',
                  agotado && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{p.nombre}</span>
                <span className={cn('shrink-0 text-xs tabular-nums', agotado ? 'text-danger' : 'text-ink-muted')}>
                  {agotado ? 'Sin stock' : `Quedan ${p.stock_actual} ${p.unidad || 'ud'}`}
                </span>
                <span className="w-20 shrink-0 text-right font-bold tabular-nums">{fmtMoneda(p.precio_venta)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
})
