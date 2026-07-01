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
import { calcIMC, calcGrasaDW, clasificarGrasa, pesoGraso, pesoMagro, calcTMB } from '@/lib/calc'
import { buildMonthMultiData } from '@/lib/chart/buildMonthData'
import { ALL_MEDIDAS, PLIEGUES } from '@/types'
import type { Revision } from '@/types'
import { ChartPesoGrasa } from './charts/ChartPesoGrasa'
import { ChartPerimetros, type Serie } from './charts/ChartPerimetros'
import { ChartPliegues } from './charts/ChartPliegues'
import { PerfilCorporal } from './PerfilCorporal'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { cn } from '@/lib/cn'

function SparkLine({ data }: { data: (number | null)[] }) {
  const vals = data.filter((v): v is number => v != null)
  if (vals.length < 2) return null
  const W = 100, H = 40
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - min) / range) * (H * 0.72) - 3,
  }))
  let line = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!, c = pts[i]!
    const dx = (c.x - p.x) * 0.4
    line += ` C ${(p.x + dx).toFixed(2)} ${p.y.toFixed(2)}, ${(c.x - dx).toFixed(2)} ${c.y.toFixed(2)}, ${c.x.toFixed(2)} ${c.y.toFixed(2)}`
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 46 }}>
      <defs>
        <linearGradient id="spark-peso-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F7B92" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0F7B92" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${W} ${H + 1} L 0 ${H + 1} Z`} fill="url(#spark-peso-g)" />
      <path d={line} fill="none" stroke="#0F7B92" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KpiCard({
  label,
  rawValue,
  unit,
  sub,
  decimals = 1,
  icon,
  sparklineData,
}: {
  label: string
  rawValue: number | null
  unit?: string
  sub?: React.ReactNode
  decimals?: number
  icon?: React.ReactNode
  sparklineData?: (number | null)[]
}) {
  const animated = useCountUp(rawValue, decimals)
  const hasSpark = sparklineData != null && sparklineData.filter(v => v != null).length >= 2
  return (
    <div className={cn('rounded-card bg-surface shadow-card', hasSpark ? 'overflow-hidden' : 'p-4')}>
      <div className={hasSpark ? 'p-4 pb-2' : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">{label}</div>
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 text-2xl font-extrabold">
          {animated}
          {unit && rawValue != null && <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>}
        </div>
        {sub && <div className="mt-1 text-[13px]">{sub}</div>}
      </div>
      {hasSpark && <SparkLine data={sparklineData!} />}
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
      calcGrasaDW(r.pl_bicipital, r.pl_tricipital, r.pl_subescapular, r.pl_supracrestal, edad, sexo),
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
  const prev = derived.asc.length >= 2 ? derived.asc[derived.asc.length - 2]! : null
  const grasaLast = grasaFn(last)
  const grasaPrev = prev ? grasaFn(prev) : null
  const imcLast = calcIMC(last.peso, p.talla)
  const clase = clasificarGrasa(grasaLast, sexo)

  const filas = [
    { label: 'Peso (kg)', f: first.peso, a: prev?.peso ?? null, l: last.peso },
    { label: 'IMC', f: calcIMC(first.peso, p.talla)?.val ?? null, a: prev ? (calcIMC(prev.peso, p.talla)?.val ?? null) : null, l: imcLast?.val ?? null },
    { label: '% Grasa', f: grasaFn(first), a: grasaPrev, l: grasaLast },
    { label: 'Peso graso (kg)', f: pesoGraso(first.peso, grasaFn(first)), a: prev ? pesoGraso(prev.peso, grasaPrev) : null, l: pesoGraso(last.peso, grasaLast) },
    { label: 'Peso magro (kg)', f: pesoMagro(first.peso, grasaFn(first)), a: prev ? pesoMagro(prev.peso, grasaPrev) : null, l: pesoMagro(last.peso, grasaLast) },
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Peso actual" rawValue={last.peso} unit="kg" decimals={1} sparklineData={derived.asc.map(r => r.peso)} icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 13l3.5-3"/><path d="M12 5V3M5 13H3M21 13h-2"/></svg>
        } />
        <KpiCard label="IMC" rawValue={imcLast?.val ?? null} sub={imcLast?.etiq} decimals={1} icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/></svg>
        } />
        <KpiCard
          label="% Grasa"
          rawValue={grasaLast}
          unit="%"
          decimals={1}
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3z"/></svg>
          }
          sub={
            clase && (
              <span className="rounded px-1.5 py-0.5" style={{ background: clase.bg, color: clase.color }}>
                {clase.etiq}
              </span>
            )
          }
        />
        <KpiCard label="Peso graso" rawValue={pesoGraso(last.peso, grasaLast)} unit="kg" decimals={1} icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.5 3 3 4.5 3 8a3 3 0 0 1-6 0c0-1 .4-1.8 1-2.4C9 11 12 7 12 3z"/><path d="M12 3c2.5 3 5 5.5 5 9a5 5 0 0 1-10 0"/></svg>
        } />
        <KpiCard label="Peso magro" rawValue={pesoMagro(last.peso, grasaLast)} unit="kg" decimals={1} icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9v6M21 9v6M6.5 7v10M17.5 7v10M6.5 12h11"/></svg>
        } />
        <KpiCard label="TMB" rawValue={calcTMB(last.peso, p.talla, edad, sexo)} unit="kcal" decimals={0} sub={<span className="text-ink-muted">en reposo</span>} icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        } />
      </div>

      {/* Composición corporal + Tabla evolución en la misma fila */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        {grasaLast != null && last.peso != null && (() => {
          const pGraso = pesoGraso(last.peso, grasaLast) ?? 0
          const pMagro = pesoMagro(last.peso, grasaLast) ?? 0
          const total = pGraso + pMagro
          const pctMagro = total > 0 ? (pMagro / total) * 100 : 50
          const imcVal = imcLast?.val ?? null
          const IMC_MIN = 14, IMC_MAX = 40
          const imcPct = imcVal != null
            ? Math.min(Math.max((imcVal - IMC_MIN) / (IMC_MAX - IMC_MIN) * 100, 0), 100)
            : null
          const imcZones = [
            { label: 'Infrapeso', color: '#60a5fa', width: 17.3 },
            { label: 'Normal',    color: '#34d399', width: 25.0 },
            { label: 'Sobrepeso', color: '#fbbf24', width: 19.2 },
            { label: 'Obesidad',  color: '#f87171', width: 38.5 },
          ]
          return (
            <div className="rounded-card bg-surface p-4 shadow-card flex flex-col gap-3">
              <div className="text-sm font-bold">Composición corporal</div>

              {/* Barra composición reducida */}
              <div>
                <div className="h-3 overflow-hidden rounded-full" style={{ background: '#fde68a' }}>
                  <div
                    className="h-full rounded-full transition-all duration-[1800ms] ease-out"
                    style={{ width: `${pctMagro}%`, background: 'linear-gradient(90deg,#0F7B92,#2DD4BF)' }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#0F7B92' }} />
                    <span className="font-semibold">{pctMagro.toFixed(1)}%</span>
                    <span className="text-ink-muted">Masa magra — {pMagro.toFixed(1)} kg</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-muted">Masa grasa — {pGraso.toFixed(1)} kg</span>
                    <span className="font-semibold">{(100 - pctMagro).toFixed(1)}%</span>
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#fbbf24' }} />
                  </div>
                </div>
              </div>

              {/* Escala de clasificación IMC */}
              {imcVal != null && (
                <div className="border-t border-border pt-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Clasificación IMC</span>
                    <span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-bold">{imcVal}</span>
                  </div>
                  <div className="relative">
                    <div className="flex h-4 overflow-hidden rounded-full">
                      {imcZones.map((z) => (
                        <div key={z.label} style={{ width: `${z.width}%`, background: z.color }} />
                      ))}
                    </div>
                    {imcPct != null && (
                      <div
                        className="absolute top-0 h-4 w-1 -translate-x-1/2 rounded-full bg-ink shadow"
                        style={{ left: `${imcPct}%` }}
                      />
                    )}
                  </div>
                  <div className="mt-1.5 flex text-[11px]">
                    {imcZones.map((z) => (
                      <div key={z.label} style={{ width: `${z.width}%`, color: z.color }} className="text-center font-semibold">
                        {z.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        <div className="overflow-x-auto rounded-card bg-surface p-4 shadow-card">
          <div className="mb-2 text-sm font-bold">Evolución</div>
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-ink-muted">
                <th className="py-1.5 font-semibold">Métrica</th>
                <th className="py-1.5 font-semibold">Primera</th>
                <th className="py-1.5 font-semibold">Anterior</th>
                <th className="py-1.5 font-semibold">Última</th>
                <th className="py-1.5 font-bold text-ink">Δ Prim vs Últ</th>
                <th className="py-1.5 font-bold text-ink">Δ Ant vs Últ</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const deltaTotal = f.f != null && f.l != null ? Math.round((f.l - f.f) * 10) / 10 : null
                const deltaAnt = f.a != null && f.l != null ? Math.round((f.l - f.a) * 10) / 10 : null
                const fmtDelta = (d: number | null) =>
                  d != null ? (d > 0 ? `+${d}` : String(d)) : '—'
                return (
                  <tr key={f.label} className="border-t border-border">
                    <td className="py-1.5 font-medium">{f.label}</td>
                    <td className="py-1.5 text-ink-muted">{f.f ?? '—'}</td>
                    <td className="py-1.5 text-ink-muted">{f.a ?? '—'}</td>
                    <td className="py-1.5 font-semibold">{f.l ?? '—'}</td>
                    <td className={cn('py-1.5 font-semibold', deltaTotal != null && deltaTotal < 0 && 'text-success', deltaTotal != null && deltaTotal > 0 && 'text-danger')}>
                      {fmtDelta(deltaTotal)}
                    </td>
                    <td className={cn('py-1.5 font-semibold', deltaAnt != null && deltaAnt < 0 && 'text-success', deltaAnt != null && deltaAnt > 0 && 'text-danger')}>
                      {fmtDelta(deltaAnt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
        sexo={p.sexo ?? ''}
      />
    </div>
  )
}
