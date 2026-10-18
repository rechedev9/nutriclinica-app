import { Link } from '@tanstack/react-router'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/cn'
import { fmtFecha } from '@/lib/format/fecha'
import { useMovimientos } from '../hooks/useStock'
import {
  detalleMovimiento,
  ETIQUETA_MOVIMIENTO,
  fmtCantidad,
  fmtCantidadConSigno,
  totalesMovimientos,
} from '../movimientos'

interface Props {
  // Producto cuyos movimientos se ven; null con el modal cerrado.
  productoId: number | null
  onClose: () => void
  onContar: (productoId: number) => void
}

export function MovimientosModal({ productoId, onClose, onContar }: Props) {
  return (
    <Modal
      open={productoId !== null}
      onClose={onClose}
      title="Movimientos del producto"
      className="w-[min(900px,94vw)]"
    >
      {productoId !== null && <Kardex productoId={productoId} onContar={onContar} />}
    </Modal>
  )
}

function Cifra({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[12px] text-ink-muted">{label}</div>
      <div className={cn('text-lg font-extrabold tabular-nums', className)}>{value}</div>
    </div>
  )
}

function Kardex({ productoId, onContar }: { productoId: number; onContar: (productoId: number) => void }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useMovimientos(productoId)

  if (isLoading) return <CenteredSpinner />
  if (isError || !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los movimientos" />
  }

  const { producto, movimientos } = data
  const unidad = producto.unidad ?? 'ud'
  const totales = totalesMovimientos(movimientos)
  // Lo más reciente arriba: es lo que se busca al revisar un descuadre.
  const filas = movimientos.toReversed()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words text-base font-bold">{producto.nombre}</div>
          <div className="text-sm text-ink-muted">
            {producto.activo === 1 ? 'Ordenados del más reciente al más antiguo' : 'Producto dado de baja'}
          </div>
        </div>
        {producto.activo === 1 && (
          <Button variant="outline" size="sm" onClick={() => onContar(producto.id)}>
            Contar unidades
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra label="Stock actual" value={`${fmtCantidad(producto.stock_actual)} ${unidad}`} />
        <Cifra label="Entradas" value={fmtCantidadConSigno(totales.entradas)} className="text-success" />
        <Cifra label="Salidas" value={fmtCantidad(-totales.salidas)} className="text-danger" />
        <Cifra label="Ajustes de recuento" value={fmtCantidadConSigno(totales.ajustes)} />
      </div>

      {filas.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-3 py-8 text-center text-sm text-ink-muted">
          Este producto aún no tiene movimientos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Movimiento</th>
                <th className="px-3 py-2 font-semibold">Detalle</th>
                <th className="px-3 py-2 font-semibold">Usuario</th>
                <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                <th className="px-3 py-2 text-right font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m, i) => (
                <tr
                  key={`${m.tipo}-${m.referencia_id}-${filas.length - i}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-ink-muted">
                    {fmtFecha(m.fecha)}
                    {m.momento && <span className="ml-1 text-[12px]">{m.momento.slice(11, 16)}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">
                    {ETIQUETA_MOVIMIENTO[m.tipo]}
                    {m.ticket && (
                      <Link
                        to="/ventas/historial"
                        search={{ ticket: m.ticket }}
                        className="ml-1.5 text-[12px] font-normal text-primary hover:underline"
                      >
                        {m.ticket}
                      </Link>
                    )}
                  </td>
                  <td className="max-w-[16rem] px-3 py-2 text-ink-muted">
                    <div className="truncate" title={detalleMovimiento(m)}>
                      {detalleMovimiento(m)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{m.usuario ?? ''}</td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums',
                      m.cantidad > 0 && 'text-success',
                      m.cantidad < 0 && 'text-danger',
                      m.cantidad === 0 && 'text-ink-muted',
                    )}
                  >
                    {fmtCantidadConSigno(m.cantidad)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">
                    {fmtCantidad(m.saldo)} <span className="font-normal text-ink-muted">{unidad}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
