import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePacienteContext } from '@/features/pacientes/tabs/context'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { resumenVentas } from './filtros'
import { useVentas } from './hooks/useVentas'
import { ListaVentas } from './components/ListaVentas'
import { VentaDetalleModal } from './components/VentaDetalleModal'

const botonPrimario =
  'rounded-lg bg-primary px-4 py-2 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark'

export function ComprasClienteTab() {
  const p = usePacienteContext()
  const { data, isLoading, isError, error, refetch, isFetching } = useVentas(p.id)
  const [abierta, setAbierta] = useState<number | null>(null)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="las compras" />

  const ventas = data ?? []
  const nueva = (
    <Link to="/ventas/caja" search={{ cliente: p.id }} className={botonPrimario}>
      + Nueva venta
    </Link>
  )
  if (ventas.length === 0) {
    return (
      <EmptyState
        title="Sin compras"
        subtitle="Lo que compre este cliente en la tienda aparecerá aquí."
        action={nueva}
      />
    )
  }

  const cifras = resumenVentas(ventas)
  const ultima = ventas.find((v) => v.estado !== 'anulada')

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Compras</h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            {cifras.num_ventas === 1 ? '1 compra' : `${cifras.num_ventas} compras`} ·{' '}
            <span className="tabular-nums">{fmtMoneda(cifras.neto)}</span> en total
            {ultima && ` · última el ${fmtFecha(ultima.fecha)}`}
          </p>
        </div>
        {nueva}
      </div>
      <ListaVentas ventas={ventas} onAbrir={setAbierta} conCliente={false} />
      {abierta !== null && <VentaDetalleModal ventaId={abierta} onClose={() => setAbierta(null)} />}
    </div>
  )
}
