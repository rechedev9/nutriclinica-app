import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { LineasEditor } from './LineasEditor'
import { useCreateCompra, useProductos, useProveedores } from '../hooks/useStock'
import type { LineaInput } from '@/types'

export function CompraModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: productos = [] } = useProductos()
  const { data: proveedores = [] } = useProveedores()
  const create = useCreateCompra()
  const [fecha, setFecha] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<LineaInput[]>([])

  useEffect(() => {
    if (open) {
      setFecha(new Date().toISOString().slice(0, 10))
      setProveedorId('')
      setNotas('')
      setLineas([{ producto_id: 0, cantidad: 1, precio_unitario: 0 }])
    }
  }, [open])

  async function submit() {
    await create.mutateAsync({
      fecha: fecha || null,
      proveedor_id: proveedorId ? Number(proveedorId) : null,
      notas: notas.trim() || null,
      lineas: lineas.filter((l) => l.producto_id > 0),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva compra" className="w-[min(640px,94vw)]">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Proveedor">
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
        <LineasEditor productos={productos} lineas={lineas} onChange={setLineas} precioDe={(p) => p.precio_coste} />
        <Field label="Notas">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            Registrar compra
          </Button>
        </div>
      </div>
    </Modal>
  )
}
