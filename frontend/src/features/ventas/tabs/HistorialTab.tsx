import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { diasDesde, fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { cn } from '@/lib/cn'
import { METODOS } from '../carrito'
import { SIN_FILTRO, agruparPorDia, filtrarVentas, resumenVentas } from '../filtros'
import type { FiltroVentas } from '../filtros'
import { useVentas } from '../hooks/useVentas'
import { ListaVentas } from '../components/ListaVentas'
import { SITUACIONES } from '../components/SituacionBadge'
import { VentaDetalleModal } from '../components/VentaDetalleModal'

const POR_PAGINA = 100

function haceDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return hoyLocal(d)
}

const RANGOS = [
  { etiqueta: 'Hoy', desde: () => hoyLocal() },
  { etiqueta: '7 días', desde: () => haceDias(6) },
  { etiqueta: 'Este mes', desde: () => `${hoyLocal().slice(0, 7)}-01` },
  { etiqueta: 'Todo', desde: () => '' },
]

function nombreDia(fecha: string): string {
  if (fecha === '') return 'Sin fecha'
  const dias = diasDesde(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const semana = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long' })
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${fmtFecha(fecha)}`
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{etiqueta}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{valor}</div>
    </div>
  )
}

export function HistorialTab() {
  const { ticket } = useSearch({ from: '/_sesion/_app/ventas/historial' })
  const { data, isLoading, isError, error, refetch, isFetching } = useVentas()
  const { data: clientes = [] } = usePacientes()
  const [filtro, setFiltro] = useState<FiltroVentas>({ ...SIN_FILTRO, texto: ticket ?? '' })
  const [abierta, setAbierta] = useState<number | null>(null)
  const [visibles, setVisibles] = useState(POR_PAGINA)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="las ventas" />

  const ventas = data ?? []
  const filtradas = filtrarVentas(ventas, filtro)
  const cifras = resumenVentas(filtradas)
  const hayFiltro = JSON.stringify(filtro) !== JSON.stringify(SIN_FILTRO)
  // Las cifras de cada día salen de todas sus ventas filtradas, aunque «Ver más» aún no las muestre.
  const cifrasDia = new Map(agruparPorDia(filtradas).map((g) => [g.fecha, resumenVentas(g.ventas)]))

  function cambiar(cambio: Partial<FiltroVentas>) {
    setFiltro((f) => ({ ...f, ...cambio }))
    setVisibles(POR_PAGINA)
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra etiqueta="Ventas" valor={String(cifras.num_ventas)} />
        <Cifra etiqueta="Vendido" valor={fmtMoneda(cifras.vendido)} />
        <Cifra etiqueta="Devuelto" valor={fmtMoneda(cifras.devuelto)} />
        <Cifra etiqueta="Neto" valor={fmtMoneda(cifras.neto)} />
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-surface p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Buscar por nº de ticket, cliente o producto"
            placeholder="Nº de ticket, cliente o producto…"
            className="min-w-56 flex-1"
            value={filtro.texto}
            onChange={(e) => cambiar({ texto: e.target.value })}
          />
          <div className="flex gap-1" role="group" aria-label="Periodo">
            {RANGOS.map((r) => {
              const activo = filtro.desde === r.desde() && filtro.hasta === ''
              return (
                <button
                  key={r.etiqueta}
                  type="button"
                  onClick={() => cambiar({ desde: r.desde(), hasta: '' })}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    activo ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-surface-2',
                  )}
                >
                  {r.etiqueta}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-ink-muted">
            Desde
            <Input
              type="date"
              className="w-auto py-1.5"
              value={filtro.desde}
              onChange={(e) => cambiar({ desde: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-1.5 text-ink-muted">
            Hasta
            <Input
              type="date"
              className="w-auto py-1.5"
              value={filtro.hasta}
              onChange={(e) => cambiar({ hasta: e.target.value })}
            />
          </label>
          <Select
            aria-label="Cliente"
            className="w-auto py-1.5"
            value={filtro.cliente}
            onChange={(e) => cambiar({ cliente: e.target.value })}
          >
            <option value="">Todos los clientes</option>
            <option value="sin">Sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Forma de pago"
            className="w-auto py-1.5"
            value={filtro.metodo}
            onChange={(e) => {
              const metodo = METODOS.find((m) => m.valor === e.target.value)?.valor
              cambiar({ metodo: metodo ?? (e.target.value === 'sin_indicar' ? 'sin_indicar' : '') })
            }}
          >
            <option value="">Cualquier pago</option>
            {METODOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
            <option value="sin_indicar">Sin indicar</option>
          </Select>
          <Select
            aria-label="Estado"
            className="w-auto py-1.5"
            value={filtro.situacion}
            onChange={(e) => cambiar({ situacion: SITUACIONES.find((s) => s.valor === e.target.value)?.valor ?? '' })}
          >
            <option value="">Cualquier estado</option>
            {SITUACIONES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.etiqueta}
              </option>
            ))}
          </Select>
          {hayFiltro && (
            <Button variant="ghost" size="sm" onClick={() => cambiar(SIN_FILTRO)}>
              Limpiar filtros
            </Button>
          )}
          {filtro.desde !== '' && filtro.hasta !== '' && filtro.desde > filtro.hasta && (
            <span role="alert" className="text-danger">
              «Desde» es posterior a «Hasta».
            </span>
          )}
        </div>
      </div>

      {ventas.length === 0 ? (
        <EmptyState title="Aún no hay ventas" subtitle="Las ventas que cobres en la Caja aparecerán aquí." />
      ) : filtradas.length === 0 ? (
        <EmptyState
          title="Ninguna venta coincide"
          subtitle="Prueba con otro periodo o quita algún filtro."
          action={
            <Button variant="outline" onClick={() => cambiar(SIN_FILTRO)}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          {cifras.num_anuladas > 0 && (
            <p className="text-[13px] text-ink-muted">
              {cifras.num_anuladas === 1 ? '1 venta anulada' : `${cifras.num_anuladas} ventas anuladas`}: no suman en
              las cifras.
            </p>
          )}
          {agruparPorDia(filtradas.slice(0, visibles)).map((g) => {
            const dia = cifrasDia.get(g.fecha)
            return (
              <section key={g.fecha} className="flex flex-col gap-2" aria-label={nombreDia(g.fecha)}>
                <h3 className="flex flex-wrap items-baseline justify-between gap-2 px-1 text-sm">
                  <span className="font-bold">{nombreDia(g.fecha)}</span>
                  {dia && (
                    <span className="tabular-nums text-ink-muted">
                      {dia.num_ventas === 1 ? '1 venta' : `${dia.num_ventas} ventas`} ·{' '}
                      <span className="font-semibold text-ink">{fmtMoneda(dia.neto)}</span>
                    </span>
                  )}
                </h3>
                <ListaVentas ventas={g.ventas} onAbrir={setAbierta} />
              </section>
            )
          })}
          {filtradas.length > visibles && (
            <Button variant="outline" className="self-center" onClick={() => setVisibles((n) => n + POR_PAGINA)}>
              Ver más ({filtradas.length - visibles} restantes)
            </Button>
          )}
        </>
      )}

      {abierta !== null && <VentaDetalleModal ventaId={abierta} onClose={() => setAbierta(null)} />}
    </div>
  )
}
