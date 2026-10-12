import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { intentar } from '@/lib/api/intentar'
import { esquemaPaciente } from '@/lib/validacion/esquemas'
import { useCreatePaciente, useUpdatePaciente } from '../hooks/usePacientes'
import type { Paciente, PacienteInput } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  paciente?: Paciente
}

interface FormValues {
  nombre: string
  fecha_nac: string
  sexo: string
  grupo_sanguineo: string
  dni: string
  telefono: string
  email: string
  peso: string
  talla: string
  objetivo: string
  actividad_fisica: string
  intolerancias: string
  patologias: string
  notas: string
  consentimiento: boolean
}

function toForm(p?: Paciente): FormValues {
  return {
    nombre: p?.nombre ?? '',
    fecha_nac: p?.fecha_nac ?? '',
    sexo: p?.sexo ?? '',
    grupo_sanguineo: p?.grupo_sanguineo ?? '',
    dni: p?.dni ?? '',
    telefono: p?.telefono ?? '',
    email: p?.email ?? '',
    peso: p?.peso != null ? String(p.peso) : '',
    talla: p?.talla != null ? String(p.talla) : '',
    objetivo: p?.objetivo ?? '',
    actividad_fisica: p?.actividad_fisica ?? '',
    intolerancias: p?.intolerancias ?? '',
    patologias: p?.patologias ?? '',
    notas: p?.notas ?? '',
    consentimiento: (p?.consentimiento ?? 0) === 1,
  }
}

const nil = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => (s.trim() === '' ? null : Number(s))

export function PacienteModal({ open, onClose, paciente }: Props) {
  const isEdit = !!paciente
  const create = useCreatePaciente()
  const update = useUpdatePaciente()
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(esquemaPaciente),
    defaultValues: toForm(paciente),
  })

  useEffect(() => {
    if (open) reset(toForm(paciente))
  }, [open, paciente, reset])

  async function onSubmit(v: FormValues) {
    const body: PacienteInput = {
      nombre: v.nombre.trim(),
      fecha_nac: nil(v.fecha_nac),
      sexo: nil(v.sexo),
      grupo_sanguineo: nil(v.grupo_sanguineo),
      dni: nil(v.dni),
      telefono: nil(v.telefono),
      email: nil(v.email),
      peso: num(v.peso),
      talla: num(v.talla),
      objetivo: nil(v.objetivo),
      actividad_fisica: nil(v.actividad_fisica),
      intolerancias: nil(v.intolerancias),
      patologias: nil(v.patologias),
      notas: nil(v.notas),
      consentimiento: v.consentimiento ? 1 : 0,
    }
    const ok = await intentar(paciente ? update.mutateAsync({ id: paciente.id, body }) : create.mutateAsync(body))
    if (ok) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar paciente' : 'Nuevo paciente'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *" error={formState.errors.nombre?.message}>
          <Input autoFocus {...register('nombre')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de nacimiento" error={formState.errors.fecha_nac?.message}>
            <Input type="date" {...register('fecha_nac')} />
          </Field>
          <Field label="Sexo">
            <Select {...register('sexo')}>
              <option value="">—</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
              <option value="Otro">Otro</option>
            </Select>
          </Field>
          <Field label="DNI / NIF">
            <Input {...register('dni')} />
          </Field>
          <Field label="Grupo sanguíneo">
            <Select {...register('grupo_sanguineo')}>
              <option value="">—</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Teléfono">
            <Input {...register('telefono')} />
          </Field>
          <Field label="Email">
            <Input type="email" {...register('email')} />
          </Field>
          <Field label="Peso inicial (kg)" error={formState.errors.peso?.message}>
            <Input type="number" step="0.1" {...register('peso')} />
          </Field>
          <Field label="Talla (cm)" error={formState.errors.talla?.message}>
            <Input type="number" step="0.1" {...register('talla')} />
          </Field>
          <Field label="Objetivo">
            <Input {...register('objetivo')} />
          </Field>
          <Field label="Actividad física">
            <Input {...register('actividad_fisica')} />
          </Field>
        </div>
        <Field label="Intolerancias / alergias">
          <Textarea {...register('intolerancias')} />
        </Field>
        <Field label="Patologías">
          <Textarea {...register('patologias')} />
        </Field>
        <Field label="Notas / observaciones">
          <Textarea {...register('notas')} />
        </Field>
        <label className="flex items-start gap-2.5 rounded-lg border border-border bg-app p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" {...register('consentimiento')} />
          <span className="text-ink-muted">
            El paciente <span className="font-semibold text-ink">consiente</span> el tratamiento de sus datos de salud
            con fines de seguimiento nutricional (RGPD, art. 9.2.a).
          </span>
        </label>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={create.isPending || update.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear paciente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
