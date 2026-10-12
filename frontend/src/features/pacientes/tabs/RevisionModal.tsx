import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { PLIEGUES, PERIMETROS } from '@/types'
import type { ClaveMedida, Revision, RevisionInput } from '@/types'
import { intentar } from '@/lib/api/intentar'
import { esquemaRevision } from '@/lib/validacion/esquemas'
import { useCreateRevision, useUpdateRevision } from '../hooks/useRevisiones'

interface Props {
  open: boolean
  onClose: () => void
  pid: number
  revision?: Revision
}

const num = (s: string) => (s.trim() === '' ? null : Number(s))

const MEDIDA_KEYS = [...PLIEGUES, ...PERIMETROS].map((m) => m.key)
const esquema = esquemaRevision()

export function RevisionModal({ open, onClose, pid, revision }: Props) {
  const isEdit = !!revision
  const create = useCreateRevision(pid)
  const update = useUpdateRevision(pid)
  const { register, handleSubmit, reset, formState } = useForm<Record<string, string>>({
    resolver: zodResolver(esquema),
  })
  const errores = formState.errors

  useEffect(() => {
    if (!open) return
    const v: Record<string, string> = {
      fecha: revision?.fecha ?? new Date().toISOString().slice(0, 10),
      peso: revision?.peso != null ? String(revision.peso) : '',
      envergadura: revision?.envergadura != null ? String(revision.envergadura) : '',
      notas: revision?.notas ?? '',
    }
    for (const k of MEDIDA_KEYS) {
      const val = revision?.[k]
      // Un 0 heredado de datos antiguos se muestra vacío: el contrato exige mayor que 0.
      v[k] = val != null && val !== 0 ? String(val) : ''
    }
    reset(v)
  }, [open, revision, reset])

  async function onSubmit(v: Record<string, string>) {
    const medida = (k: ClaveMedida) => num(v[k] ?? '')
    const body: RevisionInput = {
      fecha: v.fecha?.trim() || null,
      peso: num(v.peso ?? ''),
      talla: null,
      envergadura: num(v.envergadura ?? ''),
      notas: v.notas?.trim() || null,
      pl_bicipital: medida('pl_bicipital'),
      pl_tricipital: medida('pl_tricipital'),
      pl_subescapular: medida('pl_subescapular'),
      pl_supraespinal: medida('pl_supraespinal'),
      pl_supracrestal: medida('pl_supracrestal'),
      pl_abdominal: medida('pl_abdominal'),
      pl_muslo_int: medida('pl_muslo_int'),
      pl_pierna_med: medida('pl_pierna_med'),
      per_antebrazo: medida('per_antebrazo'),
      per_brazo_rel: medida('per_brazo_rel'),
      per_brazo_cont: medida('per_brazo_cont'),
      per_hombros: medida('per_hombros'),
      per_pecho: medida('per_pecho'),
      per_cintura: medida('per_cintura'),
      per_caderas: medida('per_caderas'),
      per_muslo: medida('per_muslo'),
      per_muslo_cont: medida('per_muslo_cont'),
      per_gemelo: medida('per_gemelo'),
    }
    const ok = await intentar(revision ? update.mutateAsync({ id: revision.id, body }) : create.mutateAsync(body))
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar revisión' : 'Nueva revisión'}
      className="w-[min(720px,94vw)]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2">
          <Field label="Fecha *" error={errores.fecha?.message}>
            <Input type="date" {...register('fecha')} />
          </Field>
          <Field label="Peso (kg)" error={errores.peso?.message}>
            <Input type="number" step="0.1" {...register('peso')} />
          </Field>
          <Field label="Envergadura (cm)" error={errores.envergadura?.message}>
            <Input type="number" step="0.1" {...register('envergadura')} />
          </Field>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Pliegues cutáneos (mm)</div>
          <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
            {PLIEGUES.map((m) => (
              <Field key={m.key} label={m.short} error={errores[m.key]?.message}>
                <Input type="number" step="0.1" {...register(m.key)} />
              </Field>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Perímetros (cm)</div>
          <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
            {PERIMETROS.map((m) => (
              <Field key={m.key} label={m.short} error={errores[m.key]?.message}>
                <Input type="number" step="0.1" {...register(m.key)} />
              </Field>
            ))}
          </div>
        </div>

        <Field label="Notas" error={errores.notas?.message}>
          <Textarea {...register('notas')} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={create.isPending || update.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear revisión'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
