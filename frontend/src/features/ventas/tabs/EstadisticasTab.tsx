import { useState } from 'react'
import type { ReactNode } from 'react'
import '@/lib/chart/chartSetup'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { monedaCompacta, porcentaje } from '@/features/stock/analisisStock'
import { useChartTheme, tooltipPlugin } from '@/lib/chart/useChartTheme'
import type { ChartTheme } from '@/lib/chart/useChartTheme'
import { colorCategorico, conAlfa } from '@/lib/chart/paleta'
import { fmtMoneda } from '@/lib/format/moneda'
import { fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { cn } from '@/lib/cn'
import type { EstadisticasVentas } from '@/types'
import { useEstadisticasVentas } from '../hooks/useVentas'
import {
  fmtPorcentaje,
  fmtUnidades,
  granularidadDe,
  puntos,
  rangoAnterior,
  rangoDe,
  repartoMetodos,
  serieEvolucion,
  textoRango,
  topProductos,
  variacion,
  ventasPorCategoria,
  ventasPorDiaSemana,
  ventasPorHora,
} from '../estadisticas'
import type { Criterio, Rango } from '../estadisticas'
import { PERIODO_INICIAL, PERIODOS } from '../periodos'
import type { BusquedaEstadisticas, Periodo } from '../periodos'

const TOP = 10

const CRITERIOS: { valor: Criterio; etiqueta: string }[] = [
  { valor: 'neto', etiqueta: 'Importe' },
  { valor: 'unidades', etiqueta: 'Unidades' },
  { valor: 'margen', etiqueta: 'Margen' },
]

const TITULO_EVOLUCION = { dia: 'Evolución diaria', semana: 'Evolución semanal', mes: 'Evolución mensual' }

function tickets(n: number): string {
  return n === 1 ? '1 ticket' : `${n} tickets`
}

const campo =
  'rounded-lg border border-border bg-app px-2.5 py-1.5 text-sm text-ink focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30'

// --- Piezas de la pantalla ---

function Panel({ titulo, acciones, children }: { titulo: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-card bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">{titulo}</h3>
        {acciones}
      </div>
      {children}
    </section>
  )
}

function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-muted">{children}</p>
}

