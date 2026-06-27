import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { LineasEditor } from './LineasEditor'
import { useCreateVenta, useProductos } from '../hooks/useStock'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import type { LineaInput } from '@/types'

export function VentaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: productos = [] } = useProductos()
  const { data: pacientes = [] } = usePacientes()
  const create = useCreateVenta()
  const [fecha, setFecha] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<LineaInput[]>([])

  useEffect(() => {
    if (open) {
      setFecha(new Date().toISOString().slice(0, 10))
      setPacienteId('')
      setNotas('')
      setLineas([{ producto_id: 0, cantidad: 1, precio_unitario: 0 }])
    }
  }, [open])

  async function submit() {
    await create.mutateAsync({
      fecha: fecha || null,
      paciente_id: pacienteId ? Number(pacienteId) : null,
      notas: notas.trim() || null,
      lineas: lineas.filter((l) => l.producto_id > 0),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva venta" className="w-[min(640px,94vw)]">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Paciente (opcional)">
            <Select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">—</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <LineasEditor productos={productos} lineas={lineas} onChange={setLineas} precioDe={(p) => p.precio_venta} />
        <Field label="Notas">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} isLoading={create.isPending}>
            Registrar venta
          </Button>
        </div>
      </div>
    </Modal>
  )
}
