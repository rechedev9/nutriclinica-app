import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Chevron } from '@/components/ui/Chevron'
import { cn } from '@/lib/cn'
import { delDia, elResto, etiquetaMas } from './barra-del-dia'
import type { Pestana } from './barra-del-dia'

const enlace = 'whitespace-nowrap border-b-2 px-4 py-3.5 text-[15px] font-semibold transition-colors'
const activa = 'border-primary text-primary'
const inactiva = 'border-transparent text-ink-muted hover:text-ink'

function Enlaces({ pestanas }: { pestanas: readonly Pestana[] }) {
  return pestanas.map((t) => (
    <Link
      key={t.label}
      to={t.to}
      className={enlace}
      activeProps={{ className: activa }}
      inactiveProps={{ className: inactiva }}
    >
      {t.label}
    </Link>
  ))
}

function Mas({ resto, activo, ruta }: { resto: readonly Pestana[]; activo: boolean; ruta: string }) {
  const raiz = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [vista, setVista] = useState(ruta)
  if (vista !== ruta) {
    setVista(ruta)
    setAbierto(false)
  }

  useEffect(() => {
    if (!abierto) return
    function alPulsarFuera(e: PointerEvent) {
      const nodo = e.target
      if (!(nodo instanceof Node) || raiz.current?.contains(nodo)) return
      setAbierto(false)
    }
    function alPulsarEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setAbierto(false)
      boton.current?.focus()
    }
    document.addEventListener('pointerdown', alPulsarFuera)
    document.addEventListener('keydown', alPulsarEscape)
    return () => {
      document.removeEventListener('pointerdown', alPulsarFuera)
      document.removeEventListener('keydown', alPulsarEscape)
    }
  }, [abierto])

  const etiqueta = etiquetaMas(resto, ruta)

  return (
    <div ref={raiz} className="relative ml-auto">
      <button
        ref={boton}
        type="button"
        className={cn(enlace, 'inline-flex items-center gap-1', activo ? activa : inactiva)}
        aria-expanded={abierto}
        aria-controls="mas-pestanas"
        onClick={() => setAbierto((v) => !v)}
      >
        {etiqueta}
        <Chevron abierto={abierto} />
      </button>
      {abierto && (
        <div
          id="mas-pestanas"
          className="absolute top-full right-0 z-50 mt-1 flex min-w-44 flex-col rounded-card border border-border bg-surface p-1 shadow-md"
        >
          {resto.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              className="rounded-lg px-3 py-2.5 text-[15px] font-semibold"
              activeProps={{ className: 'bg-primary-light text-primary' }}
              inactiveProps={{ className: 'text-ink hover:bg-surface-2' }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function BarraDelDia({
  pestanas,
  ocultarAlImprimir = false,
}: {
  pestanas: readonly Pestana[]
  ocultarAlImprimir?: boolean
}) {
  const ruta = useRouterState({ select: (s) => s.location.pathname })
  const dia = delDia(pestanas)
  const resto = elResto(pestanas)
  const restoActivo = resto.some((p) => p.to === ruta)
  const impresion = ocultarAlImprimir ? 'print-hide' : undefined

  return (
    <>
      <div className={cn('hidden gap-1 border-b border-border bg-surface px-6 md:flex', impresion)}>
        <Enlaces pestanas={pestanas} />
      </div>
      <div className={cn('flex flex-wrap gap-1 border-b border-border bg-surface px-3 md:hidden', impresion)}>
        <Enlaces pestanas={dia} />
        {resto.length > 0 && <Mas resto={resto} activo={restoActivo} ruta={ruta} />}
      </div>
    </>
  )
}
