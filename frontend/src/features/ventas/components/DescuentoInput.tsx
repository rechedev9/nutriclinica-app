import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { Descuento, TipoDescuento } from '../carrito'

const TIPOS: { valor: TipoDescuento; etiqueta: string }[] = [
  { valor: 'pct', etiqueta: '%' },
  { valor: 'eur', etiqueta: '€' },
]

export function DescuentoInput(props: { valor: Descuento; onChange: (d: Descuento) => void; etiqueta: string }) {
  const { valor, onChange, etiqueta } = props
  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={etiqueta}
        type="number"
        min="0"
        step="0.01"
        className="w-20 px-2 py-1 text-right text-sm tabular-nums"
        value={valor.valor === 0 ? '' : valor.valor}
        placeholder="0"
        onChange={(e) => onChange({ ...valor, valor: Number(e.target.value) || 0 })}
      />
      <div
        className="flex overflow-hidden rounded-lg border border-border"
        role="group"
        aria-label={`${etiqueta}: tipo`}
      >
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            aria-pressed={valor.tipo === t.valor}
            onClick={() => onChange({ ...valor, tipo: t.valor })}
            className={cn(
              'px-2 py-1 text-xs font-bold',
              valor.tipo === t.valor
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-ink-muted hover:bg-surface-2',
            )}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
