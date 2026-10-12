import { useMemo, useState, useRef, useEffect } from 'react'
import '@/lib/chart/chartSetup'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { useCompras, useVentas, useMermas, useAlmacen } from '../hooks/useStock'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useChartTheme, tooltipPlugin } from '@/lib/chart/useChartTheme'
import { fmtMoneda } from '@/lib/format/moneda'
import type { ChartOptions } from 'chart.js'
import { normaliza } from '@/lib/format/texto'

const PALETTE = ['#0F7B92', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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

function Section({
  title,
  children,
  actions,
}: {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function AnalisisStockTab() {
  const { data: comprasData, isLoading: lc, error: ec, refetch: rc, isFetching: fc } = useCompras()
  const { data: ventasData, isLoading: lv, error: ev, refetch: rv, isFetching: fv } = useVentas()
  const { data: mermasData, isLoading: lm, error: em, refetch: rm, isFetching: fm } = useMermas()
  const { data: almacenData, isLoading: la, error: ea, refetch: ra, isFetching: fa } = useAlmacen()
  const t = useChartTheme()

  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroMesDesde, setFiltroMesDesde] = useState(1)
  const [filtroMesHasta, setFiltroMesHasta] = useState(12)
  const [filtroProv, setFiltroProv] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [comboAbierto, setComboAbierto] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)
  // La fecha se fija al montar: leer el reloj durante el render no es puro.
  const [hoy] = useState(() => new Date())

  useEffect(() => {
    function cerrar(e: MouseEvent) {
      const dentro = e.target instanceof Node && comboRef.current?.contains(e.target) === true
      if (comboRef.current && !dentro) {
        setComboAbierto(false)
      }
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  const compras = useMemo(() => comprasData ?? [], [comprasData])
  const ventas = useMemo(() => ventasData ?? [], [ventasData])
  const mermas = useMemo(() => mermasData ?? [], [mermasData])
  const almacen = almacenData ?? []

  const meses = useMemo(() => {
    if (!filtroAnio) {
      const now = hoy
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })
    }
    return Array.from(
      { length: filtroMesHasta - filtroMesDesde + 1 },
      (_, i) => `${filtroAnio}-${String(filtroMesDesde + i).padStart(2, '0')}`,
    )
  }, [filtroAnio, filtroMesDesde, filtroMesHasta, hoy])

  const { ventasPorMes, comprasPorMes } = useMemo(() => {
    const porMesVentas: Record<string, number> = {}
    const porMesCompras: Record<string, number> = {}
    for (const v of ventas) {
      const m = (v.fecha ?? '').slice(0, 7)
      if (m) porMesVentas[m] = (porMesVentas[m] ?? 0) + v.total
    }
    for (const c of compras) {
      const m = (c.fecha ?? '').slice(0, 7)
      if (m) porMesCompras[m] = (porMesCompras[m] ?? 0) + c.total
    }
    return { ventasPorMes: porMesVentas, comprasPorMes: porMesCompras }
  }, [ventas, compras])

  const anosDisponibles = useMemo(() => {
    const anos = new Set<string>()
    for (const v of ventas) {
      const y = (v.fecha ?? '').slice(0, 4)
      if (y.length === 4) anos.add(y)
    }
    for (const c of compras) {
      const y = (c.fecha ?? '').slice(0, 4)
      if (y.length === 4) anos.add(y)
    }
    return Array.from(anos).toSorted()
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
      .toSorted(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([nombre, val]): [string, number] => [nombre.length > 26 ? nombre.slice(0, 26) + '…' : nombre, val])
  }, [ventas])

  const comprasPorProv = useMemo(() => {
    const tot: Record<string, number> = {}
    for (const c of compras) {
      const nombre = c.proveedor_nombre ?? 'Sin proveedor'
      tot[nombre] = (tot[nombre] ?? 0) + c.total
    }
    return Object.entries(tot).toSorted(([, a], [, b]) => b - a)
  }, [compras])

  const mermasPorMotivo = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of mermas) counts[m.motivo] = (counts[m.motivo] ?? 0) + 1
    return counts
  }, [mermas])

  // Datos para el gráfico de precio unitario de compra
  const { productosFiltrados, proveedoresDeProducto, precioDatasets, precioLabels } = useMemo(() => {
    // Todos los productos únicos que aparecen en líneas de compra
    const productosSet = new Set<string>()
    for (const c of compras) {
      for (const l of c.lineas) {
        if (l.producto_nombre) productosSet.add(l.producto_nombre)
      }
    }
    const productosLista = Array.from(productosSet).toSorted()

    const filtrados = busquedaProducto
      ? productosLista.filter((p) => normaliza(p).includes(normaliza(busquedaProducto)))
      : productosLista

    if (!filtroProducto) {
      return { productosFiltrados: filtrados, proveedoresDeProducto: [], precioDatasets: [], precioLabels: [] }
    }

    // Proveedores que tienen ese producto
    const provSet = new Set<string>()
    for (const c of compras) {
      if (c.lineas.some((l) => l.producto_nombre === filtroProducto)) {
        provSet.add(c.proveedor_nombre ?? 'Sin proveedor')
      }
    }
    const proveedores = Array.from(provSet).toSorted()

    // Puntos por proveedor: { fecha → precio }
    const porProv: Record<string, { fecha: string; precio: number }[]> = {}
    for (const c of compras) {
      const prov = c.proveedor_nombre ?? 'Sin proveedor'
      if (filtroProv && prov !== filtroProv) continue
      const linea = c.lineas.find((l) => l.producto_nombre === filtroProducto)
      if (!linea) continue
      const fecha = (c.fecha ?? '').slice(0, 10)
      if (!fecha) continue
      if (!porProv[prov]) porProv[prov] = []
      porProv[prov].push({ fecha, precio: linea.precio_unitario })
    }

    // Eje X: todas las fechas únicas ordenadas
    const fechasSet = new Set<string>()
    for (const pts of Object.values(porProv)) pts.forEach((p) => fechasSet.add(p.fecha))
    const fechas = Array.from(fechasSet).toSorted()

    const provKeys = Object.keys(porProv)
    const series = provKeys.map((prov, i) => {
      const mapaFecha: Record<string, number> = {}
      for (const { fecha, precio } of porProv[prov] ?? []) mapaFecha[fecha] = precio
      return {
        label: prov,
        data: fechas.map((f) => mapaFecha[f] ?? null),
        borderColor: PALETTE[i % PALETTE.length] ?? '#0F7B92',
        backgroundColor: (PALETTE[i % PALETTE.length] ?? '#0F7B92') + '22',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: false,
        spanGaps: true,
      }
    })

    return {
      productosFiltrados: filtrados,
      proveedoresDeProducto: proveedores,
      precioDatasets: series,
      precioLabels: fechas,
    }
  }, [compras, filtroProducto, filtroProv, busquedaProducto])

  const evolucionTitulo = useMemo(() => {
    if (!filtroAnio) return 'Evolución mensual — ingresos vs. gastos (últimos 12 meses)'
    if (filtroMesDesde === 1 && filtroMesHasta === 12) return `Evolución mensual — ingresos vs. gastos (${filtroAnio})`
    const mesD = MESES_CORTOS[filtroMesDesde - 1] ?? ''
    const mesH = MESES_CORTOS[filtroMesHasta - 1] ?? ''
    return `Evolución mensual — ingresos vs. gastos (${mesD}–${mesH} ${filtroAnio})`
  }, [filtroAnio, filtroMesDesde, filtroMesHasta])

  // Opciones de gráficos (memoizadas con el tema para no re-renderizar en cada frame)
  const evolucionOpts = useMemo(
    (): ChartOptions<'bar'> => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: t.legend, usePointStyle: true, boxWidth: 10, padding: 16 } },
        tooltip: {
          ...tooltipPlugin(t),
          callbacks: { label: (ctx) => ` ${fmtMoneda(ctx.parsed.y ?? 0)}` },
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
          callbacks: { label: (ctx) => ` ${fmtMoneda(ctx.parsed.x ?? 0)}` },
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

  const precioOpts = useMemo(
    (): ChartOptions<'line'> => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: t.legend, usePointStyle: true, boxWidth: 10, padding: 14 } },
        tooltip: {
          ...tooltipPlugin(t),
          callbacks: { label: (ctx) => ` ${fmtMoneda(ctx.parsed.y ?? 0)} / ud` },
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

  if (lc || lv || lm || la) return <CenteredSpinner />
  const errorCarga = ec ?? ev ?? em ?? ea
  if (errorCarga) {
    return (
      <ErrorState
        error={errorCarga}
        onRetry={() => void Promise.all([rc(), rv(), rm(), ra()])}
        isRetrying={fc || fv || fm || fa}
        recurso="el análisis"
      />
    )
  }

  const totalIngresos = ventas.reduce((s, v) => s + v.total, 0)
  const totalGastos = compras.reduce((s, c) => s + c.total, 0)
  const margen = totalIngresos - totalGastos
  const bajosMinimos = almacen.filter((a) => a.stock_minimo > 0 && a.stock_actual < a.stock_minimo)

  const mesesLabels = meses.map((m) => {
    const [y, mo] = m.split('-')
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
      <Section
        title={evolucionTitulo}
        actions={
          <>
            <select
              value={filtroAnio}
              onChange={(e) => {
                setFiltroAnio(e.target.value)
                setFiltroMesDesde(1)
                setFiltroMesHasta(12)
              }}
              className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Últimos 12 meses</option>
              {anosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={filtroMesDesde}
              onChange={(e) => {
                const val = Number(e.target.value)
                setFiltroMesDesde(val)
                if (filtroMesHasta < val) setFiltroMesHasta(val)
              }}
              disabled={!filtroAnio}
              className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
            >
              {MESES_CORTOS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-sm text-ink-muted">–</span>
            <select
              value={filtroMesHasta}
              onChange={(e) => setFiltroMesHasta(Number(e.target.value))}
              disabled={!filtroAnio}
              className="rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
            >
              {MESES_CORTOS.map((m, i) => (
                <option key={i} value={i + 1} disabled={i + 1 < filtroMesDesde}>
                  {m}
                </option>
              ))}
            </select>
          </>
        }
      >
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

      {/* Mermas + Precio unitario + Bajo mínimos */}
      <div className="grid gap-5 md:grid-cols-3">
        <Section title="Mermas registradas por motivo">
          {mermas.length === 0 ? (
            <p className="py-4 text-sm text-ink-muted">Sin mermas registradas.</p>
          ) : (
            <div style={{ height: 180 }}>
              <Doughnut
                options={mermaOpts}
                data={{
                  labels: Object.keys(mermasPorMotivo).map((k) => MOTIVO_LABEL[k] ?? k),
                  datasets: [
                    {
                      data: Object.values(mermasPorMotivo),
                      backgroundColor: ['rgba(245,158,11,0.85)', 'rgba(232,93,74,0.85)', 'rgba(15,123,146,0.85)'],
                      borderWidth: 0,
                    },
                  ],
                }}
              />
            </div>
          )}
        </Section>

        <Section title="Evolución de precio de compra">
          <div className="mb-3 flex flex-wrap gap-2">
            <div ref={comboRef} className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar producto…"
                value={comboAbierto ? busquedaProducto : filtroProducto || busquedaProducto}
                onFocus={() => {
                  setBusquedaProducto('')
                  setComboAbierto(true)
                }}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value)
                  if (filtroProducto) {
                    setFiltroProducto('')
                    setFiltroProv('')
                  }
                  setComboAbierto(true)
                }}
                className="w-full rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
              {comboAbierto && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-surface shadow-md">
                  {productosFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-ink-muted">Sin resultados</div>
                  ) : (
                    productosFiltrados.map((p) => (
                      <div
                        key={p}
                        onMouseDown={() => {
                          setFiltroProducto(p)
                          setBusquedaProducto('')
                          setFiltroProv('')
                          setComboAbierto(false)
                        }}
                        className={`cursor-pointer px-3 py-2 text-sm hover:bg-primary/10 ${p === filtroProducto ? 'font-semibold text-primary' : 'text-ink'}`}
                      >
                        {p}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <select
              value={filtroProv}
              onChange={(e) => setFiltroProv(e.target.value)}
              disabled={!filtroProducto}
              className="flex-1 rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
            >
              <option value="">— Todos los proveedores —</option>
              {proveedoresDeProducto.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {!filtroProducto ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              Selecciona un producto para ver la evolución de su precio de compra.
            </p>
          ) : precioLabels.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Sin compras registradas para este producto.</p>
          ) : (
            <div style={{ height: 180 }}>
              <Line options={precioOpts} data={{ labels: precioLabels, datasets: precioDatasets }} />
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
