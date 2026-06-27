import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { PLIEGUES, PERIMETROS } from '@/types'
import type { Revision, RevisionInput } from '@/types'
import { useCreateRevision, useUpdateRevision } from '../hooks/useRevisiones'

interface Props {
  open: boolean
  onClose: () => void
  pid: number
  revision?: Revision
}

const num = (s: string) => (s.trim() === '' ? null : Number(s))

const MEDIDA_KEYS = [...PLIEGUES, ...PERIMETROS].map((m) => m.key)

export function RevisionModal({ open, onClose, pid, revision }: Props) {
  const isEdit = !!revision
  const create = useCreateRevision(pid)
  const update = useUpdateRevision(pid)
  const { register, handleSubmit, reset } = useForm<Record<string, string>>()

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
      v[k] = val != null ? String(val) : ''
    }
    reset(v)
  }, [open, revision, reset])

  async function onSubmit(v: Record<string, string>) {
    const body = {
      fecha: v.fecha?.trim() || null,
      peso: num(v.peso ?? ''),
      talla: null,
      envergadura: num(v.envergadura ?? ''),
      notas: v.notas?.trim() || null,
    } as RevisionInput
    for (const k of MEDIDA_KEYS) {
      ;(body as Record<string, unknown>)[k] = num(v[k] ?? '')
    }
    if (isEdit) await update.mutateAsync({ id: revision!.id, body })
    else await create.mutateAsync(body)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar revisión' : 'Nueva revisión'} className="w-[min(720px,94vw)]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2">
          <Field label="Fecha *">
            <Input type="date" {...register('fecha', { required: true })} />
          </Field>
          <Field label="Peso (kg)">
            <Input type="number" step="0.1" {...register('peso')} />
          </Field>
          <Field label="Envergadura (cm)">
            <Input type="number" step="0.1" {...register('envergadura')} />
          </Field>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Pliegues cutáneos (mm)</div>
          <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
            {PLIEGUES.map((m) => (
              <Field key={m.key} label={m.short}>
                <Input type="number" step="0.1" {...register(m.key)} />
              </Field>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Perímetros (cm)</div>
          <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
            {PERIMETROS.map((m) => (
              <Field key={m.key} label={m.short}>
                <Input type="number" step="0.1" {...register(m.key)} />
              </Field>
            ))}
          </div>
        </div>

        <Field label="Notas">
          <Textarea {...register('notas')} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear revisión'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
