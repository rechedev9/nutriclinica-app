import { createPortal } from 'react-dom'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { sumarImportes } from '../carrito'
import type { ResumenCaja, Tienda } from '@/types'

function Fila({ izquierda, derecha, fuerte }: { izquierda: string; derecha: string; fuerte?: boolean }) {
  return (
    <div className={fuerte ? 'flex justify-between gap-2 font-bold' : 'flex justify-between gap-2'}>
      <span>{izquierda}</span>
      <span className="tabular-nums">{derecha}</span>
    </div>
  )
}

function Separador() {
  return <div className="my-2 border-t border-dashed border-ink-muted" />
}

// Informe de caja en papel de ticket: el arqueo si el día está cerrado, o un avance si sigue abierto.
function Informe({ resumen, tienda }: { resumen: ResumenCaja; tienda: Tienda | undefined }) {
  const { cierre } = resumen
  return (
    <div className="mx-auto w-full max-w-[320px] font-mono text-[12px] leading-snug text-ink">
      <div className="text-center">
        <div className="text-[14px] font-bold">{tienda?.tienda_nombre || 'Tienda'}</div>
        <div className="font-bold">{cierre === null ? 'AVANCE DE CAJA (ABIERTA)' : 'CIERRE DE CAJA'}</div>
        <div>{fmtFecha(resumen.fecha)}</div>
      </div>
      <Separador />
      <Fila izquierda={`Ventas (${resumen.num_ventas})`} derecha={fmtMoneda(resumen.total_ventas)} />
      <Fila izquierda={`Devoluciones (${resumen.num_devoluciones})`} derecha={fmtMoneda(-resumen.total_devoluciones)} />
      {resumen.num_anuladas > 0 && (
        <Fila
          izquierda={`Anuladas (${resumen.num_anuladas}), no cuentan`}
          derecha={fmtMoneda(resumen.total_anuladas)}
        />
      )}
      <Separador />
      <Fila izquierda="Efectivo" derecha={fmtMoneda(resumen.neto.efectivo)} />
      <Fila izquierda="Tarjeta" derecha={fmtMoneda(resumen.neto.tarjeta)} />
      <Fila izquierda="Bizum" derecha={fmtMoneda(resumen.neto.bizum)} />
      {resumen.neto.sin_indicar !== 0 && <Fila izquierda="Sin indicar" derecha={fmtMoneda(resumen.neto.sin_indicar)} />}
      <Fila izquierda="TOTAL NETO" derecha={fmtMoneda(resumen.total_neto)} fuerte />
      {cierre !== null && (
        <>
          <Separador />
          <Fila izquierda="Fondo de caja" derecha={fmtMoneda(cierre.fondo_inicial)} />
          <Fila izquierda="Efectivo esperado" derecha={fmtMoneda(cierre.efectivo_esperado)} />
          <Fila izquierda="Efectivo contado" derecha={fmtMoneda(cierre.efectivo_contado)} fuerte />
          <Fila
            izquierda="Diferencia"
            derecha={fmtMoneda(sumarImportes([cierre.efectivo_contado, -cierre.efectivo_esperado]))}
          />
          {cierre.notas && <div className="mt-1 whitespace-pre-line">{cierre.notas}</div>}
          <Separador />
          <div>
            Cerrada el {fmtFecha(cierre.creado)} {cierre.creado?.slice(11, 16)}
            {cierre.usuario && ` por ${cierre.usuario}`}
          </div>
        </>
      )}
    </div>
  )
}

// Solo se ve al imprimir con imprimirTicket, igual que el ticket de venta.
export function InformeCajaImprimible({ resumen, tienda }: { resumen: ResumenCaja; tienda: Tienda | undefined }) {
  return createPortal(
    <div className="ticket-impresion">
      <Informe resumen={resumen} tienda={tienda} />
    </div>,
    document.body,
  )
}
