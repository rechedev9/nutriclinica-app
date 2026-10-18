import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { LineasEditor } from './LineasEditor'
import { intentar } from '@/lib/api/intentar'
import { errorLineas } from '@/lib/validacion/lineas'
import { hoyLocal } from '@/lib/format/fecha'
import { enCamino, sugerenciasReposicion } from '../pedidos'
import {
  useAlmacen,
  useCreatePedido,
  usePedidos,
  useProductos,
  useProveedores,
  useUpdatePedido,
} from '../hooks/useStock'
import type { LineaInput, Pedido } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  pedido?: Pedido
  reponer?: number
}

const LINEA_VACIA: LineaInput = { producto_id: 0, cantidad: 1, precio_unitario: 0 }

export function PedidoModal({ open, onClose, pedido, reponer }: Props) {
  const { data: productos = [] } = useProductos()
  const { data: proveedores = [] } = useProveedores()
  const almacenQ = useAlmacen()
  const pedidosQ = usePedidos()
  const create = useCreatePedido()
  const update = useUpdatePedido()
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')
  const [prevista, setPrevista] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<LineaInput[]>([])
  const datosListos = almacenQ.isSuccess && pedidosQ.isSuccess
  const firma = !open ? '' : pedido ? `e${pedido.id}` : reponer != null ? (datosListos ? `r${reponer}` : '') : 'n'
  const [firmaAplicada, setFirmaAplicada] = useState('')

  if (firma !== firmaAplicada) {
    setFirmaAplicada(firma)
    if (pedido) {
      setProveedorId(String(pedido.proveedor_id))
      setFecha(pedido.fecha ?? hoyLocal())
      setPrevista(pedido.fecha_prevista ?? '')
      setNotas(pedido.notas ?? '')
      setLineas(
        pedido.lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      )
    } else if (firma === 'n') {
      setProveedorId('')
      setFecha(hoyLocal())
      setPrevista('')
      setNotas('')
      setLineas([LINEA_VACIA])
    } else if (open && reponer != null && datosListos) {
      const sugeridas = sugerenciasReposicion({
        almacen: almacenQ.data ?? [],
        proveedorId: reponer,
        enCamino: enCamino(pedidosQ.data ?? []),
        excluir: new Set(),
      })
      setProveedorId(String(reponer))
      setFecha(hoyLocal())
      setPrevista('')
      setNotas('')
      setLineas(sugeridas.length > 0 ? sugeridas : [LINEA_VACIA])
    }
  }

  const almacen = almacenQ.data ?? []
  const pedidos = pedidosQ.data ?? []

  const elegidas = lineas.filter((l) => l.producto_id > 0)
  const sugeridas =
    proveedorId === ''
      ? []
      : sugerenciasReposicion({
          almacen,
          proveedorId: Number(proveedorId),
          // Al editar, lo de este mismo pedido no cuenta como «en camino».
          enCamino: enCamino(pedidos.filter((p) => p.id !== pedido?.id)),
          excluir: new Set(elegidas.map((l) => l.producto_id)),
        })
  const repetido = new Set(elegidas.map((l) => l.producto_id)).size !== elegidas.length
  const problema =
    proveedorId === ''
      ? 'Elige el proveedor'
      : repetido
        ? 'Un producto aparece dos veces: junta las cantidades en una línea'
        : prevista !== '' && prevista < fecha
          ? 'La entrega prevista no puede ser anterior al pedido'
          : errorLineas(lineas)

  function anadirSugeridas() {
    setLineas([...elegidas, ...sugeridas])
  }

  async function guardar() {
    const body = {
      proveedor_id: Number(proveedorId),
      fecha: fecha || null,
      fecha_prevista: prevista || null,
      notas: notas.trim() || null,
      lineas: elegidas,
    }
    const ok = await intentar(pedido ? update.mutateAsync({ id: pedido.id, body }) : create.mutateAsync(body))
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pedido ? `Editar pedido ${pedido.numero}` : 'Nuevo pedido a proveedor'}
      className="w-[min(680px,94vw)]"
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
          <Field label="Proveedor">
            <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Elige el proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha del pedido">
            <Input type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Entrega prevista (opcional)">
            <Input type="date" value={prevista} min={fecha} onChange={(e) => setPrevista(e.target.value)} />
          </Field>
        </div>
        {proveedores.length === 0 && (
          <p className="text-sm text-ink-muted">Primero da de alta el proveedor en la pestaña Proveedores.</p>
        )}
        {sugeridas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
            <span>
              {sugeridas.length === 1
                ? 'Hay 1 producto de este proveedor bajo mínimo.'
                : `Hay ${sugeridas.length} productos de este proveedor bajo mínimo.`}
            </span>
            <Button variant="outline" size="sm" onClick={anadirSugeridas}>
              Añadirlos al pedido
            </Button>
          </div>
        )}
        <LineasEditor productos={productos} lineas={lineas} onChange={setLineas} precioDe={(p) => p.precio_coste} />
        <Field label="Notas">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="min-h-[56px]" />
        </Field>
        <p className="text-xs text-ink-muted">
          El pedido no suma stock. Las existencias suben cuando entres el albarán de lo que llegue.
        </p>
        {problema !== null && proveedorId !== '' && elegidas.length > 0 && (
          <p role="alert" className="text-sm text-danger">
            {problema}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void guardar()}
            isLoading={create.isPending || update.isPending}
            disabled={problema !== null}
          >
            {pedido ? 'Guardar cambios' : 'Guardar pedido'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
