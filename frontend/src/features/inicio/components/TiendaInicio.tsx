import { Link } from '@tanstack/react-router'
import { estadoDe, productosEnAlerta } from '@/features/stock/estado-almacen'
import { useAlmacen } from '@/features/stock/hooks/useStock'
import { cn } from '@/lib/cn'
import { haceCuanto } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { useResumenInicio } from '../hooks/useResumenInicio'
import { DIAS_SIN_MOVIMIENTO, productosSinMovimiento, valorParado } from '../sin-movimiento'
import { SinDatos, Tarjeta, Vacio, enlaceSutil, filaEnlace } from './Tarjeta'

const MAX_REPONER = 5
const MAX_PARADOS = 4

export function PorReponer() {
  const almacen = useAlmacen()

  const alertas = almacen.data ? productosEnAlerta(almacen.data) : []
  const visibles = alertas.slice(0, MAX_REPONER)
  const restantes = alertas.length - visibles.length

  return (
    <Tarjeta
      titulo="Por reponer"
      subtitulo="Productos agotados o bajo mínimo"
      enlace={
        <Link to="/stock/compras" className={cn(enlaceSutil, 'shrink-0')}>
          + Registrar compra
        </Link>
      }
    >
      {!almacen.data ? (
        <SinDatos consultas={[almacen]} recurso="el almacén" />
      ) : alertas.length === 0 ? (
        <Vacio>Todo el stock está por encima del mínimo. Nada que reponer.</Vacio>
      ) : (
        <>
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
                        {p.proveedor_nombre ? ` · ${p.proveedor_nombre}` : ''}
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

export function SinMovimiento({ hoy }: { hoy: Date }) {
  const almacen = useAlmacen()
  const resumen = useResumenInicio()

  const enlace = (
    <Link to="/stock/almacen" className={cn(enlaceSutil, 'shrink-0')}>
      Ver almacén
    </Link>
  )
  const subtitulo = `Con stock y sin ventas en ${DIAS_SIN_MOVIMIENTO} días`

  if (!almacen.data || !resumen.data) {
    return (
      <Tarjeta titulo="Sin movimiento" subtitulo={subtitulo} enlace={enlace}>
        <SinDatos consultas={[almacen, resumen]} recurso="el almacén" />
      </Tarjeta>
    )
  }

  const ultimasVentas = new Map(resumen.data.ultimas_ventas_producto.map((v) => [v.producto_id, v.fecha]))
  const parados = productosSinMovimiento({ almacen: almacen.data, ultimasVentas, hoy })
  const restantes = parados.length - MAX_PARADOS

  return (
    <Tarjeta titulo="Sin movimiento" subtitulo={subtitulo} enlace={enlace}>
      {parados.length === 0 ? (
        <Vacio>Todo lo que hay en el almacén se ha vendido en los últimos {DIAS_SIN_MOVIMIENTO} días.</Vacio>
      ) : (
        <>
          <div className="mb-2 flex items-baseline gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <span className="whitespace-nowrap text-2xl font-extrabold tabular-nums">
              {fmtMoneda(valorParado(parados))}
            </span>
            <span className="text-[13px] text-ink-muted">
              a precio de coste en{' '}
              <span className="tabular-nums">
                {parados.length === 1 ? '1 producto' : `${parados.length} productos`}
              </span>
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {parados.slice(0, MAX_PARADOS).map(({ producto, dias, valor }) => (
              <li key={producto.id} className="flex items-center gap-3 px-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{producto.nombre}</span>
                  <span className="block text-[13px] tabular-nums text-ink-muted">
                    {producto.stock_actual} en stock ·{' '}
                    {dias === null ? 'nunca vendido' : `última venta ${haceCuanto(dias)}`}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{fmtMoneda(valor)}</span>
              </li>
            ))}
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
