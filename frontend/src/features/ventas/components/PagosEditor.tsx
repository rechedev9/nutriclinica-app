import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { fmtMoneda } from '@/lib/format/moneda'
import { cn } from '@/lib/cn'
import { METODOS, etiquetaMetodo, importeEditable, leerImporte, sumaPagos, sumarImportes } from '../carrito'
import type { MetodoPago, PagoInput } from '@/types'

export interface PagoEditable {
  metodo: MetodoPago
  importe: string
}

export function pagosDe(filas: PagoEditable[]): PagoInput[] {
  return filas.map((f) => ({ metodo: f.metodo, importe: leerImporte(f.importe) ?? 0 }))
}

// Reparto del cobro entre varios métodos (pago mixto o corrección de una venta).
export function PagosEditor(props: {
  filas: PagoEditable[]
  onChange: (filas: PagoEditable[]) => void
  total: number
}) {
  const { filas, onChange, total } = props
  const falta = sumarImportes([total, -sumaPagos(pagosDe(filas))])

  function cambiar(i: number, cambio: Partial<PagoEditable>) {
    onChange(filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)))
  }

  function anadir() {
    const usado = new Set(filas.map((f) => f.metodo))
    const metodo = METODOS.find((m) => !usado.has(m.valor))?.valor ?? 'efectivo'
    onChange([...filas, { metodo, importe: falta > 0 ? importeEditable(falta) : '' }])
  }

  return (
    <div className="flex flex-col gap-2">
      {filas.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_120px_36px] items-center gap-2">
          <Select
            aria-label="Método de pago"
            value={f.metodo}
            onChange={(e) => {
              const metodo = METODOS.find((m) => m.valor === e.target.value)?.valor
              if (metodo) cambiar(i, { metodo })
            }}
          >
            {METODOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </Select>
          <Input
            aria-label={`Importe en ${etiquetaMetodo(f.metodo).toLowerCase()}`}
            inputMode="decimal"
            className="text-right tabular-nums"
            value={f.importe}
            onChange={(e) => cambiar(i, { importe: e.target.value })}
          />
          <Button
            type="button"
            variant="dangerGhost"
            size="sm"
            aria-label={`Quitar pago en ${etiquetaMetodo(f.metodo).toLowerCase()}`}
            onClick={() => onChange(filas.filter((_, j) => j !== i))}
          >
            ✕
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={anadir} disabled={filas.length >= METODOS.length}>
          + Añadir pago
        </Button>
        <span className={cn('text-sm font-semibold tabular-nums', falta === 0 ? 'text-success' : 'text-danger')}>
          {falta === 0 ? 'Cuadra con el total' : falta > 0 ? `Falta ${fmtMoneda(falta)}` : `Sobra ${fmtMoneda(-falta)}`}
        </span>
      </div>
    </div>
  )
}
