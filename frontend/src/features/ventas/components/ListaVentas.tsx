import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { resumenLineas } from '@/lib/format/texto'
import { cn } from '@/lib/cn'
import { etiquetaMetodo } from '../carrito'
import { SituacionBadge } from './SituacionBadge'
import type { Venta } from '@/types'

function textoPago(venta: Venta): string {
  if (venta.pagos.length === 0) return 'Pago sin indicar'
  return venta.pagos.map((p) => etiquetaMetodo(p.metodo)).join(' + ')
}

export function ListaVentas(props: { ventas: Venta[]; onAbrir: (id: number) => void; conCliente?: boolean }) {
  const { ventas, onAbrir, conCliente = true } = props
  return (
    <ul className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
      {ventas.map((v) => {
        const anulada = v.estado === 'anulada'
        return (
          <li key={v.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => onAbrir(v.id)}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <div className="w-28 shrink-0">
                <div className="font-mono text-[13px] font-semibold">{v.numero}</div>
                <div className="text-xs tabular-nums text-ink-muted">
                  {fmtFecha(v.fecha)} {v.creado?.slice(11, 16)}
                </div>
              </div>
              <div className="min-w-0 flex-1 basis-56">
                {conCliente && (
                  <div className="truncate text-sm font-semibold">{v.paciente_nombre ?? 'Sin cliente'}</div>
                )}
                <div className="truncate text-[13px] text-ink-muted">{resumenLineas(v.lineas)}</div>
              </div>
              <div className="text-[13px] text-ink-muted">{textoPago(v)}</div>
              <SituacionBadge situacion={v.situacion} />
              <div className="ml-auto text-right">
                <div className={cn('font-bold tabular-nums', anulada && 'text-ink-muted line-through')}>
                  {fmtMoneda(v.total)}
                </div>
                {v.total_devuelto > 0 && (
                  <div className="text-xs tabular-nums text-ink-muted">-{fmtMoneda(v.total_devuelto)} devuelto</div>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
