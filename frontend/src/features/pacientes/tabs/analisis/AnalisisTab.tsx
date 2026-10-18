import { useMemo, useState } from 'react'
// Registro de Chart.js junto a la pestaña que lo usa: así Chart.js queda en el
// chunk diferido de Análisis y no se carga en el bundle inicial.
import '@/lib/chart/chartSetup'
import { usePacienteContext } from '../context'
import { useRevisiones } from '../../hooks/useRevisiones'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { calcEdad, fmtFecha, fmtFechaCorta } from '@/lib/format/fecha'
import { calcIMC, calcGrasaDW, clasificarGrasa, pesoGraso, pesoMagro, calcTMB } from '@/lib/calc'
import { buildMonthMultiData } from '@/lib/chart/buildMonthData'
import { ALL_MEDIDAS, PLIEGUES } from '@/types'
import type { Revision } from '@/types'
import { PERIMETROS_SERIE_INICIAL, PLIEGUES_GRASA } from '../../medidas-analisis'
import { ChartPesoGrasa } from './charts/ChartPesoGrasa'
import { ChartPerimetros, type Serie } from './charts/ChartPerimetros'
import { ChartPliegues } from './charts/ChartPliegues'
import { PerfilCorporal } from './PerfilCorporal'
import { ComposicionPanel } from './ComposicionPanel'
import { TablaEvolucion, type FilaEvolucion } from './TablaEvolucion'
import { esDeLaUltimaRevision, resumirSerie, ultimoDato, type Punto } from './ultimo-dato'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { cn } from '@/lib/cn'

function SparkLine({ data }: { data: (number | null)[] }) {
  const vals = data.filter((v): v is number => v != null)
  if (vals.length < 2) return null
  const W = 100,
    H = 40
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - min) / range) * (H * 0.72) - 3,
  }))
  const [inicio, ...resto] = pts
  if (inicio === undefined) return null
  let line = `M ${inicio.x.toFixed(2)} ${inicio.y.toFixed(2)}`
  let p = inicio
  for (const c of resto) {
    const dx = (c.x - p.x) * 0.4
    line += ` C ${(p.x + dx).toFixed(2)} ${p.y.toFixed(2)}, ${(c.x - dx).toFixed(2)} ${c.y.toFixed(2)}, ${c.x.toFixed(2)} ${c.y.toFixed(2)}`
    p = c
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-full w-full text-primary"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spark-peso-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${W} ${H + 1} L 0 ${H + 1} Z`} fill="url(#spark-peso-g)" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
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
  vacio,
  notaFecha,
}: {
  label: string
  rawValue: number | null
  unit?: string
  sub?: React.ReactNode
  decimals?: number
  icon?: React.ReactNode
  sparklineData?: (number | null)[]
  // Texto cuando no hay ningún dato en todo el historial.
  vacio: string
  // Fecha de la revisión de origen cuando el dato no es de la última.
  notaFecha?: string | null
}) {
  const animated = useCountUp(rawValue, decimals)
  const spark = sparklineData != null && sparklineData.filter((v) => v != null).length >= 2 ? sparklineData : null
  return (
    <div className="min-w-0 rounded-card bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">{label}</div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            {icon}
          </div>
        )}
      </div>
      {rawValue == null ? (
        <div className="mt-2 text-sm leading-snug text-ink-muted">{vacio}</div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
            <div className="shrink-0 text-2xl font-extrabold tabular-nums">
              {animated}
              {unit && <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>}
            </div>
            {spark && (
              <div className="h-10 min-w-[60px] max-w-[160px] flex-1">
                <SparkLine data={spark} />
              </div>
            )}
          </div>
          {sub && <div className="mt-1 text-[13px]">{sub}</div>}
          {notaFecha != null && <div className="mt-1 text-[11px] text-ink-muted">dato del {fmtFecha(notaFecha)}</div>}
        </>
      )}
    </div>
  )
}

