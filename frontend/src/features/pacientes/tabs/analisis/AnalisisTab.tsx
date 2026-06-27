import { useMemo, useState } from 'react'
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
import { cn } from '@/lib/cn'

function KpiCard({
  label,
  value,
  unit,
  sub,
}: {
  label: string
  value: string
  unit?: string
  sub?: React.ReactNode
}) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>}
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
        <KpiCard label="Peso actual" value={last.peso != null ? String(last.peso) : '—'} unit="kg" />
        <KpiCard label="IMC" value={imcLast ? String(imcLast.val) : '—'} sub={imcLast?.etiq} />
        <KpiCard
          label="% Grasa"
          value={grasaLast != null ? String(grasaLast) : '—'}
          unit="%"
          sub={
            clase && (
              <span className="rounded px-1.5 py-0.5" style={{ background: clase.bg, color: clase.color }}>
                {clase.etiq}
              </span>
            )
          }
        />
        <KpiCard label="Peso graso" value={pesoGraso(last.peso, grasaLast)?.toString() ?? '—'} unit="kg" />
        <KpiCard label="Peso magro" value={pesoMagro(last.peso, grasaLast)?.toString() ?? '—'} unit="kg" />
      </div>

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

      {/* Gráfico peso + grasa */}
      <div className="rounded-card bg-surface p-4 shadow-card">
        <div className="mb-1 text-sm font-bold">Evolución del peso y la masa grasa</div>
        <div className="mb-3 text-[13px] text-ink-muted">kg · % grasa (Durnin-Womersley)</div>
        <div className="h-[280px]">
          <ChartPesoGrasa {...derived.pesoGrasa} />
        </div>
      </div>

      {/* Perímetros */}
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
        <div className="h-[300px]">
          {derived.perim.series.length > 0 ? (
            <ChartPerimetros labels={derived.perim.labels} series={derived.perim.series} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">
              Selecciona alguna medida.
            </div>
          )}
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
    </div>
  )
}
