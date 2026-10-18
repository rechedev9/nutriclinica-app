import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useMe } from '@/features/auth/useAuth'
import { intentar } from '@/lib/api/intentar'
import { fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { cn } from '@/lib/cn'
import { importeEditable, leerImporte, sumarImportes } from '../carrito'
import { diasSinCerrar } from '../cierre'
import { InformeCajaImprimible } from '../components/InformeCaja'
import { imprimirTicket } from '../components/Ticket'
import { useCerrarCaja, useCierres, useReabrirCaja, useResumenCaja, useTienda, useVentas } from '../hooks/useVentas'
import type { Cierre, ResumenCaja } from '@/types'

function Linea({ etiqueta, valor, fuerte }: { etiqueta: string; valor: number; fuerte?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3 py-1', fuerte && 'font-bold')}>
      <span className={fuerte ? undefined : 'text-ink-muted'}>{etiqueta}</span>
      <span className="tabular-nums">{fmtMoneda(valor)}</span>
    </div>
  )
}

function Descuadre({ importe }: { importe: number }) {
  if (importe === 0) return <span className="font-bold text-success">Cuadra</span>
  return (
    <span className="font-bold text-danger tabular-nums">
      {importe > 0 ? `Sobran ${fmtMoneda(importe)}` : `Faltan ${fmtMoneda(-importe)}`}
    </span>
  )
}

function Metodo({ etiqueta, valor, nota }: { etiqueta: string; valor: number; nota: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-surface-2 px-3 py-2.5">
      <span className="text-ink-muted">{etiqueta}</span>
      <span className="text-lg font-bold tabular-nums">{fmtMoneda(valor)}</span>
      <span className="text-xs text-ink-muted">{nota}</span>
    </div>
  )
}

function Vendido({ resumen }: { resumen: ResumenCaja }) {
  const detalle = [
    resumen.num_ventas === 1 ? '1 venta' : `${resumen.num_ventas} ventas`,
    resumen.num_devoluciones > 0 &&
      `${resumen.num_devoluciones} ${resumen.num_devoluciones === 1 ? 'devolución' : 'devoluciones'} (-${fmtMoneda(resumen.total_devoluciones)})`,
    resumen.num_anuladas > 0 &&
      `${resumen.num_anuladas} ${resumen.num_anuladas === 1 ? 'anulada' : 'anuladas'}, que no cuentan`,
  ].filter((x) => typeof x === 'string')
  return (
    <section className="flex flex-col gap-3 self-start rounded-card bg-surface p-4 text-sm shadow-card">
      <div>
        <h3 className="text-base font-bold">Vendido</h3>
        <p className="text-3xl font-extrabold tabular-nums">{fmtMoneda(resumen.total_neto)}</p>
        <p className="text-ink-muted">{detalle.join(' · ')}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Metodo etiqueta="Efectivo" valor={resumen.neto.efectivo} nota="Está en el cajón" />
        <Metodo etiqueta="Tarjeta" valor={resumen.neto.tarjeta} nota="Va al banco" />
        <Metodo etiqueta="Bizum" valor={resumen.neto.bizum} nota="Va al banco" />
      </div>
      {resumen.neto.sin_indicar !== 0 && (
        <Linea etiqueta="Sin indicar (ventas antiguas)" valor={resumen.neto.sin_indicar} />
      )}
    </section>
  )
}

function Resultado({ importe }: { importe: number }) {
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-3 text-center text-base font-bold tabular-nums',
        importe === 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
      )}
    >
      {importe === 0
        ? 'La caja cuadra'
        : importe > 0
          ? `Sobran ${fmtMoneda(importe)}`
          : `Faltan ${fmtMoneda(-importe)}`}
    </div>
  )
}