export function AnalisisTab() {
  const p = usePacienteContext()
  const { data: revs, isLoading, isError, error, refetch, isFetching } = useRevisiones(p.id)
  const edad = calcEdad(p.fecha_nac)
  const sexo = p.sexo
  const [activas, setActivas] = useState<Set<string>>(new Set(PERIMETROS_SERIE_INICIAL))

  const grasaFn = useMemo(
    () => (r: Revision) => {
      const [bicipital, tricipital, subescapular, supracrestal] = PLIEGUES_GRASA
      return calcGrasaDW(r[bicipital], r[tricipital], r[subescapular], r[supracrestal], edad, sexo)
    },
    [edad, sexo],
  )

  // Aparte de `derived`: la silueta reinicia su animación cuando cambia esta lista.
  const ordenadas = useMemo(
    () => revs?.toSorted((a, b) => (a.fecha || '').localeCompare(b.fecha || '')) ?? null,
    [revs],
  )

  const derived = useMemo(() => {
    if (ordenadas === null) return null
    const asc = ordenadas
    const last = asc.at(-1)
    const first = asc[0]
    if (last === undefined || first === undefined) return null

    const pg = buildMonthMultiData(asc, [(r) => r.peso, grasaFn])

    const activeMedidas = ALL_MEDIDAS.filter((m) => activas.has(m.key))
    const perim = buildMonthMultiData(
      asc,
      activeMedidas.map((m) => (r: Revision) => r[m.key]),
    )
    const series: Serie[] = activeMedidas.map((m, i) => ({
      label: m.short,
      data: perim.datasets[i] ?? [],
      color: m.color,
      unit: m.unit,
    }))

    // Último dato disponible de cada pliegue, aunque la última revisión no lo traiga.
    const plieguesDatos = PLIEGUES.flatMap((m) => {
      const dato = ultimoDato(asc, (r) => r[m.key])
      return dato === null ? [] : [{ medida: m, dato }]
    })
    const todosDeLaUltima = plieguesDatos.every((x) => esDeLaUltimaRevision(x.dato, asc.length))

    return {
      asc,
      first,
      last,
      pesoGrasa: { labels: pg.labels, peso: pg.datasets[0] ?? [], grasa: pg.datasets[1] ?? [] },
      perim: { labels: perim.labels, series },
      pliegues: {
        labels: plieguesDatos.map((x) => x.medida.short),
        data: plieguesDatos.map((x) => x.dato.valor),
        colors: plieguesDatos.map((x) => x.medida.color),
        subtitulo: todosDeLaUltima ? `Revisión del ${fmtFecha(last.fecha)}` : 'Último dato registrado de cada pliegue',
      },
    }
  }, [ordenadas, activas, grasaFn])

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="el análisis" />
  if (!derived) return <EmptyState title="Sin datos para analizar" subtitle="Añade revisiones para ver la evolución." />

  const { asc, first, last } = derived
  const total = asc.length
  const prev = asc.at(-2) ?? null
  const hayEvolucion = prev !== null

  // Cada tarjeta usa el último dato disponible; la nota solo aparece si no es de la última revisión.
  const notaDe = (punto: Punto<unknown> | null) =>
    punto !== null && !esDeLaUltimaRevision(punto, total) ? punto.fecha : null

  const pesoD = ultimoDato(asc, (r) => r.peso)
  const imcD = ultimoDato(asc, (r) => calcIMC(r.peso, p.talla))
  const grasaD = ultimoDato(asc, grasaFn)
  const pesoGrasoD = ultimoDato(asc, (r) => pesoGraso(r.peso, grasaFn(r)))
  const pesoMagroD = ultimoDato(asc, (r) => pesoMagro(r.peso, grasaFn(r)))
  const tmbD = ultimoDato(asc, (r) => calcTMB(r.peso, p.talla, edad, sexo))
  const composicionD = ultimoDato(asc, (r) => {
    const g = grasaFn(r)
    const graso = pesoGraso(r.peso, g)
    const magro = pesoMagro(r.peso, g)
    return graso !== null && magro !== null ? { graso, magro } : null
  })
  const clase = clasificarGrasa(grasaD?.valor ?? null, sexo)

  const hayPliegues = asc.some((r) => PLIEGUES_GRASA.every((clave) => r[clave] != null))
  const vacioPeso = 'Sin peso registrado'
  const vacioGrasa = hayPliegues ? 'Requiere sexo y edad' : 'Sin pliegues registrados'
  // Con peso y % de grasa en revisiones distintas no se puede repartir el peso.
  const vacioSinCoincidir = grasaD === null ? vacioGrasa : 'Ninguna revisión tiene peso y pliegues a la vez'
  const vacioComposicion = pesoD === null ? vacioPeso : vacioSinCoincidir
  const vacioImc = pesoD === null ? vacioPeso : 'Falta la talla'
  const vacioTmb = pesoD === null ? vacioPeso : 'Requiere talla, sexo y edad'

  const filas: FilaEvolucion[] = [
    { etiqueta: 'Peso (kg)', resumen: resumirSerie(asc, (r) => r.peso), vacio: vacioPeso },
    { etiqueta: 'IMC', resumen: resumirSerie(asc, (r) => calcIMC(r.peso, p.talla)?.val), vacio: vacioImc },
    { etiqueta: '% Grasa', resumen: resumirSerie(asc, grasaFn), vacio: vacioGrasa },
    {
      etiqueta: 'Peso graso (kg)',
      resumen: resumirSerie(asc, (r) => pesoGraso(r.peso, grasaFn(r))),
      vacio: vacioComposicion,
    },
    {
      etiqueta: 'Peso magro (kg)',
      resumen: resumirSerie(asc, (r) => pesoMagro(r.peso, grasaFn(r))),
      vacio: vacioComposicion,
    },
  ]

  const hayPanel = composicionD !== null || imcD !== null

  return (
    <div className="dash-area flex flex-col gap-4 p-4 sm:p-6 print-content-area">
      {/* Cabecera profesional — solo visible al imprimir, se repite en cada página */}
      <div className="hidden print-running-header">
        <div
          style={{
            background: '#0F7B92',
            color: 'white',
            padding: '5mm 10mm 4mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#86efac"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
              <path d="M12 6v6l4 2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            </svg>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', lineHeight: 1.1 }}>NutriClínica</div>
              <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '1px' }}>Gestión de clientes</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                opacity: 0.8,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Informe de análisis
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', marginTop: '2px' }}>{p.nombre}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '90px' }}>
            {derived.last?.fecha && (
              <>
                <div style={{ fontSize: '11px', opacity: 0.75 }}>Última revisión</div>
                <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>
                  {fmtFechaCorta(derived.last.fecha)}
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #0F7B92, #2DD4BF, #86efac)' }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 print-hide">
        <h3 className="text-lg font-bold">Análisis y evolución</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const nombreFichero = p.nombre
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/\s+/g, '_')
              .replace(/[^a-zA-Z0-9_]/g, '')
            const fechaFichero = derived.last?.fecha ? derived.last.fecha.replace(/-/g, '') : ''
            const titulo = fechaFichero ? `${nombreFichero}_${fechaFichero}` : nombreFichero
            const tituloAnterior = document.title
            document.title = titulo
            window.print()
            document.title = tituloAnterior
          }}
        >
          Exportar PDF
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Peso actual"
          rawValue={pesoD?.valor ?? null}
          unit="kg"
          decimals={1}
          vacio={vacioPeso}
          notaFecha={notaDe(pesoD)}
          sparklineData={asc.map((r) => r.peso)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="13" r="8" />
              <path d="M12 13l3.5-3" />
              <path d="M12 5V3M5 13H3M21 13h-2" />
            </svg>
          }
        />
        <KpiCard
          label="IMC"
          rawValue={imcD?.valor.val ?? null}
          sub={imcD?.valor.etiq}
          decimals={1}
          vacio={vacioImc}
          notaFecha={notaDe(imcD)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 12 7 12 10 5 14 19 17 12 21 12" />
            </svg>
          }
        />
        <KpiCard
          label="% Grasa"
          rawValue={grasaD?.valor ?? null}
          unit="%"
          decimals={1}
          vacio={vacioGrasa}
          notaFecha={notaDe(grasaD)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3z" />
            </svg>
          }
          sub={
            clase && (
              <span className="rounded-sm px-1.5 py-0.5" style={{ background: clase.bg, color: clase.color }}>
                {clase.etiq}
              </span>
            )
          }
        />
        <KpiCard
          label="Peso graso"
          rawValue={pesoGrasoD?.valor ?? null}
          unit="kg"
          decimals={1}
          vacio={vacioComposicion}
          notaFecha={notaDe(pesoGrasoD)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3c.5 3 3 4.5 3 8a3 3 0 0 1-6 0c0-1 .4-1.8 1-2.4C9 11 12 7 12 3z" />
              <path d="M12 3c2.5 3 5 5.5 5 9a5 5 0 0 1-10 0" />
            </svg>
          }
        />
        <KpiCard
          label="Peso magro"
          rawValue={pesoMagroD?.valor ?? null}
          unit="kg"
          decimals={1}
          vacio={vacioComposicion}
          notaFecha={notaDe(pesoMagroD)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9v6M21 9v6M6.5 7v10M17.5 7v10M6.5 12h11" />
            </svg>
          }
        />
        <KpiCard
          label="TMB"
          rawValue={tmbD?.valor ?? null}
          unit="kcal"
          decimals={0}
          vacio={vacioTmb}
          notaFecha={notaDe(tmbD)}
          sub={<span className="text-ink-muted">en reposo</span>}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
      </div>

      {/* Composición corporal junto a la tabla de evolución; sin composición, la tabla ocupa todo el ancho */}
      <div className={cn('grid grid-cols-1 gap-4', hayPanel && 'lg:grid-cols-[2fr_3fr]')}>
        {hayPanel && (
          <ComposicionPanel
            composicion={
              composicionD && {
                pesoGraso: composicionD.valor.graso,
                pesoMagro: composicionD.valor.magro,
                notaFecha: notaDe(composicionD),
              }
            }
            imc={imcD && { valor: imcD.valor.val, notaFecha: notaDe(imcD) }}
          />
        )}
        <TablaEvolucion
          filas={filas}
          hayEvolucion={hayEvolucion}
          fechaPrimera={first.fecha ?? null}
          fechaAnterior={prev?.fecha ?? null}
          fechaUltima={last.fecha ?? null}
        />
      </div>

      {/* Gráficos: peso+grasa y perímetros en la misma fila */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print-hide">
        <div className="min-w-0 rounded-card bg-surface p-4 shadow-card">
          <div className="mb-1 text-sm font-bold">Evolución del peso y la masa grasa</div>
          <div className="mb-3 text-[13px] text-ink-muted">kg · % grasa (Durnin-Womersley)</div>
          <div className="h-[240px]">
            <ChartPesoGrasa {...derived.pesoGrasa} />
          </div>
        </div>

        <div className="min-w-0 rounded-card bg-surface p-4 shadow-card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold">Evolución de medidas</div>
            <div className="flex flex-wrap gap-1.5 print-hide">
              {ALL_MEDIDAS.map((m) => (
                <button
                  key={m.key}
                  onClick={() =>
                    setActivas((actuales) => {
                      const next = new Set(actuales)
                      if (!next.delete(m.key)) next.add(m.key)
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

      {/* Pliegues: último dato de cada uno */}
      {derived.pliegues.data.length > 0 && (
        <div className="rounded-card bg-surface p-4 shadow-card print-hide">
          <div className="mb-1 text-sm font-bold">Pliegues cutáneos</div>
          <div className="mb-3 text-[13px] text-ink-muted">{derived.pliegues.subtitulo}</div>
          <div className="h-[280px]">
            <ChartPliegues
              labels={derived.pliegues.labels}
              data={derived.pliegues.data}
              colors={derived.pliegues.colors}
            />
          </div>
        </div>
      )}

      {/* Perfil corporal con siluetas */}
      <div className="print-page-break">
        <PerfilCorporal revisiones={asc} sexo={p.sexo ?? ''} />
      </div>
    </div>
  )
}
