import { useMemo, useState } from 'react'
// Registro de Chart.js junto a la pestaña que lo usa: así Chart.js queda en el
// chunk diferido de Análisis y no se carga en el bundle inicial.
import '@/lib/chart/chartSetup'
import { usePacienteContext } from '../context'
import { useRevisiones } from '../../hooks/useRevisiones'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { calcEdad } from '@/lib/format/fecha'
import { calcIMC, calcGrasaDW, clasificarGrasa, pesoGraso, pesoMagro } from '@/lib/calc'
import { buildMonthMultiData } from '@/lib/chart/buildMonthData'
import { ALL_MEDIDAS, PLIEGUES } from '@/types'
import type { Revision } from '@/types'
import { ChartPesoGrasa } from './charts/ChartPesoGrasa'
import { ChartPerimetros, type Serie } from './charts/ChartPerimetros'
import { ChartPliegues } from './charts/ChartPliegues'
import { PerfilCorporal } from './PerfilCorporal'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { cn } from '@/lib/cn'

function KpiCard({
  label,
  rawValue,
  unit,
  sub,
  decimals = 1,
}: {
  label: string
  rawValue: number | null
  unit?: string
  sub?: React.ReactNode
  decimals?: number
}) {
  const animated = useCountUp(rawValue, decimals)
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">
        {animated}
        {unit && rawValue != null && <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[13px]">{sub}</div>}
    </div>
  )
}

