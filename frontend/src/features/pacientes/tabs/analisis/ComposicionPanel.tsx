import { fmtFecha } from '@/lib/format/fecha'

interface Composicion {
  pesoGraso: number
  pesoMagro: number
  // Fecha de la revisión de origen cuando no es la última; null si lo es.
  notaFecha: string | null
}

interface DatoImc {
  valor: number
  notaFecha: string | null
}

interface Props {
  composicion: Composicion | null
  imc: DatoImc | null
}

const IMC_MIN = 14
const IMC_MAX = 40
const ZONAS_IMC = [
  { label: 'Infrapeso', color: '#60a5fa', width: 17.3 },
  { label: 'Normal', color: '#34d399', width: 25.0 },
  { label: 'Sobrepeso', color: '#fbbf24', width: 19.2 },
  { label: 'Obesidad', color: '#f87171', width: 38.5 },
]

function Nota({ fecha }: { fecha: string | null }) {
  if (fecha === null) return null
  return <span className="text-[11px] font-normal text-ink-muted">dato del {fmtFecha(fecha)}</span>
}

export function ComposicionPanel({ composicion, imc }: Props) {
  const total = composicion ? composicion.pesoGraso + composicion.pesoMagro : 0
  const pctMagro = composicion && total > 0 ? (composicion.pesoMagro / total) * 100 : 50
  const imcPct = imc ? Math.min(Math.max(((imc.valor - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100, 0), 100) : null

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-4 shadow-card">
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-sm font-bold">Composición corporal</span>
          <Nota fecha={composicion?.notaFecha ?? null} />
        </div>
        {composicion ? (
          <>
            <div className="h-3 overflow-hidden rounded-full" style={{ background: '#fde68a' }}>
              <div
                className="h-full rounded-full transition-[width] duration-[600ms] ease-out"
                style={{ width: `${pctMagro}%`, background: 'linear-gradient(90deg,#0F7B92,#2DD4BF)' }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#0F7B92' }} />
                <span className="font-semibold">{pctMagro.toFixed(1)}%</span>
                <span className="text-ink-muted">Masa magra: {composicion.pesoMagro.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#fbbf24' }} />
                <span className="font-semibold">{(100 - pctMagro).toFixed(1)}%</span>
                <span className="text-ink-muted">Masa grasa: {composicion.pesoGraso.toFixed(1)} kg</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-[13px] text-ink-muted">Sin pliegues registrados</div>
        )}
      </div>

      {imc && imcPct !== null && (
        <div className="border-t border-border pt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">Clasificación IMC</span>
            <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs font-bold tabular-nums">{imc.valor}</span>
            <Nota fecha={imc.notaFecha} />
          </div>
          <div className="relative">
            <div className="flex h-4 overflow-hidden rounded-full">
              {ZONAS_IMC.map((z) => (
                <div key={z.label} style={{ width: `${z.width}%`, background: z.color }} />
              ))}
            </div>
            <div
              className="absolute top-0 h-4 w-1 -translate-x-1/2 rounded-full bg-ink shadow-sm"
              style={{ left: `${imcPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex text-[10px] sm:text-xs">
            {ZONAS_IMC.map((z) => (
              <div key={z.label} style={{ width: `${z.width}%`, color: z.color }} className="text-center font-bold">
                {z.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
