import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { intentar } from '@/lib/api/intentar'
import { errorPagos, importeEditable } from '../carrito'
import { useCorregirVenta } from '../hooks/useVentas'
import { PagosEditor, pagosDe } from './PagosEditor'
import type { PagoEditable } from './PagosEditor'
import type { Venta } from '@/types'

// Solo se corrige lo que no mueve stock: cliente, notas y cómo se pagó. Para lo demás, devolución.
export function CorregirModal({ venta, onClose }: { venta: Venta; onClose: () => void }) {
  const corregir = useCorregirVenta()
  const { data: clientes = [] } = usePacientes()
  const [pacienteId, setPacienteId] = useState(venta.paciente_id === null ? '' : String(venta.paciente_id))
  const [notas, setNotas] = useState(venta.notas ?? '')
  const [filas, setFilas] = useState<PagoEditable[]>(() =>
    venta.pagos.map((p) => ({ metodo: p.metodo, importe: importeEditable(p.importe) })),
  )
  const pagos = pagosDe(filas)
  const sinPagosAntiguos = venta.pagos.length === 0 && filas.length === 0
  const error = sinPagosAntiguos ? null : errorPagos(pagos, venta.total)

  async function guardar() {
    if (error !== null) return
    const ok = await intentar(
      corregir.mutateAsync({
        id: venta.id,
        body: {
          paciente_id: pacienteId === '' ? null : Number(pacienteId),
          notas: notas.trim() === '' ? null : notas.trim(),
          pagos,
        },
      }),
    )
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Corregir venta ${venta.numero}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Los productos y el importe no se cambian aquí: si el cliente devuelve algo, registra una devolución.
        </p>
        <Field label="Cliente">
          <Select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Venta sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-muted">Forma de pago</span>
          {venta.pagos.length === 0 && filas.length === 0 && (
            <p className="text-sm text-ink-muted">Venta anterior a la sección de ventas: sin forma de pago indicada.</p>
          )}
          <PagosEditor filas={filas} onChange={setFilas} total={venta.total} />
        </div>
        <Field label="Notas">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        {error !== null && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button isLoading={corregir.isPending} disabled={error !== null} onClick={() => void guardar()}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  )
}