export function AnalisisTab() {
  const p = usePacienteContext()
  const { data: revs, isLoading } = useRevisiones(p.id)
  const edad = calcEdad(p.fecha_nac)
  const sexo = p.sexo
  const [activas, setActivas] = useState<Set<string>>(
    new Set(['per_cintura', 'per_caderas', 'per_muslo', 'per_pecho']),
  )

  const grasaFn = useMemo(
    () => (r: Revision) =>
      calcGrasaDW(r.pl_bicipital, r.pl_tricipital, r.pl_subescapular, r.pl_supraespinal, edad, sexo),
    [edad, sexo],
  )

  const derived = useMemo(() => {
    if (!revs || revs.length === 0) return null
    const asc = [...revs].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    const last = asc[asc.length - 1]!
    const first = asc[0]!

    const pg = buildMonthMultiData(asc, [(r) => r.peso, grasaFn])

    const activeMedidas = ALL_MEDIDAS.filter((m) => activas.has(m.key))
    const perim = buildMonthMultiData(asc, activeMedidas.map((m) => (r: Revision) => r[m.key] as number | null))
    const series: Serie[] = activeMedidas.map((m, i) => ({
      label: m.short,
      data: perim.datasets[i] ?? [],
      color: m.color,
      unit: m.unit,
    }))

    const plieguesLast = PLIEGUES.filter((m) => last[m.key] != null)

    return {
      asc,
      first,
      last,
      pesoGrasa: { labels: pg.labels, peso: pg.datasets[0] ?? [], grasa: pg.datasets[1] ?? [] },
      perim: { labels: perim.labels, series },
      pliegues: {
        labels: plieguesLast.map((m) => m.short),
        data: plieguesLast.map((m) => last[m.key] as number),
        colors: plieguesLast.map((m) => m.color),
      },
    }
  }, [revs, activas, grasaFn])

  if (isLoading) return <CenteredSpinner />
  if (!derived) return <EmptyState title="Sin datos para analizar" subtitle="Añade revisiones para ver la evolución." />

  const { first, last } = derived
  const grasaLast = grasaFn(last)
  const imcLast = calcIMC(last.peso, p.talla)
  const clase = clasificarGrasa(grasaLast, sexo)

  const filas = [
    { label: 'Peso (kg)', f: first.peso, l: last.peso },
    { label: 'IMC', f: calcIMC(first.peso, p.talla)?.val ?? null, l: imcLast?.val ?? null },
    { label: '% Grasa', f: grasaFn(first), l: grasaLast },
    { label: 'Peso graso (kg)', f: pesoGraso(first.peso, grasaFn(first)), l: pesoGraso(last.peso, grasaLast) },
    { label: 'Peso magro (kg)', f: pesoMagro(first.peso, grasaFn(first)), l: pesoMagro(last.peso, grasaLast) },
  ]

  return (
    <div className="dash-area flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between print-hide">
        <h3 className="text-lg font-bold">Análisis y evolución</h3>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Exportar PDF
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Peso actual" rawValue={last.peso} unit="kg" decimals={1} />
        <KpiCard label="IMC" rawValue={imcLast?.val ?? null} sub={imcLast?.etiq} decimals={1} />
        <KpiCard
          label="% Grasa"
          rawValue={grasaLast}
          unit="%"
          decimals={1}
          sub={
            clase && (
              <span className="rounded px-1.5 py-0.5" style={{ background: clase.bg, color: clase.color }}>
                {clase.etiq}
              </span>
            )
          }
        />
        <KpiCard label="Peso graso" rawValue={pesoGraso(last.peso, grasaLast)} unit="kg" decimals={1} />
        <KpiCard label="Peso magro" rawValue={pesoMagro(last.peso, grasaLast)} unit="kg" decimals={1} />
      </div>

      {/* Composición corporal */}
      {grasaLast != null && last.peso != null && (() => {
        const pGraso = pesoGraso(last.peso, grasaLast) ?? 0
        const pMagro = pesoMagro(last.peso, grasaLast) ?? 0
        const total = pGraso + pMagro
        const pctMagro = total > 0 ? (pMagro / total) * 100 : 50
        return (
          <div className="rounded-card bg-surface p-4 shadow-card">
            <div className="mb-3 text-sm font-bold">Composición corporal</div>
            <div className="overflow-hidden rounded-full h-5" style={{ background: '#fde68a' }}>
              <div
                className="h-full rounded-full transition-all duration-[1800ms] ease-out"
                style={{ width: `${pctMagro}%`, background: 'linear-gradient(90deg,#0F7B92,#2DD4BF)' }}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#0F7B92' }} />
                <span className="font-semibold">{pctMagro.toFixed(1)}%</span>
                <span className="text-ink-muted">Masa magra — {pMagro.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-ink-muted">Masa grasa — {pGraso.toFixed(1)} kg</span>
                <span className="font-semibold">{(100 - pctMagro).toFixed(1)}%</span>
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#fbbf24' }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Tabla de evolución */}
      <div className="overflow-x-auto rounded-card bg-surface p-4 shadow-card">
        <div className="mb-2 text-sm font-bold">Evolución</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted">
              <th className="py-1.5 font-semibold">Métrica</th>
              <th className="py-1.5 font-semibold">Primera</th>
              <th className="py-1.5 font-semibold">Última</th>
              <th className="py-1.5 font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const delta = f.f != null && f.l != null ? Math.round((f.l - f.f) * 10) / 10 : null
              return (
                <tr key={f.label} className="border-t border-border">
                  <td className="py-1.5 font-medium">{f.label}</td>
                  <td className="py-1.5">{f.f ?? '—'}</td>
                  <td className="py-1.5 font-semibold">{f.l ?? '—'}</td>
                  <td className={cn('py-1.5 font-semibold', delta != null && delta < 0 && 'text-success', delta != null && delta > 0 && 'text-danger')}>
                    {delta != null ? (delta > 0 ? `+${delta}` : delta) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Gráficos: peso+grasa y perímetros en la misma fila */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="mb-1 text-sm font-bold">Evolución del peso y la masa grasa</div>
          <div className="mb-3 text-[13px] text-ink-muted">kg · % grasa (Durnin-Womersley)</div>
          <div className="h-[240px]">
            <ChartPesoGrasa {...derived.pesoGrasa} />
          </div>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold">Evolución de medidas</div>
            <div className="flex flex-wrap gap-1.5 print-hide">
              {ALL_MEDIDAS.map((m) => (
                <button
                  key={m.key}
                  onClick={() =>
                    setActivas((prev) => {
                      const next = new Set(prev)
                      next.has(m.key) ? next.delete(m.key) : next.add(m.key)
                      return next
                    })
                  }
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
                    activas.has(m.key) ? 'border-transparent text-white' : 'border-border text-ink-muted',
                  )}
                  style={activas.has(m.key) ? { background: m.color } : undefined}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[240px]">
            {derived.perim.series.length > 0 ? (
              <ChartPerimetros labels={derived.perim.labels} series={derived.perim.series} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-muted">
                Selecciona alguna medida.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pliegues última revisión */}
      {derived.pliegues.data.length > 0 && (
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="mb-3 text-sm font-bold">Pliegues cutáneos (última revisión)</div>
          <div className="h-[280px]">
            <ChartPliegues {...derived.pliegues} />
          </div>
        </div>
      )}

      {/* Perfil corporal con siluetas */}
      <PerfilCorporal
        last={derived.last}
        prev={derived.asc.length >= 2 ? derived.asc[derived.asc.length - 2]! : null}
      />
    </div>
  )
}