// Sin fondo de caja: se compara solo lo cobrado hoy en efectivo, que es lo que la persona cuenta.
function FormularioCierre({ resumen }: { resumen: ResumenCaja }) {
  const cerrar = useCerrarCaja()
  const confirm = useConfirm()
  const [contado, setContado] = useState('')
  const [notas, setNotas] = useState('')
  const esperado = resumen.neto.efectivo
  // Un día sin cobros en efectivo se cierra sin tener que escribir 0.
  const efectivoContado = leerImporte(contado) ?? (esperado === 0 ? 0 : null)
  const contadoValido = efectivoContado !== null && !Number.isNaN(efectivoContado) && efectivoContado >= 0
  const diferencia = contadoValido && contado !== '' ? sumarImportes([efectivoContado, -esperado]) : null

  async function confirmar() {
    if (efectivoContado === null || !contadoValido) return
    const ok = await confirm({
      title: `¿Cerrar la caja del ${fmtFecha(resumen.fecha)}?`,
      message: 'Después no se podrán cobrar, anular ni devolver ventas ese día salvo que un administrador la reabra.',
      confirmText: 'Cerrar caja',
    })
    if (!ok) return
    await intentar(
      cerrar.mutateAsync({
        fecha: resumen.fecha,
        fondo_inicial: 0,
        efectivo_contado: efectivoContado,
        notas: notas.trim() === '' ? null : notas.trim(),
      }),
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-4 text-sm shadow-card">
      <div>
        <h3 className="text-base font-bold">Comprobar el efectivo</h3>
        <p className="text-ink-muted">
          Según las ventas, hoy has cobrado{' '}
          <span className="font-bold text-ink tabular-nums">{fmtMoneda(esperado)}</span> en efectivo. Lo cobrado con
          tarjeta o Bizum no se cuenta.
        </p>
      </div>
      <Field
        label="¿Cuánto efectivo has cobrado hoy? (sin el cambio que ya tenías)"
        error={contado !== '' && !contadoValido ? 'Escribe un importe válido' : undefined}
      >
        <Input
          inputMode="decimal"
          placeholder={importeEditable(esperado)}
          className="py-3 text-lg"
          value={contado}
          onChange={(e) => setContado(e.target.value)}
        />
      </Field>
      {diferencia !== null && <Resultado importe={diferencia} />}
      {diferencia !== null && diferencia !== 0 && (
        <Field label="¿Sabes por qué? (opcional)">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="min-h-[56px]" />
        </Field>
      )}
      <Button
        className="py-3 text-base"
        isLoading={cerrar.isPending}
        disabled={!contadoValido}
        onClick={() => void confirmar()}
      >
        Cerrar caja
      </Button>
    </section>
  )
}

function CierreHecho({ cierre }: { cierre: Cierre }) {
  const { data: me } = useMe()
  const reabrir = useReabrirCaja()
  const confirm = useConfirm()

  async function confirmar() {
    const ok = await confirm({
      title: `¿Reabrir la caja del ${fmtFecha(cierre.fecha)}?`,
      message:
        'Se borra el arqueo y el día vuelve a admitir ventas, anulaciones y devoluciones. Queda en la auditoría.',
      confirmText: 'Reabrir',
      danger: true,
    })
    if (ok) await intentar(reabrir.mutateAsync(cierre.id))
  }

  return (
    <section className="flex flex-col gap-1 rounded-card bg-surface p-4 text-sm shadow-card">
      <h3 className="text-base font-bold">Caja cerrada</h3>
      <p className="mb-2 text-ink-muted">
        {cierre.creado ? `${fmtFecha(cierre.creado)} ${cierre.creado.slice(11, 16)}` : ''}
        {cierre.usuario && ` · ${cierre.usuario}`}
      </p>
      {cierre.fondo_inicial !== 0 && <Linea etiqueta="Fondo de caja" valor={cierre.fondo_inicial} />}
      <Linea etiqueta="Efectivo esperado" valor={cierre.efectivo_esperado} />
      <Linea etiqueta="Efectivo contado" valor={cierre.efectivo_contado} fuerte />
      <div className="flex items-center justify-between py-1">
        <span className="text-ink-muted">Diferencia</span>
        <Descuadre importe={sumarImportes([cierre.efectivo_contado, -cierre.efectivo_esperado])} />
      </div>
      {cierre.notas && <p className="mt-1 whitespace-pre-line">{cierre.notas}</p>}
      {me?.rol === 'admin' && (
        <Button
          variant="danger"
          size="sm"
          className="mt-3 self-start"
          isLoading={reabrir.isPending}
          onClick={() => void confirmar()}
        >
          Reabrir caja
        </Button>
      )}
    </section>
  )
}

function DiasSinCerrar({ dias, onElegir }: { dias: string[]; onElegir: (fecha: string) => void }) {
  const [primero] = dias
  if (primero === undefined) return null
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted lg:col-span-2">
      {dias.length === 1 ? 'Hay 1 día anterior sin cerrar.' : `Hay ${dias.length} días anteriores sin cerrar.`}
      <button type="button" className="font-semibold text-primary hover:underline" onClick={() => onElegir(primero)}>
        Ver el {fmtFecha(primero)}
      </button>
    </p>
  )
}

