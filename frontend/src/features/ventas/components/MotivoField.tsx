import { Textarea } from '@/components/ui/Field'

// Motivo obligatorio con atajos para los casos habituales; queda en la venta y en la auditoría.
export function MotivoField(props: {
  valor: string
  onChange: (motivo: string) => void
  sugerencias: string[]
  etiqueta: string
}) {
  const { valor, onChange, sugerencias, etiqueta } = props
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-muted">{etiqueta}</span>
      <div className="flex flex-wrap gap-1.5">
        {sugerencias.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:border-primary hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>
      <Textarea
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe el motivo"
      />
    </div>
  )
}
