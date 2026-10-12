import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { LineasEditor } from './LineasEditor'
import { intentar } from '@/lib/api/intentar'
import { errorLineas } from '@/lib/validacion/lineas'
import { useCreateCompra, useUpdateCompra, useProductos, useProveedores } from '../hooks/useStock'
import type { Compra, LineaInput } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  compra?: Compra
}

export function CompraModal({ open, onClose, compra }: Props) {
  const { data: productos = [] } = useProductos()
  const { data: proveedores = [] } = useProveedores()
  const create = useCreateCompra()
  const update = useUpdateCompra()
  const isEdit = !!compra
  const [fecha, setFecha] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<LineaInput[]>([])

  function nowLocal() {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
  }

  useEffect(() => {
    if (open) {
      const fechaInit = compra?.fecha
        ? compra.fecha.includes('T') ? compra.fecha.slice(0, 16) : compra.fecha + 'T00:00'
        : nowLocal()
      setFecha(fechaInit)
      setProveedorId(compra?.proveedor_id != null ? String(compra.proveedor_id) : '')
      setNotas(compra?.notas ?? '')
      setLineas(
        compra?.lineas.length
          ? compra.lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad, precio_unitario: l.precio_unitario }))
          : [{ producto_id: 0, cantidad: 1, precio_unitario: 0 }],
      )
    }
  }, [open, compra])

  async function submit() {
    const body = {
      fecha: fecha || null,
      proveedor_id: proveedorId ? Number(proveedorId) : null,
      notas: notas.trim() || null,
      lineas: lineas.filter((l) => l.producto_id > 0),
    }
    const ok = await intentar(
      isEdit ? update.mutateAsync({ id: compra!.id, body }) : create.mutateAsync(body),
    )
    if (ok) onClose()
  }

  const sinProducto = !lineas.some((l) => l.producto_id > 0)
  const invalido = errorLineas(lineas) !== null

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar compra' : 'Nueva compra'} className="w-[min(640px,94vw)]">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha y hora">
            <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
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
        {sinProducto && <p className="text-xs text-ink-muted">Añade al menos una línea con producto.</p>}
        <Field label="Notas">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} isLoading={create.isPending || update.isPending} disabled={invalido}>
            {isEdit ? 'Guardar cambios' : 'Registrar compra'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
