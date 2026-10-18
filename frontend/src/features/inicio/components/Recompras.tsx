import { Link } from '@tanstack/react-router'
import { useAlmacen } from '@/features/stock/hooks/useStock'
import { Avatar } from '@/components/ui/Avatar'
import { haceCuanto } from '@/lib/format/fecha'
import { useResumenInicio } from '../hooks/useResumenInicio'
import { oportunidadesRecompra } from '../recompra'
import type { ProductoRecompra, Recompra } from '../recompra'
import { SinDatos, Tarjeta, Vacio } from './Tarjeta'

const MAX_FILAS = 5

export function Recompras({ hoy }: { hoy: Date }) {
  const resumen = useResumenInicio()
  const { data: almacen } = useAlmacen()

  if (!resumen.data) {
    return (
      <Tarjeta titulo="Recompras">
        <SinDatos consultas={[resumen]} recurso="las compras de los clientes" />
      </Tarjeta>
    )
  }

  const recompras = oportunidadesRecompra(resumen.data.habitos, hoy)
  const agotados = new Set((almacen ?? []).filter((p) => p.stock_actual <= 0).map((p) => p.id))

  return (
    <Tarjeta titulo="Recompras" subtitulo="Clientes a los que se les acaba algo que compran con regularidad">
      {recompras.length === 0 ? (
        <Vacio>Ningún cliente tiene pendiente una compra habitual.</Vacio>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {recompras.slice(0, MAX_FILAS).map((r) => (
            <li key={r.paciente_id}>
              <FilaRecompra recompra={r} agotados={agotados} />
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}

function textoProducto(p: ProductoRecompra): string {
  return `${p.producto_nombre}: cada ~${p.intervalo} días, última ${haceCuanto(p.dias)}`
}

function FilaRecompra({ recompra, agotados }: { recompra: Recompra; agotados: ReadonlySet<number> }) {
  const id = String(recompra.paciente_id)
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Avatar nombre={recompra.paciente_nombre} className="h-9 w-9 text-sm" />
      <div className="min-w-0 flex-1">
        <Link
          to="/pacientes/$id/compras"
          params={{ id }}
          className="block truncate font-semibold [@media(hover:hover)]:hover:underline"
        >
          {recompra.paciente_nombre}
        </Link>
        {recompra.productos.map((p) => (
          <p key={p.producto_id} className="text-[13px] text-ink-muted">
            {textoProducto(p)}
            {agotados.has(p.producto_id) && <span className="ml-1.5 font-semibold text-danger">Agotado</span>}
          </p>
        ))}
      </div>
      <Link
        to="/ventas/caja"
        search={{ cliente: recompra.paciente_id }}
        className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-surface-2"
      >
        Vender
      </Link>
    </div>
  )
}
