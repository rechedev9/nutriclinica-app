import { useState } from 'react'
import { useCambiarEstadoPedido, useDeletePedido, usePedidos } from '../hooks/useStock'
import { PedidoModal } from '../components/PedidoModal'
import { RecepcionModal } from '../components/RecepcionModal'
import { CompraModal } from '../components/CompraModal'
import { SITUACION, filtrarPedidos, pendienteDe, porRecibir, retrasado } from '../pedidos'
import type { FiltroPedidos } from '../pedidos'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Chevron } from '@/components/ui/Chevron'
import { fmtFecha, hoyLocal } from '@/lib/format/fecha'
import { fmtMoneda } from '@/lib/format/moneda'
import { resumenLineas } from '@/lib/format/texto'
import { intentar } from '@/lib/api/intentar'
import { cn } from '@/lib/cn'
import type { Pedido, SituacionPedido } from '@/types'

const FILTROS: { valor: FiltroPedidos; etiqueta: string }[] = [
  { valor: 'por_recibir', etiqueta: 'Por recibir' },
  { valor: 'cerrados', etiqueta: 'Recibidos y cerrados' },
  { valor: 'todos', etiqueta: 'Todos' },
]

function SituacionBadge({ situacion }: { situacion: SituacionPedido }) {
  const { etiqueta, cls } = SITUACION[situacion]
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold', cls)}>
      {etiqueta}
    </span>
  )
}

function Tarjeta({ titulo, valor, aviso }: { titulo: string; valor: string; aviso?: boolean }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div className="text-[13px] text-ink-muted">{titulo}</div>
      <div className={cn('mt-1 text-2xl font-extrabold', aviso === true && 'text-danger')}>{valor}</div>
    </div>
  )
}