function Historico({ cierres, onElegir }: { cierres: Cierre[]; onElegir: (fecha: string) => void }) {
  if (cierres.length === 0) return null
  return (
    <section className="rounded-card bg-surface p-4 text-sm shadow-card lg:col-span-2">
      <h3 className="mb-2 text-base font-bold">Cierres anteriores</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="py-2 font-semibold">Día</th>
              <th className="py-2 text-right font-semibold">Ventas</th>
              <th className="py-2 text-right font-semibold">Tarjeta + Bizum</th>
              <th className="py-2 text-right font-semibold">Efectivo esperado</th>
              <th className="py-2 text-right font-semibold">Contado</th>
              <th className="py-2 text-right font-semibold">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cierres.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-surface-2" onClick={() => onElegir(c.fecha)}>
                <td className="py-2 font-semibold">{fmtFecha(c.fecha)}</td>
                <td className="py-2 text-right tabular-nums">
                  {c.num_ventas} · {fmtMoneda(c.total_ventas)}
                </td>
                <td className="py-2 text-right tabular-nums">{fmtMoneda(sumarImportes([c.tarjeta, c.bizum]))}</td>
                <td className="py-2 text-right tabular-nums">{fmtMoneda(c.efectivo_esperado)}</td>
                <td className="py-2 text-right tabular-nums">{fmtMoneda(c.efectivo_contado)}</td>
                <td className="py-2 text-right">
                  <Descuadre importe={sumarImportes([c.efectivo_contado, -c.efectivo_esperado])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function CierreTab() {
  const [hoy] = useState(() => hoyLocal())
  const [fecha, setFecha] = useState(hoy)
  const { data: resumen, isLoading, isError, error, refetch, isFetching } = useResumenCaja(fecha)
  const { data: cierres = [], isLoading: cargandoCierres } = useCierres()
  const { data: ventas = [] } = useVentas()
  const { data: tienda } = useTienda()
  const pendientes = diasSinCerrar({ ventas, cerrados: cierres.map((c) => c.fecha), hoy })

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <h3 className="text-lg font-bold">{fecha === hoy ? 'Cierre de hoy' : `Cierre del ${fmtFecha(fecha)}`}</h3>
        <Input
          type="date"
          aria-label="Día"
          className="w-auto py-1.5"
          max={hoy}
          value={fecha}
          onChange={(e) => setFecha(e.target.value === '' ? hoy : e.target.value)}
        />
        {fecha !== hoy && (
          <Button variant="ghost" size="sm" onClick={() => setFecha(hoy)}>
            Volver a hoy
          </Button>
        )}
        {resumen && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={imprimirTicket}>
            {resumen.cierre === null ? 'Imprimir avance' : 'Imprimir cierre'}
          </Button>
        )}
      </div>
      <DiasSinCerrar dias={pendientes.filter((d) => d !== fecha)} onElegir={setFecha} />
      {isLoading || cargandoCierres ? (
        <CenteredSpinner />
      ) : isError || !resumen ? (
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="la caja" />
      ) : (
        <>
          <Vendido resumen={resumen} />
          {resumen.cierre === null ? (
            <FormularioCierre key={fecha} resumen={resumen} />
          ) : (
            <CierreHecho cierre={resumen.cierre} />
          )}
          <InformeCajaImprimible resumen={resumen} tienda={tienda} />
        </>
      )}
      <Historico cierres={cierres} onElegir={setFecha} />
    </div>
  )
}