function Segmentos<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: readonly { valor: T; etiqueta: string }[]
  valor: T
  onChange: (valor: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
            o.valor === valor
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface text-ink-muted hover:text-ink',
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

interface Cambio {
  texto: string
  // Si el cambio es bueno para la tienda (sube la venta, baja la devolución).
  bueno: boolean | null
}

function cambioPorcentual(opciones: { actual: number; anterior: number; menosEsMejor?: boolean }): Cambio | null {
  const v = variacion(opciones)
  if (v === null) return null
  const signo = v > 0 ? '+' : ''
  return {
    texto: `${signo}${fmtPorcentaje(v)}`,
    bueno: Math.abs(v) < 0.05 ? null : v > 0 !== (opciones.menosEsMejor ?? false),
  }
}

function cambioEnPuntos(opciones: { actual: number | null; anterior: number | null; menosEsMejor?: boolean }) {
  const p = puntos(opciones)
  if (p === null) return null
  const signo = p > 0 ? '+' : ''
  return {
    texto: `${signo}${p.toFixed(1).replace('.', ',')} pts`,
    bueno: Math.abs(p) < 0.05 ? null : p > 0 !== (opciones.menosEsMejor ?? false),
  }
}

function Kpi({
  etiqueta,
  valor,
  detalle,
  cambio,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  cambio: Cambio | null
}) {
  const color = cambio?.bueno === true ? 'text-success' : cambio?.bueno === false ? 'text-danger' : 'text-ink-muted'
  return (
    <div className="min-w-0 rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{etiqueta}</div>
      <div className="mt-1 truncate text-xl font-extrabold tabular-nums sm:text-2xl">{valor}</div>
      {cambio !== null && (
        <div className={`mt-0.5 text-[13px] font-semibold tabular-nums ${color}`}>{cambio.texto}</div>
      )}
      {detalle !== undefined && <div className="mt-0.5 text-[12px] leading-snug text-ink-muted">{detalle}</div>}
    </div>
  )
}

interface Fila {
  clave: string
  etiqueta: ReactNode
  valor: number
  texto: string
  detalle?: string
}

// Lista ordenada con una barra proporcional al primero; se lee mejor que un gráfico con nombres largos.
function Ranking({ filas }: { filas: Fila[] }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 0)
  return (
    <ol className="flex flex-col gap-3">
      {filas.map((f, i) => (
        <li key={f.clave} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-5 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-muted">
                {i + 1}
              </span>
              <span className="min-w-0 truncate font-medium">{f.etiqueta}</span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <span className="font-bold">{f.texto}</span>
              {f.detalle !== undefined && (
                <span className="ml-2 text-[12px] text-ink-muted max-sm:ml-0 max-sm:block">{f.detalle}</span>
              )}
            </span>
          </div>
          <div className="ml-7 mt-1 h-1.5 overflow-hidden rounded-full bg-primary-light">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${maximo > 0 ? Math.max((f.valor / maximo) * 100, 0) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}

// --- Gráficos ---

function opcionesBarras(t: ChartTheme, conLeyenda: boolean): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: conLeyenda, labels: { color: t.legend, usePointStyle: true, boxWidth: 10, padding: 16 } },
      tooltip: {
        ...tooltipPlugin(t),
        callbacks: { label: (ctx) => ` ${ctx.dataset.label ?? ''}: ${fmtMoneda(ctx.parsed.y ?? 0)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.ticks, maxRotation: 0, autoSkip: true } },
      y: { grid: { color: t.grid }, ticks: { color: t.ticks, callback: (v) => monedaCompacta(Number(v)) } },
    },
  }
}

function opcionesDonut(t: ChartTheme, total: number): ChartOptions<'doughnut'> {
  return {
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
        callbacks: {
          label: (ctx) => {
            const importe = typeof ctx.raw === 'number' ? ctx.raw : 0
            const parte = porcentaje({ parte: importe, total })
            return ` ${fmtMoneda(importe)}${parte === null ? '' : ` (${fmtPorcentaje(parte)})`}`
          },
        },
      },
    },
  }
}

// --- Pantalla ---

function KpisVentas({ actual, anterior }: { actual: EstadisticasVentas; anterior: EstadisticasVentas | undefined }) {
  const a = actual.resumen
  const p = anterior?.resumen
  const margenPct = porcentaje({ parte: a.margen, total: a.ingresos_con_coste })
  const tasaDevolucion = porcentaje({ parte: a.devuelto, total: a.vendido })
  const descuentoPct = porcentaje({ parte: a.descuentos, total: a.bruto })
  const conCliente = porcentaje({ parte: actual.clientes.con_cliente.neto, total: a.neto })
  const comparar = (valor: (r: EstadisticasVentas['resumen']) => number, menosEsMejor = false) =>
    p === undefined ? null : cambioPorcentual({ actual: valor(a), anterior: valor(p), menosEsMejor })
  const sinCoste = a.lineas_sin_coste === 1 ? '1 línea sin coste' : `${a.lineas_sin_coste} líneas sin coste`
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        etiqueta="Ventas netas"
        valor={fmtMoneda(a.neto)}
        cambio={comparar((r) => r.neto)}
        detalle="sin anuladas y descontando lo devuelto"
      />
      <Kpi
        etiqueta="Tickets"
        valor={String(a.tickets)}
        cambio={comparar((r) => r.tickets)}
        detalle={
          a.num_anuladas === 0
            ? 'ninguno anulado'
            : `${a.num_anuladas} ${a.num_anuladas === 1 ? 'anulado' : 'anulados'} (${fmtMoneda(a.importe_anuladas)})`
        }
      />
      <Kpi etiqueta="Ticket medio" valor={fmtMoneda(a.ticket_medio)} cambio={comparar((r) => r.ticket_medio)} />
      <Kpi etiqueta="Unidades vendidas" valor={fmtUnidades(a.unidades)} cambio={comparar((r) => r.unidades)} />
      <Kpi
        etiqueta="Margen bruto"
        valor={fmtMoneda(a.margen)}
        cambio={comparar((r) => r.margen)}
        detalle={
          (margenPct === null ? '' : `${fmtPorcentaje(margenPct)} sobre lo vendido · `) +
          'estimado con el coste actual' +
          (a.lineas_sin_coste > 0 ? ` · ${sinCoste}` : '')
        }
      />
      <Kpi
        etiqueta="Tasa de devoluciones"
        valor={tasaDevolucion === null ? '-' : fmtPorcentaje(tasaDevolucion)}
        cambio={
          p === undefined
            ? null
            : cambioEnPuntos({
                actual: tasaDevolucion,
                anterior: porcentaje({ parte: p.devuelto, total: p.vendido }),
                menosEsMejor: true,
              })
        }
        detalle={`${fmtMoneda(a.devuelto)} en ${a.num_devoluciones} ${a.num_devoluciones === 1 ? 'devolución' : 'devoluciones'}`}
      />
      <Kpi
        etiqueta="Descuentos concedidos"
        valor={fmtMoneda(a.descuentos)}
        cambio={comparar((r) => r.descuentos, true)}
        detalle={descuentoPct === null ? undefined : `${fmtPorcentaje(descuentoPct)} del precio de venta`}
      />
      <Kpi
        etiqueta="Ventas con cliente"
        valor={conCliente === null ? '-' : fmtPorcentaje(conCliente)}
        cambio={
          anterior === undefined
            ? null
            : cambioEnPuntos({
                actual: conCliente,
                anterior: porcentaje({ parte: anterior.clientes.con_cliente.neto, total: anterior.resumen.neto }),
              })
        }
        detalle={`${actual.clientes.con_cliente.tickets} de ${tickets(a.tickets)}`}
      />
    </div>
  )
}

function Graficos({
  actual,
  anterior,
  rango,
  rangoPrevio,
}: {
  actual: EstadisticasVentas
  anterior: EstadisticasVentas | undefined
  rango: Rango
  rangoPrevio: Rango
}) {
  const t = useChartTheme()
  const granularidad = granularidadDe(rango)
  const unDia = rango.desde === rango.hasta
  const serie = serieEvolucion({ rango, porDia: actual.por_dia, granularidad })
  const seriePrevia =
    anterior === undefined ? [] : serieEvolucion({ rango: rangoPrevio, porDia: anterior.por_dia, granularidad })
  const semana = ventasPorDiaSemana(actual.por_dia)
  const horas = ventasPorHora(actual.por_hora)
  const metodos = repartoMetodos(actual.metodos)
  const totalMetodos = metodos.reduce((suma, m) => suma + m.importe, 0)
  const color = colorCategorico({ isDark: t.isDark, indice: 0 })
  const barras = (datos: { neto: number }[]) => ({
    label: 'Ventas netas',
    data: datos.map((d) => d.neto),
    backgroundColor: conAlfa({ color, alfa: 0.85 }),
    borderRadius: 4,
  })

  return (
    <>
      <Panel titulo={TITULO_EVOLUCION[granularidad]}>
        {unDia ? (
          <Vacio>Elige un periodo de varios días para ver la evolución. Abajo tienes las ventas por hora.</Vacio>
        ) : (
          <div style={{ height: 260 }}>
            <Bar
              options={opcionesBarras(t, true)}
              data={{
                labels: serie.map((s) => s.etiqueta),
                datasets: [
                  { ...barras(serie), label: 'Este periodo' },
                  {
                    label: `Anterior (${textoRango(rangoPrevio)})`,
                    data: serie.map((_, i) => seriePrevia[i]?.neto ?? null),
                    backgroundColor: conAlfa({ color: colorCategorico({ isDark: t.isDark, indice: 5 }), alfa: 0.45 }),
                    borderRadius: 4,
                  },
                ],
              }}
            />
          </div>
        )}
      </Panel>

      <div className={cn('grid gap-5', !unDia && 'md:grid-cols-2')}>
        {!unDia && (
          <Panel titulo="Por día de la semana">
            <div style={{ height: 220 }}>
              <Bar
                options={opcionesBarras(t, false)}
                data={{ labels: semana.map((d) => d.etiqueta), datasets: [barras(semana)] }}
              />
            </div>
          </Panel>
        )}
        <Panel titulo="Por hora del día">
          {horas.length === 0 ? (
            <Vacio>No hay ventas con hora de cobro en este periodo.</Vacio>
          ) : (
            <div style={{ height: 220 }}>
              <Bar
                options={opcionesBarras(t, false)}
                data={{ labels: horas.map((h) => h.etiqueta), datasets: [barras(horas)] }}
              />
            </div>
          )}
          {actual.sin_hora > 0 && (
            <p className="mt-2 text-[12px] text-ink-muted">
              {actual.sin_hora === 1
                ? '1 ticket registrado con otra fecha no tiene hora de cobro.'
                : `${actual.sin_hora} tickets registrados con otra fecha no tienen hora de cobro.`}
            </p>
          )}
        </Panel>
      </div>

      <Panel titulo="Cobrado por método de pago">
        {metodos.length === 0 ? (
          <Vacio>No hay cobros en este periodo.</Vacio>
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div style={{ height: 220 }}>
              <Doughnut
                options={opcionesDonut(t, totalMetodos)}
                data={{
                  labels: metodos.map((m) => m.etiqueta),
                  datasets: [
                    {
                      data: metodos.map((m) => m.importe),
                      backgroundColor: metodos.map((m) =>
                        conAlfa({ color: colorCategorico({ isDark: t.isDark, indice: m.indice }), alfa: 0.85 }),
                      ),
                      borderWidth: 0,
                    },
                  ],
                }}
              />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {metodos.map((m) => (
                <div key={m.clave} className="flex justify-between gap-3">
                  <span>{m.etiqueta}</span>
                  <span className="tabular-nums">
                    <span className="font-bold">{fmtMoneda(m.importe)}</span>
                    <span className="ml-2 text-[12px] text-ink-muted">
                      {fmtPorcentaje(porcentaje({ parte: m.importe, total: totalMetodos }) ?? 0)}
                    </span>
                  </span>
                </div>
              ))}
              <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                Lo cobrado en los tickets del periodo, antes de devoluciones. «Sin indicar» son ventas antiguas sin
                forma de pago.
              </p>
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}

function Rankings({ actual }: { actual: EstadisticasVentas }) {
  const [criterio, setCriterio] = useState<Criterio>('neto')
  const top = topProductos({ productos: actual.productos, criterio, limite: TOP })
  const categorias = ventasPorCategoria(actual.productos)
  const { con_cliente, anonimas, mejores } = actual.clientes
  const pctCliente = porcentaje({ parte: con_cliente.neto, total: con_cliente.neto + anonimas.neto })
  const detalleProducto = (p: (typeof top)[number]['producto']) => {
    if (criterio === 'unidades') return fmtMoneda(p.neto)
    if (criterio === 'margen') {
      const pct = porcentaje({ parte: p.margen ?? 0, total: p.neto })
      return pct === null ? undefined : fmtPorcentaje(pct)
    }
    return `${fmtUnidades(p.unidades)} ud`
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          titulo="Productos más vendidos"
          acciones={<Segmentos opciones={CRITERIOS} valor={criterio} onChange={setCriterio} />}
        >
          {top.length === 0 ? (
            <Vacio>{criterio === 'margen' ? 'Ningún producto vendido tiene coste.' : 'Sin productos vendidos.'}</Vacio>
          ) : (
            <Ranking
              filas={top.map(({ producto, valor }) => ({
                clave: String(producto.producto_id),
                etiqueta: producto.nombre,
                valor,
                texto: criterio === 'unidades' ? `${fmtUnidades(valor)} ud` : fmtMoneda(valor),
                detalle: detalleProducto(producto),
              }))}
            />
          )}
        </Panel>
        <Panel titulo="Ventas por categoría">
          {categorias.length === 0 ? (
            <Vacio>Sin productos vendidos.</Vacio>
          ) : (
            <Ranking
              filas={categorias.map((c) => ({
                clave: c.categoria,
                etiqueta: c.categoria,
                valor: c.neto,
                texto: fmtMoneda(c.neto),
                detalle: fmtPorcentaje(porcentaje({ parte: c.neto, total: actual.resumen.neto }) ?? 0),
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel titulo="Mejores clientes">
        <div className="mb-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-primary-light">
            <div className="h-full bg-primary" style={{ width: `${pctCliente ?? 0}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[13px]">
            <span>
              <span className="font-semibold">Con cliente:</span> {fmtMoneda(con_cliente.neto)} ·{' '}
              {tickets(con_cliente.tickets)}
              {pctCliente !== null && <span className="text-ink-muted"> ({fmtPorcentaje(pctCliente)})</span>}
            </span>
            <span>
              <span className="font-semibold">Anónimas:</span> {fmtMoneda(anonimas.neto)} · {tickets(anonimas.tickets)}
              {pctCliente !== null && <span className="text-ink-muted"> ({fmtPorcentaje(100 - pctCliente)})</span>}
            </span>
          </div>
        </div>
        {mejores.length === 0 ? (
          <Vacio>Ninguna venta del periodo tiene cliente asignado.</Vacio>
        ) : (
          <Ranking
            filas={mejores.map((c) => ({
              clave: String(c.paciente_id),
              etiqueta: (
                <Link
                  to="/pacientes/$id/compras"
                  params={{ id: String(c.paciente_id) }}
                  className="text-primary hover:underline"
                >
                  {c.nombre}
                </Link>
              ),
              valor: c.neto,
              texto: fmtMoneda(c.neto),
              detalle: `${tickets(c.tickets)} · última ${fmtFecha(c.ultima)}`,
            }))}
          />
        )}
      </Panel>
    </>
  )
}

export function EstadisticasTab() {
  const busqueda = useSearch({ from: '/_sesion/_app/ventas/estadisticas' })
  const navigate = useNavigate({ from: '/ventas/estadisticas' })
  // La fecha se fija al montar: leer el reloj durante el render no es puro.
  const [hoy] = useState(() => hoyLocal())
  const periodo = busqueda.periodo ?? PERIODO_INICIAL
  const rango = rangoDe({ busqueda, hoy })
  const rangoPrevio = rango === null ? null : rangoAnterior(periodo, rango)
  const actual = useEstadisticasVentas(rango)
  const anterior = useEstadisticasVentas(rangoPrevio)

  const cambiar = (nueva: BusquedaEstadisticas) => void navigate({ search: nueva, replace: true })
  const elegir = (valor: Periodo) =>
    cambiar(
      valor === 'personalizado'
        ? { periodo: valor, desde: rango?.desde ?? hoy, hasta: rango?.hasta ?? hoy }
        : { periodo: valor },
    )
  const fecha = (extremo: 'desde' | 'hasta', valor: string) => {
    const desde = extremo === 'desde' ? valor : (busqueda.desde ?? '')
    const hasta = extremo === 'hasta' ? valor : (busqueda.hasta ?? '')
    cambiar({ periodo: 'personalizado', ...(desde === '' ? {} : { desde }), ...(hasta === '' ? {} : { hasta }) })
  }

  const errorCarga = actual.error ?? anterior.error
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
        <Segmentos opciones={PERIODOS} valor={periodo} onChange={elegir} />
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              Desde
              <input
                type="date"
                className={campo}
                value={busqueda.desde ?? ''}
                max={busqueda.hasta ?? hoy}
                onChange={(e) => fecha('desde', e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              hasta
              <input
                type="date"
                className={campo}
                value={busqueda.hasta ?? ''}
                min={busqueda.desde}
                onChange={(e) => fecha('hasta', e.target.value)}
              />
            </label>
          </div>
        )}
        {rango === null ? (
          <p className="text-sm text-danger">Elige una fecha de inicio y otra de fin que no sea anterior.</p>
        ) : (
          <p className="text-[13px] text-ink-muted">
            <span className="font-semibold text-ink">{textoRango(rango)}</span>
            {rangoPrevio !== null && <> · comparado con {textoRango(rangoPrevio)}</>}
          </p>
        )}
      </div>

      {rango === null || rangoPrevio === null ? null : errorCarga ? (
        <ErrorState
          error={errorCarga}
          onRetry={() => void Promise.all([actual.refetch(), anterior.refetch()])}
          isRetrying={actual.isFetching || anterior.isFetching}
          recurso="las estadísticas"
        />
      ) : actual.data === undefined ? (
        <CenteredSpinner />
      ) : (
        <div className={cn('flex flex-col gap-5 transition-opacity', actual.isPlaceholderData && 'opacity-60')}>
          <KpisVentas actual={actual.data} anterior={anterior.isPlaceholderData ? undefined : anterior.data} />
          {actual.data.resumen.vendido === 0 ? (
            <div className="rounded-card bg-surface p-4 shadow-card">
              <Vacio>No hay ventas en este periodo.</Vacio>
            </div>
          ) : (
            <>
              <Graficos
                actual={actual.data}
                anterior={anterior.isPlaceholderData ? undefined : anterior.data}
                rango={rango}
                rangoPrevio={rangoPrevio}
              />
              <Rankings actual={actual.data} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