function Detalle({ pedido }: { pedido: Pedido }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border p-4 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="py-1.5">Producto</th>
              <th className="py-1.5 text-right">Pedido</th>
              <th className="py-1.5 text-right">Llegado</th>
              <th className="py-1.5 text-right">Falta</th>
              <th className="py-1.5 text-right">Coste</th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas.map((l) => {
              const falta = pendienteDe(l)
              return (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-1.5">{l.producto_nombre}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {l.cantidad} {l.unidad}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{l.recibido}</td>
                  <td className={cn('py-1.5 text-right tabular-nums', falta > 0 && porRecibir(pedido) && 'font-bold')}>
                    {falta}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{fmtMoneda(l.cantidad * l.precio_unitario)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="mb-1 font-semibold">Albaranes entrados</h4>
        {pedido.recepciones.length === 0 ? (
          <p className="text-ink-muted">Todavía no ha llegado nada de este pedido.</p>
        ) : (
          pedido.recepciones.map((r) => (
            <div key={r.id} className="flex justify-between py-0.5">
              <span>
                {fmtFecha(r.fecha)} · {r.albaran === null ? 'Sin número de albarán' : `Albarán ${r.albaran}`}
              </span>
              <span className="font-semibold tabular-nums">{fmtMoneda(r.total)}</span>
            </div>
          ))
        )}
      </div>
      {pedido.notas && <p className="text-ink-muted">{pedido.notas}</p>}
      {pedido.usuario && (
        <p className="text-xs text-ink-muted">
          Pedido por {pedido.usuario} el {fmtFecha(pedido.creado)}
        </p>
      )}
    </div>
  )
}

export function PedidosTab() {
  const { data: pedidos, isLoading, isError, error, refetch, isFetching } = usePedidos()
  const del = useDeletePedido()
  const estado = useCambiarEstadoPedido()
  const confirm = useConfirm()
  const [filtro, setFiltro] = useState<FiltroPedidos>('por_recibir')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [modalPedido, setModalPedido] = useState(false)
  const [editando, setEditando] = useState<Pedido | undefined>()
  const [recibiendo, setRecibiendo] = useState<Pedido | null>(null)
  const [compraSuelta, setCompraSuelta] = useState(false)

  if (isLoading) return <CenteredSpinner />
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los pedidos" />

  const hoy = hoyLocal()
  const todos = pedidos ?? []
  const filas = filtrarPedidos(todos, filtro)
  const abiertos = todos.filter(porRecibir)
  const retrasados = abiertos.filter((p) => retrasado(p, hoy)).length
  const importePendiente = abiertos.reduce(
    (s, p) => s + p.lineas.reduce((t, l) => t + pendienteDe(l) * l.precio_unitario, 0),
    0,
  )

  function nuevo() {
    setEditando(undefined)
    setModalPedido(true)
  }

  async function cerrar(p: Pedido) {
    const ok = await confirm({
      title: `¿Cerrar el pedido ${p.numero}?`,
      message:
        p.recepciones.length === 0
          ? 'Quedará como cancelado: ya no esperas nada de él.'
          : 'Lo que falta ya no se espera. Lo recibido se queda en el stock.',
      confirmText: 'Cerrar pedido',
    })
    if (ok) await intentar(estado.mutateAsync({ id: p.id, accion: 'cerrar' }))
  }

  async function borrar(p: Pedido) {
    const ok = await confirm({ title: `¿Eliminar el pedido ${p.numero}?`, confirmText: 'Eliminar', danger: true })
    if (ok) await intentar(del.mutateAsync(p.id))
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tarjeta titulo="Pedidos por recibir" valor={String(abiertos.length)} />
        <Tarjeta titulo="Con la entrega retrasada" valor={String(retrasados)} aviso={retrasados > 0} />
        <Tarjeta titulo="Importe por recibir" valor={fmtMoneda(importePendiente)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">Pedidos a proveedores</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCompraSuelta(true)}>
            Entrar albarán sin pedido
          </Button>
          <Button onClick={nuevo}>+ Nuevo pedido</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar pedidos">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
              filtro === f.valor ? 'bg-primary text-primary-foreground' : 'bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icon={
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
              <path d="m3 8 9 5 9-5M12 13v8" />
            </svg>
          }
          title={todos.length === 0 ? 'Sin pedidos' : 'No hay pedidos en esta vista'}
          subtitle={
            todos.length === 0
              ? 'Apunta lo que pides a cada proveedor. Cuando llegue, entra el albarán y el stock se suma solo.'
              : 'Cambia el filtro para ver los demás pedidos.'
          }
          action={todos.length === 0 ? <Button onClick={nuevo}>+ Nuevo pedido</Button> : undefined}
        />
      ) : (
        filas.map((p) => {
          const abierto = expanded === p.id
          const puedeRecibir = porRecibir(p)
          const tarde = retrasado(p, hoy)
          return (
            <div key={p.id} className="rounded-card bg-surface shadow-card">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                <button
                  type="button"
                  onClick={() => setExpanded(abierto ? null : p.id)}
                  className="flex min-w-0 flex-1 basis-72 items-center gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{p.proveedor_nombre}</span>
                      <SituacionBadge situacion={p.situacion} />
                      {tarde && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[12px] font-semibold text-danger">
                          Retrasado
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[13px] text-ink-muted">
                      {p.numero} · {fmtFecha(p.fecha)}
                      {p.fecha_prevista && ` · entrega prevista ${fmtFecha(p.fecha_prevista)}`} ·{' '}
                      {resumenLineas(p.lineas)}
                    </div>
                  </div>
                  <div className="whitespace-nowrap font-bold tabular-nums">{fmtMoneda(p.total)}</div>
                  <Chevron abierto={abierto} />
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-1">
                  {puedeRecibir && (
                    <Button size="sm" onClick={() => setRecibiendo(p)}>
                      Entrar albarán
                    </Button>
                  )}
                  {puedeRecibir && p.recepciones.length === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(p)
                        setModalPedido(true)
                      }}
                    >
                      Editar
                    </Button>
                  )}
                  {puedeRecibir && (
                    <Button variant="ghost" size="sm" onClick={() => void cerrar(p)}>
                      Cerrar
                    </Button>
                  )}
                  {p.estado === 'cerrado' && p.situacion !== 'recibido' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void intentar(estado.mutateAsync({ id: p.id, accion: 'reabrir' }))}
                    >
                      Reabrir
                    </Button>
                  )}
                  {p.recepciones.length === 0 && (
                    <Button variant="dangerGhost" size="sm" onClick={() => void borrar(p)}>
                      Borrar
                    </Button>
                  )}
                </div>
              </div>
              {abierto && <Detalle pedido={p} />}
            </div>
          )
        })
      )}

      <p className="text-xs text-ink-muted">
        Cada albarán entrado suma el stock y aparece también en la pestaña Compras.
      </p>

      <PedidoModal open={modalPedido} onClose={() => setModalPedido(false)} pedido={editando} />
      <RecepcionModal pedido={recibiendo} onClose={() => setRecibiendo(null)} />
      <CompraModal open={compraSuelta} onClose={() => setCompraSuelta(false)} />
    </div>
  )
}
