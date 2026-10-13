import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { PacienteModal } from '@/features/pacientes/components/PacienteModal'
import { pendientesOrdenados, seguimiento } from '@/features/pacientes/seguimiento'
import { estadoDe, productosEnAlerta } from '@/features/stock/estado-almacen'
import { useAlmacen, useVentas } from '@/features/stock/hooks/useStock'
import { VentaModal } from '@/features/stock/components/VentaModal'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/cn'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { resumenLineas } from '@/lib/format/texto'
import { fechaLarga, resumenDia, ventasDelMes } from './calculos'

const MAX_PENDIENTES = 6
const MAX_PRODUCTOS = 6
const MAX_VENTAS = 5

const enlaceSutil =
  'rounded-lg text-[13px] font-semibold text-primary transition-colors duration-150 ease-out [@media(hover:hover)]:hover:underline'

const filaEnlace =
  'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-surface-2'

export function InicioPage() {
  const [clienteAbierto, setClienteAbierto] = useState(false)
  const [ventaAbierta, setVentaAbierta] = useState(false)
  const [hoy] = useState(() => new Date())

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{fechaLarga(hoy)}</h2>
          <Resumen hoy={hoy} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setVentaAbierta(true)}>
            + Nueva venta
          </Button>
          <Button onClick={() => setClienteAbierto(true)}>+ Nuevo cliente</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevisionPendiente hoy={hoy} />
        <Tienda />
      </div>
      <UltimasVentas hoy={hoy} />

      <PacienteModal open={clienteAbierto} onClose={() => setClienteAbierto(false)} />
      <VentaModal open={ventaAbierta} onClose={() => setVentaAbierta(false)} />
    </div>
  )
}

function Resumen({ hoy }: { hoy: Date }) {
  const { data: clientes } = usePacientes()
  const { data: almacen } = useAlmacen()
  if (!clientes || !almacen) return <p className="mt-0.5 text-sm text-ink-muted">Lo que necesita tu atención hoy.</p>
  const texto = resumenDia({
    pendientes: pendientesOrdenados(clientes, hoy).length,
    productos: productosEnAlerta(almacen).length,
  })
  return <p className="mt-0.5 text-sm text-ink-muted">{texto}</p>
}

function Tarjeta({ titulo, enlace, children }: { titulo: string; enlace?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">{titulo}</h3>
        {enlace}
      </div>
      {children}
    </section>
  )
}

function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-muted">{children}</p>
}

function RevisionPendiente({ hoy }: { hoy: Date }) {
  const { data: clientes, isLoading, isError, error, refetch, isFetching } = usePacientes()

  const pendientes = clientes ? pendientesOrdenados(clientes, hoy) : []
  const enlace =
    pendientes.length > 0 ? (
      <Link to="/pacientes" search={{ pendientes: 1 }} className={enlaceSutil}>
        Ver todos
        <span className="tabular-nums"> ({pendientes.length})</span>
      </Link>
    ) : undefined

  return (
    <Tarjeta titulo="Revisión pendiente" enlace={enlace}>
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
          recurso="los clientes"
          className="p-6"
        />
      ) : !clientes || clientes.length === 0 ? (
        <Vacio>Aún no hay clientes. Crea el primero con «Nuevo cliente».</Vacio>
      ) : pendientes.length === 0 ? (
        <Vacio>Todos los clientes tienen la revisión al día.</Vacio>
      ) : (
        <ul className="flex flex-col">
          {pendientes.slice(0, MAX_PENDIENTES).map((c) => {
            const seg = seguimiento(c, hoy)
            return (
              <li key={c.id}>
                <Link to="/pacientes/$id/revisiones" params={{ id: String(c.id) }} className={filaEnlace}>
                  <Avatar nombre={c.nombre} className="h-9 w-9 text-sm" />
                  <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                    <span className="min-w-0 truncate font-semibold sm:flex-1">{c.nombre}</span>
                    <span
                      title={c.ultima_revision ? fmtFecha(c.ultima_revision) : undefined}
                      className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-amber-600 dark:text-amber-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      {seg.texto}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}

function Tienda() {
  const { data: almacen, isLoading, isError, error, refetch, isFetching } = useAlmacen()

  const alertas = almacen ? productosEnAlerta(almacen) : []
  const visibles = alertas.slice(0, MAX_PRODUCTOS)
  const restantes = alertas.length - visibles.length

  return (
    <Tarjeta
      titulo="Tienda"
      enlace={
        <Link to="/stock/almacen" className={enlaceSutil}>
          Ver almacén
        </Link>
      }
    >
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
          recurso="el almacén"
          className="p-6"
        />
      ) : alertas.length === 0 ? (
        <Vacio>Todo el stock está por encima del mínimo. Nada que reponer.</Vacio>
      ) : (
        <>
          <p className="mb-1 text-[13px] text-ink-muted">Productos agotados o bajo mínimo</p>
          <ul className="flex flex-col">
            {visibles.map((p) => {
              const agotado = estadoDe(p.stock_actual, p.stock_minimo) === 'agotado'
              return (
                <li key={p.id}>
                  <Link to="/stock/almacen" className={filaEnlace}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.nombre}</span>
                      <span className="block text-[13px] tabular-nums text-ink-muted">
                        {p.stock_actual} en stock · mínimo {p.stock_minimo}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold',
                        agotado ? 'bg-danger/10 text-danger' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {agotado ? 'Agotado' : 'Bajo mínimo'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {restantes > 0 && (
            <Link to="/stock/almacen" className={cn(enlaceSutil, 'mt-2 self-start px-2')}>
              <span className="tabular-nums">+{restantes}</span> más en el almacén
            </Link>
          )}
        </>
      )}
    </Tarjeta>
  )
}

function UltimasVentas({ hoy }: { hoy: Date }) {
  const { data: ventas, isLoading, isError, error, refetch, isFetching } = useVentas()

  const mes = ventas ? ventasDelMes(ventas, hoy) : null

  return (
    <Tarjeta
      titulo="Últimas ventas"
      enlace={
        <Link to="/stock/ventas" className={enlaceSutil}>
          Ver todas
        </Link>
      }
    >
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
          recurso="las ventas"
          className="p-6"
        />
      ) : !ventas || ventas.length === 0 ? (
        <Vacio>Aún no hay ventas. Registra la primera con «Nueva venta».</Vacio>
      ) : (
        <>
          {mes && (
            <div className="mb-2 flex items-baseline gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <span className="text-2xl font-extrabold tabular-nums">{fmtMoneda(mes.total)}</span>
              <span className="text-[13px] text-ink-muted">
                vendidos este mes ·{' '}
                <span className="tabular-nums">{mes.cantidad === 1 ? '1 venta' : `${mes.cantidad} ventas`}</span>
              </span>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {ventas.slice(0, MAX_VENTAS).map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-2 py-2">
                <span className="w-[84px] shrink-0 text-[13px] tabular-nums text-ink-muted">{fmtFecha(v.fecha)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{resumenLineas(v.lineas)}</span>
                <span className="shrink-0 font-semibold tabular-nums">{fmtMoneda(v.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tarjeta>
  )
}
