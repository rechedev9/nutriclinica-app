import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import type { ResumenInicio } from '@/types'
import { useResumenInicio } from '../hooks/useResumenInicio'
import { pulsoTienda, referenciasPulso } from '../pulso'
import { SinDatos, Tarjeta, enlaceSutil } from './Tarjeta'

export function PulsoTienda({ hoy }: { hoy: Date }) {
  const resumen = useResumenInicio()

  return (
    <Tarjeta
      titulo="Pulso de la tienda"
      subtitulo="Ventas netas (menos devoluciones), como en la caja"
      enlace={
        <Link to="/ventas/historial" className={enlaceSutil}>
          Ver ventas
        </Link>
      }
    >
      {resumen.data ? (
        <Contenido resumen={resumen.data} hoy={hoy} />
      ) : (
        <SinDatos consultas={[resumen]} recurso="las ventas" />
      )}
    </Tarjeta>
  )
}

function Contenido({ resumen, hoy }: { resumen: ResumenInicio; hoy: Date }) {
  const pulso = pulsoTienda(resumen.dias, hoy)
  const ref = referenciasPulso(hoy)

  return (
    <div className="flex flex-col gap-3">
      <EstadoCaja caja={resumen.caja} />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Cifra titulo="Hoy" ventas={pulso.hoy.num_ventas} {...pulso.hoy} referencia={ref.hoy} />
        <Cifra titulo="Esta semana" ventas={pulso.semana.num_ventas} {...pulso.semana} referencia={ref.semana} />
        <Cifra titulo="Este mes" ventas={pulso.mes.num_ventas} {...pulso.mes} referencia={ref.mes} />
        <Cifra titulo="Ticket medio del mes" {...pulso.ticket} referencia={ref.mes} />
      </div>
    </div>
  )
}

function EstadoCaja({ caja }: { caja: ResumenInicio['caja'] }) {
  const ultimo = caja.sin_cerrar.at(0)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <span
          className={cn('h-2 w-2 rounded-full', caja.cerrada_hoy ? 'bg-ink-muted' : 'bg-success')}
          aria-hidden="true"
        />
        {caja.cerrada_hoy ? 'Caja de hoy cerrada' : 'Caja de hoy abierta'}
      </span>
      {ultimo !== undefined && (
        <span className="inline-flex flex-wrap items-center gap-x-2 rounded-lg bg-amber-500/15 px-2 py-1 font-semibold text-amber-700 dark:text-amber-300">
          {caja.sin_cerrar.length === 1
            ? `La caja del ${fmtFecha(ultimo)} quedó sin cerrar`
            : `${caja.sin_cerrar.length} días con la caja sin cerrar (el último, ${fmtFecha(ultimo)})`}
          <Link to="/ventas/cierre" className="underline underline-offset-2">
            Ir al cierre
          </Link>
        </span>
      )}
    </div>
  )
}

function Cifra(props: {
  titulo: string
  actual: number | null
  anterior: number | null
  variacion: number | null
  referencia: string
  ventas?: number
}) {
  const { titulo, actual, anterior, variacion, referencia, ventas } = props
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="text-[13px] font-semibold text-ink-muted">
        {titulo}
        {ventas !== undefined && (
          <span className="font-normal tabular-nums"> · {ventas === 1 ? '1 venta' : `${ventas} ventas`}</span>
        )}
      </p>
      <p className="whitespace-nowrap text-2xl font-extrabold tabular-nums">
        {actual === null ? 'Sin ventas' : fmtMoneda(actual)}
      </p>
      <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-muted">
        {variacion !== null && <Variacion valor={variacion} />}
        <span>
          {anterior === null ? (
            `sin ventas ${referencia}`
          ) : (
            <>
              frente a <span className="whitespace-nowrap tabular-nums">{fmtMoneda(anterior)}</span> {referencia}
            </>
          )}
        </span>
      </p>
    </div>
  )
}

function Variacion({ valor }: { valor: number }) {
  const texto = valor > 0 ? `▲ ${valor} %` : valor < 0 ? `▼ ${Math.abs(valor)} %` : '= 0 %'
  const etiqueta = valor > 0 ? `Sube un ${valor} %` : valor < 0 ? `Baja un ${Math.abs(valor)} %` : 'Igual'
  return (
    <span
      aria-label={etiqueta}
      className={cn(
        'font-bold tabular-nums',
        valor > 0 ? 'text-success' : valor < 0 ? 'text-danger' : 'text-ink-muted',
      )}
    >
      {texto}
    </span>
  )
}
