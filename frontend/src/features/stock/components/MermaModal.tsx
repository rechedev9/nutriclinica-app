import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useCreateMerma, useProductos, useProveedores } from '../hooks/useStock'
import type { MotivoMerma } from '@/types'

const MOTIVOS: { value: MotivoMerma; label: string }[] = [
  { value: 'caducidad', label: 'Caducidad' },
  { value: 'accidente_rotura', label: 'Accidente / Rotura' },
  { value: 'devolucion_cliente', label: 'Devolución cliente' },
]

export function MermaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: productos = [] } = useProductos()
  const { data: proveedores = [] } = useProveedores()
  const create = useCreateMerma()

  const [productoId, setProductoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [motivo, setMotivo] = useState<MotivoMerma>('caducidad')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (open) {
      setProductoId('')
      setProveedorId('')
      setCantidad('1')
      setMotivo('caducidad')
      setFecha(new Date().toISOString().slice(0, 10))
      setNotas('')
    }
  }, [open])

  async function submit() {
    await create.mutateAsync({
      producto_id: Number(productoId),
      proveedor_id: proveedorId ? Number(proveedorId) : null,
      cantidad: Number(cantidad),
      motivo,
      fecha: fecha || null,
      notas: notas.trim() || null,
    })
    onClose()
  }

  const valido = productoId !== '' && Number(cantidad) > 0

  return (
    <Modal open={open} onClose={onClose} title="Registrar merma" className="w-[min(520px,94vw)]">
      <div className="flex flex-col gap-3">
        <Field label="Producto *">
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">— Selecciona un producto —</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad *">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </Field>
          <Field label="Motivo *">
            <Select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoMerma)}>
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Proveedor (opcional)">
            <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">—</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notas">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} isLoading={create.isPending} disabled={!valido}>
            Registrar merma
          </Button>
        </div>
      </div>
    </Modal>
  )
}
