import { createPortal } from 'react-dom'
import { desgloseIva, etiquetaMetodo, cambio, efectivoDe } from '../carrito'
import { fmtFecha } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import type { Tienda, Venta } from '@/types'

// creado viene como «AAAA-MM-DD HH:MM:SS» en hora local.
function hora(creado: string | null): string {
  return creado?.slice(11, 16) ?? ''
}

function Fila({ izquierda, derecha, fuerte }: { izquierda: string; derecha: string; fuerte?: boolean }) {
  return (
    <div className={fuerte ? 'flex justify-between gap-2 font-bold' : 'flex justify-between gap-2'}>
      <span>{izquierda}</span>
      <span className="tabular-nums">{derecha}</span>
    </div>
  )
}

// Justificante de venta. No es una factura: no lleva serie fiscal ni datos del comprador.
export function Ticket({ venta, tienda }: { venta: Venta; tienda: Tienda | undefined }) {
  const efectivo = efectivoDe(venta.pagos)
  const entregado = venta.entregado ?? null
  return (
    <div className="mx-auto w-full max-w-[320px] font-mono text-[12px] leading-snug text-ink">
      <div className="text-center">
        <div className="text-[14px] font-bold">{tienda?.tienda_nombre || 'Tienda'}</div>
        {tienda?.tienda_nif && <div>NIF {tienda.tienda_nif}</div>}
        {tienda?.tienda_direccion && <div>{tienda.tienda_direccion}</div>}
        {tienda?.tienda_telefono && <div>Tel. {tienda.tienda_telefono}</div>}
      </div>
      <div className="my-2 border-t border-dashed border-ink-muted" />
      <Fila izquierda={`Ticket ${venta.numero}`} derecha={`${fmtFecha(venta.fecha)} ${hora(venta.creado)}`} />
      {venta.usuario && <div>Le atendió: {venta.usuario}</div>}
      {venta.paciente_nombre && <div>Cliente: {venta.paciente_nombre}</div>}
      {venta.estado === 'anulada' && (
        <div className="my-1 border border-ink py-0.5 text-center font-bold">VENTA ANULADA</div>
      )}
      <div className="my-2 border-t border-dashed border-ink-muted" />
      {venta.lineas.map((l) => (
        <div key={l.id} className="mb-1">
          <div>{l.producto_nombre}</div>
          <Fila
            izquierda={`  ${l.cantidad} × ${fmtMoneda(l.precio_unitario)}`}
            derecha={fmtMoneda(l.cantidad * l.precio_unitario)}
          />
          {l.descuento > 0 && <Fila izquierda="  Descuento" derecha={`-${fmtMoneda(l.descuento)}`} />}
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-ink-muted" />
      <Fila izquierda="TOTAL" derecha={fmtMoneda(venta.total)} fuerte />
      <div className="mt-1 text-[11px] text-ink-muted">IVA incluido</div>
      {desgloseIva(venta.lineas).map((d) => (
        <Fila key={d.iva} izquierda={`  IVA ${d.iva} % s/ ${fmtMoneda(d.base)}`} derecha={fmtMoneda(d.cuota)} />
      ))}
      <div className="my-2 border-t border-dashed border-ink-muted" />
      {venta.pagos.length === 0 ? (
        <div>Forma de pago: sin indicar</div>
      ) : (
        venta.pagos.map((p) => (
          <Fila key={p.metodo} izquierda={etiquetaMetodo(p.metodo)} derecha={fmtMoneda(p.importe)} />
        ))
      )}
      {entregado !== null && efectivo > 0 && (
        <>
          <Fila izquierda="Entregado" derecha={fmtMoneda(entregado)} />
          <Fila izquierda="Cambio" derecha={fmtMoneda(cambio(entregado, efectivo))} />
        </>
      )}
      {venta.devoluciones.length > 0 && (
        <>
          <div className="my-2 border-t border-dashed border-ink-muted" />
          {venta.devoluciones.map((d) => (
            <Fila
              key={d.id}
              izquierda={`Devuelto ${fmtFecha(d.fecha)} (${etiquetaMetodo(d.metodo_reembolso).toLowerCase()})`}
              derecha={`-${fmtMoneda(d.importe)}`}
            />
          ))}
        </>
      )}
      <div className="my-2 border-t border-dashed border-ink-muted" />
      {tienda?.ticket_pie && <div className="whitespace-pre-line text-center">{tienda.ticket_pie}</div>}
      <div className="mt-1 text-center text-[10px] text-ink-muted">Justificante de venta. No válido como factura.</div>
    </div>
  )
}

// Copia del ticket fuera de la app: solo se ve al imprimir con imprimirTicket.
export function TicketImprimible({ venta, tienda }: { venta: Venta; tienda: Tienda | undefined }) {
  return createPortal(
    <div className="ticket-impresion">
      <Ticket venta={venta} tienda={tienda} />
    </div>,
    document.body,
  )
}

function terminarImpresion() {
  document.body.classList.remove('imprimiendo-ticket')
}

export function imprimirTicket() {
  document.body.classList.add('imprimiendo-ticket')
  window.addEventListener('afterprint', terminarImpresion, { once: true })
  window.print()
}
