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

const MAX_DIAS_AVISO = 7

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

function Movimientos({ resumen }: { resumen: ResumenCaja }) {
  return (
    <section className="rounded-card bg-surface p-4 text-sm shadow-card">
      <h3 className="mb-2 text-base font-bold">Movimientos del día</h3>
      <div className="flex justify-between py-1">
        <span className="text-ink-muted">Ventas</span>
        <span className="tabular-nums">
          {resumen.num_ventas} · {fmtMoneda(resumen.total_ventas)}
        </span>
      </div>
      <div className="flex justify-between py-1">
        <span className="text-ink-muted">Devoluciones</span>
        <span className="tabular-nums">
          {resumen.num_devoluciones} · {fmtMoneda(-resumen.total_devoluciones)}
        </span>
      </div>
      {resumen.num_anuladas > 0 && (
        <div className="flex justify-between py-1">
          <span className="text-ink-muted">Anuladas (no cuentan)</span>
          <span className="tabular-nums">
            {resumen.num_anuladas} · {fmtMoneda(resumen.total_anuladas)}
          </span>
        </div>
      )}
      <div className="my-2 border-t border-border" />
      <Linea etiqueta="Efectivo" valor={resumen.neto.efectivo} />
      <Linea etiqueta="Tarjeta" valor={resumen.neto.tarjeta} />
      <Linea etiqueta="Bizum" valor={resumen.neto.bizum} />
      {resumen.neto.sin_indicar !== 0 && (
        <Linea etiqueta="Sin indicar (ventas antiguas)" valor={resumen.neto.sin_indicar} />
      )}
      <div className="my-2 border-t border-border" />
      <Linea etiqueta="Total neto" valor={resumen.total_neto} fuerte />
      {resumen.total_devoluciones > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          Cada método ya descuenta lo devuelto por ese medio. Las devoluciones cuentan el día en que se hacen.
        </p>
      )}
    </section>
  )
}

// El fondo arranca con el del último cierre: casi siempre se deja el mismo cambio en el cajón.
function FormularioCierre({ resumen, fondoSugerido }: { resumen: ResumenCaja; fondoSugerido: number | null }) {
  const cerrar = useCerrarCaja()
  const confirm = useConfirm()
  const [fondo, setFondo] = useState(() => (fondoSugerido === null ? '' : importeEditable(fondoSugerido)))
  const [contado, setContado] = useState('')
  const [notas, setNotas] = useState('')
  const fondoInicial = leerImporte(fondo) ?? 0
  const efectivoContado = leerImporte(contado)
  const esperado = sumarImportes([fondoInicial, resumen.neto.efectivo])
  const error =
    Number.isNaN(fondoInicial) || fondoInicial < 0
      ? 'El fondo de caja no es válido'
      : efectivoContado === null
        ? 'Cuenta el efectivo del cajón y escríbelo'
        : Number.isNaN(efectivoContado) || efectivoContado < 0
          ? 'El efectivo contado no es válido'
          : null

  async function confirmar() {
    if (error !== null || efectivoContado === null) return
    const ok = await confirm({
      title: `¿Cerrar la caja del ${fmtFecha(resumen.fecha)}?`,
      message: 'Después no se podrán cobrar, anular ni devolver ventas ese día salvo que un administrador la reabra.',
      confirmText: 'Cerrar caja',
    })
    if (!ok) return
    await intentar(
      cerrar.mutateAsync({
        fecha: resumen.fecha,
        fondo_inicial: fondoInicial,
        efectivo_contado: efectivoContado,
        notas: notas.trim() === '' ? null : notas.trim(),
      }),
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-4 text-sm shadow-card">
      <h3 className="text-base font-bold">Arqueo del efectivo</h3>
      <Field label="Fondo de caja al abrir (cambio)">
        <Input inputMode="decimal" placeholder="0,00" value={fondo} onChange={(e) => setFondo(e.target.value)} />
      </Field>
      <Linea etiqueta="Efectivo que debería haber" valor={esperado} fuerte />
      <Field label="Efectivo contado en el cajón">
        <Input inputMode="decimal" placeholder="0,00" value={contado} onChange={(e) => setContado(e.target.value)} />
      </Field>
      {efectivoContado !== null && !Number.isNaN(efectivoContado) && (
        <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
          <span>Diferencia</span>
          <Descuadre importe={sumarImportes([efectivoContado, -esperado])} />
        </div>
      )}
      <Field label="Notas (opcional)">
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Por ejemplo, por qué no cuadra"
          className="min-h-[56px]"
        />
      </Field>
      {error !== null && contado !== '' && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Button isLoading={cerrar.isPending} disabled={error !== null} onClick={() => void confirmar()}>
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
      <Linea etiqueta="Fondo de caja" valor={cierre.fondo_inicial} />
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
  if (dias.length === 0) return null
  const resto = dias.length - MAX_DIAS_AVISO
  return (
    <div role="status" className="rounded-card border border-amber-500/30 bg-amber-500/10 p-4 text-sm lg:col-span-2">
      <p>
        <span className="font-semibold">
          {dias.length === 1 ? 'Hay 1 día con ventas sin cerrar' : `Hay ${dias.length} días con ventas sin cerrar`}.
        </span>{' '}
        Elige uno para hacer su arqueo.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {dias.slice(0, MAX_DIAS_AVISO).map((d) => (
          <Button key={d} variant="outline" size="sm" onClick={() => onElegir(d)}>
            {fmtFecha(d)}
          </Button>
        ))}
        {resto > 0 && <span className="text-ink-muted">y {resto} más</span>}
      </div>
    </div>
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
        <h3 className="text-lg font-bold">Cierre de caja</h3>
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
          <Movimientos resumen={resumen} />
          {resumen.cierre === null ? (
            <FormularioCierre key={fecha} resumen={resumen} fondoSugerido={cierres[0]?.fondo_inicial ?? null} />
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
