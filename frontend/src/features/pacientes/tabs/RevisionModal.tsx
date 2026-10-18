import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Chevron } from '@/components/ui/Chevron'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { ALL_MEDIDAS } from '@/types'
import type { MedidaDef, Revision } from '@/types'
import { intentar } from '@/lib/api/intentar'
import { esquemaRevision } from '@/lib/validacion/esquemas'
import { useCreateRevision, useUpdateRevision } from '../hooks/useRevisiones'
import { cuerpoRevision } from '../cuerpo-revision'
import {
  abrirMasMedidas,
  CLAVES_PLEGADAS,
  perimetrosPlegados,
  perimetrosVisibles,
  plieguesPlegados,
  plieguesVisibles,
} from '../medidas-analisis'

interface Props {
  open: boolean
  onClose: () => void
  pid: number
  revision?: Revision
  anterior?: Revision
}

const esquema = esquemaRevision()

function claveDialogo(origen: { open: boolean; revision?: Revision; anterior?: Revision }): string {
  if (!origen.open) return 'cerrado'
  if (origen.revision) return `editar-${origen.revision.id}`
  return `nueva-${origen.anterior?.id ?? 'sin'}`
}

function FormularioRevision({ open, onClose, pid, revision, anterior }: Props) {
  const isEdit = !!revision
  const create = useCreateRevision(pid)
  const update = useUpdateRevision(pid)
  const { register, handleSubmit, reset, formState } = useForm<Record<string, string>>({
    resolver: zodResolver(esquema),
  })
  const errores = formState.errors
  const [masMedidas, setMasMedidas] = useState(() => abrirMasMedidas({ editando: revision, anterior }))
  const abierta = masMedidas || CLAVES_PLEGADAS.some((clave) => errores[clave] !== undefined)

  useEffect(() => {
    if (!open) return
    const v: Record<string, string> = {
      fecha: revision?.fecha ?? new Date().toISOString().slice(0, 10),
      peso: revision?.peso != null ? String(revision.peso) : '',
      envergadura: revision?.envergadura != null ? String(revision.envergadura) : '',
      notas: revision?.notas ?? '',
    }
    for (const m of ALL_MEDIDAS) {
      const val = revision?.[m.key]
      // Un 0 heredado de datos antiguos se muestra vacío: el contrato exige mayor que 0.
      v[m.key] = val != null && val !== 0 ? String(val) : ''
    }
    reset(v)
  }, [open, revision, reset])

  async function onSubmit(v: Record<string, string>) {
    const body = cuerpoRevision({ valores: v, talla: revision?.talla ?? null })
    const ok = await intentar(revision ? update.mutateAsync({ id: revision.id, body }) : create.mutateAsync(body))
    if (ok) onClose()
  }

  function bloque(titulo: string, medidas: MedidaDef[]) {
    if (medidas.length === 0) return null
    return (
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">{titulo}</div>
        <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
          {medidas.map((m) => (
            <Field key={m.key} label={m.short} error={errores[m.key]?.message}>
              <Input type="number" step="0.1" {...register(m.key)} />
            </Field>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2">
        <Field label="Fecha *" error={errores.fecha?.message}>
          <Input type="date" {...register('fecha')} />
        </Field>
        <Field label="Peso (kg)" error={errores.peso?.message}>
          <Input type="number" step="0.1" {...register('peso')} />
        </Field>
      </div>

      {bloque('Pliegues cutáneos (mm)', plieguesVisibles)}
      {bloque('Perímetros (cm)', perimetrosVisibles)}

      <button
        type="button"
        aria-expanded={abierta}
        aria-controls="mas-medidas"
        onClick={() => setMasMedidas(!abierta)}
        className="flex items-center gap-2 self-start text-sm font-semibold text-ink"
      >
        <Chevron abierto={abierta} />
        Más medidas
      </button>

      <div id="mas-medidas" className={abierta ? 'flex flex-col gap-4 border-t border-border pt-4' : 'hidden'}>
        <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
          <Field label="Envergadura (cm)" error={errores.envergadura?.message}>
            <Input type="number" step="0.1" {...register('envergadura')} />
          </Field>
        </div>
        {bloque('Pliegues cutáneos (mm)', plieguesPlegados)}
        {bloque('Perímetros (cm)', perimetrosPlegados)}
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
  )
}

export function RevisionModal({ open, onClose, pid, revision, anterior }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={revision ? 'Editar revisión' : 'Nueva revisión'}
      className="w-[min(720px,94vw)]"
    >
      <FormularioRevision
        key={claveDialogo({ open, revision, anterior })}
        open={open}
        onClose={onClose}
        pid={pid}
        revision={revision}
        anterior={anterior}
      />
    </Modal>
  )
}
