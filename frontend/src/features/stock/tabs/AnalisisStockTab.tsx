import { useMemo } from 'react'
import '@/lib/chart/chartSetup'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useCompras, useVentas, useMermas, useAlmacen } from '../hooks/useStock'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useChartTheme, tooltipPlugin } from '@/lib/chart/useChartTheme'
import { fmtMoneda } from '@/lib/format/moneda'
import type { ChartOptions } from 'chart.js'

const PALETTE = ['#0F7B92', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6']

const MOTIVO_LABEL: Record<string, string> = {
  caducidad: 'Caducidad',
  accidente_rotura: 'Accidente / Rotura',
  devolucion_cliente: 'Devolución cliente',
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: 'success' | 'warning' | 'danger'
}) {
  const cls =
    highlight === 'success'
      ? 'text-green-500'
      : highlight === 'warning'
        ? 'text-amber-500'
        : highlight === 'danger'
          ? 'text-danger'
          : 'text-ink'
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${cls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-muted">{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <h3 className="mb-4 text-[15px] font-bold">{title}</h3>
      {children}
    </div>
  )
}

export function AnalisisStockTab() {
  const { data: comprasData, isLoading: lc } = useCompras()
  const { data: ventasData, isLoading: lv } = useVentas()
  const { data: mermasData, isLoading: lm } = useMermas()
  const { data: almacenData, isLoading: la } = useAlmacen()
  const t = useChartTheme()

  const compras = comprasData ?? []
  const ventas = ventasData ?? []
  const mermas = mermasData ?? []
  const almacen = almacenData ?? []

  // Últimos 12 meses en formato YYYY-MM
  const meses = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  }, [])

  const { ventasPorMes, comprasPorMes } = useMemo(() => {
    const ventasPorMes: Record<string, number> = {}
    const comprasPorMes: Record<string, number> = {}
    for (const v of ventas) {
      const m = (v.fecha ?? '').slice(0, 7)
      if (m) ventasPorMes[m] = (ventasPorMes[m] ?? 0) + v.total
    }
    for (const c of compras) {
      const m = (c.fecha ?? '').slice(0, 7)
      if (m) comprasPorMes[m] = (comprasPorMes[m] ?? 0) + c.total
    }
    return { ventasPorMes, comprasPorMes }
  }, [ventas, compras])

  const topProductos = useMemo(() => {
    const totales: Record<string, number> = {}
    for (const v of ventas) {
      for (const l of v.lineas) {
        const nombre = l.producto_nombre ?? 'Desconocido'
        totales[nombre] = (totales[nombre] ?? 0) + l.cantidad * l.precio_unitario
      }
    }
    return Object.entries(totales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([nombre, val]) => [nombre.length > 26 ? nombre.slice(0, 26) + '…' : nombre, val] as [string, number])
  }, [ventas])

  const comprasPorProv = useMemo(() => {
    const tot: Record<string, number> = {}
    for (const c of compras) {
      const nombre = c.proveedor_nombre ?? 'Sin proveedor'
      tot[nombre] = (tot[nombre] ?? 0) + c.total
    }
    return Object.entries(tot).sort(([, a], [, b]) => b - a)
  }, [compras])

  const mermasPorMotivo = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of mermas) counts[m.motivo] = (counts[m.motivo] ?? 0) + 1
    return counts
  }, [mermas])

  // Opciones de gráficos (memoizadas con el tema para no re-renderizar en cada frame)
  const evolucionOpts = useMemo(
    (): ChartOptions<'bar'> => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: t.legend, usePointStyle: true, boxWidth: 10, padding: 16 } },
        tooltip: {
          ...tooltipPlugin(t),
          callbacks: { label: (ctx) => ` ${fmtMoneda(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: { grid: { color: t.grid }, ticks: { color: t.ticks } },
        y: {
          grid: { color: t.grid },
          ticks: { color: t.ticks, callback: (v) => fmtMoneda(Number(v)) },
        },
      },
    }),
    [t],
  )

  const topProductosOpts = useMemo(
    (): ChartOptions<'bar'> => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipPlugin(t),
          callbacks: { label: (ctx) => ` ${fmtMoneda(ctx.parsed.x)}` },
        },
      },
      scales: {
        x: {
          grid: { color: t.grid },
          ticks: { color: t.ticks, callback: (v) => fmtMoneda(Number(v)) },
        },
        y: { grid: { color: t.grid }, ticks: { color: t.ticks } },
      },
    }),
    [t],
  )

  const proveedorOpts = useMemo(
    (): ChartOptions<'doughnut'> => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: t.legend, usePointStyle: true, boxWidth: 10, padding: 12, font: { size: 12 } },
        },
        tooltip: {
          ...tooltipPlugin(t),
          callbacks: { label: (ctx) => ` ${typeof ctx.raw === 'number' ? fmtMoneda(ctx.raw) : ''}` },
        },
      },
    }),
    [t],
  )

  const mermaOpts = useMemo(
    (): ChartOptions<'doughnut'> => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: t.legend, usePointStyle: true, boxWidth: 10, padding: 12, font: { size: 12 } },
        },
        tooltip: {
          ...tooltipPlugin(t),
          callbacks: { label: (ctx) => ` ${typeof ctx.raw === 'number' ? ctx.raw + ' ud' : ''}` },
        },
      },
    }),
    [t],
  )

  if (lc || lv || lm || la) return <CenteredSpinner />

  const totalIngresos = ventas.reduce((s, v) => s + v.total, 0)
  const totalGastos = compras.reduce((s, c) => s + c.total, 0)
  const margen = totalIngresos - totalGastos
  const bajosMinimos = almacen.filter((a) => a.stock_minimo > 0 && a.stock_actual < a.stock_minimo)

  const mesesLabels = meses.map((m) => {
    const [y, mo] = m.split('-') as [string, string]
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
  })

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total ingresos" value={fmtMoneda(totalIngresos)} sub="acumulado ventas" />
        <KpiCard label="Total gastado" value={fmtMoneda(totalGastos)} sub="acumulado compras" />
        <KpiCard
          label="Margen bruto"
          value={fmtMoneda(margen)}
          sub="ingresos − gastos"
          highlight={margen >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="Bajo mínimo de stock"
          value={String(bajosMinimos.length)}
          sub={
            bajosMinimos.length === 0
              ? 'Todo en orden'
              : bajosMinimos
                  .slice(0, 2)
                  .map((a) => a.nombre)
                  .join(', ') + (bajosMinimos.length > 2 ? '…' : '')
          }
          highlight={bajosMinimos.length > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Evolución mensual */}
      <Section title="Evolución mensual — ingresos vs. gastos (últimos 12 meses)">
        <div style={{ height: 240 }}>
          <Bar
            options={evolucionOpts}
            data={{
              labels: mesesLabels,
              datasets: [
                {
                  label: 'Ingresos (ventas)',
                  data: meses.map((m) => ventasPorMes[m] ?? 0),
                  backgroundColor: 'rgba(15,123,146,0.75)',
                  borderRadius: 4,
                },
                {
                  label: 'Gastos (compras)',
                  data: meses.map((m) => comprasPorMes[m] ?? 0),
                  backgroundColor: 'rgba(232,93,74,0.75)',
                  borderRadius: 4,
                },
              ],
            }}
          />
        </div>
      </Section>

      {/* Top productos + Distribución por proveedor */}
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Top productos vendidos (por ingresos)">
          {topProductos.length === 0 ? (
            <p className="py-4 text-sm text-ink-muted">Sin ventas con líneas de producto registradas.</p>
          ) : (
            <div style={{ height: 260 }}>
              <Bar
                options={topProductosOpts}
                data={{
                  labels: topProductos.map(([n]) => n),
                  datasets: [
                    {
                      label: 'Ingresos',
                      data: topProductos.map(([, v]) => v),
                      backgroundColor: PALETTE.slice(0, topProductos.length).map((c) => c + 'CC'),
                      borderRadius: 4,
                    },
                  ],
                }}
              />
            </div>
          )}
        </Section>

        <Section title="Distribución de compras por proveedor">
          {comprasPorProv.length === 0 ? (
            <p className="py-4 text-sm text-ink-muted">Sin compras registradas.</p>
          ) : (
            <div style={{ height: 260 }}>
              <Doughnut
                options={proveedorOpts}
                data={{
                  labels: comprasPorProv.map(([nombre]) => nombre),
                  datasets: [
                    {
                      data: comprasPorProv.map(([, v]) => v),
                      backgroundColor: PALETTE.map((c) => c + 'CC'),
                      borderWidth: 0,
                    },
                  ],
                }}
              />
            </div>
          )}
        </Section>
      </div>

      {/* Mermas + Productos bajo mínimo */}
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Mermas registradas por motivo">
          {mermas.length === 0 ? (
            <p className="py-4 text-sm text-ink-muted">Sin mermas registradas.</p>
          ) : (
            <div style={{ height: 220 }}>
              <Doughnut
                options={mermaOpts}
                data={{
                  labels: Object.keys(mermasPorMotivo).map((k) => MOTIVO_LABEL[k] ?? k),
                  datasets: [
                    {
                      data: Object.values(mermasPorMotivo),
                      backgroundColor: [
                        'rgba(245,158,11,0.85)',
                        'rgba(232,93,74,0.85)',
                        'rgba(15,123,146,0.85)',
                      ],
                      borderWidth: 0,
                    },
                  ],
                }}
              />
            </div>
          )}
        </Section>

        <Section title="Productos bajo mínimo de stock">
          {bajosMinimos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-green-500"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-sm text-ink-muted">Todo el stock está por encima del mínimo.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {bajosMinimos.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">{a.nombre}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-500">{a.stock_actual}</span>
                    <span className="text-[12px] text-ink-muted">
                      {' '}
                      / {a.stock_minimo} {a.unidad ?? 'ud'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
