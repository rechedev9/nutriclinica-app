import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
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
  }
}

const nil = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => (s.trim() === '' ? null : Number(s))

export function PacienteModal({ open, onClose, paciente }: Props) {
  const isEdit = !!paciente
  const create = useCreatePaciente()
  const update = useUpdatePaciente()
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
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
    }
    if (isEdit) await update.mutateAsync({ id: paciente!.id, body })
    else await create.mutateAsync(body)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar paciente' : 'Nuevo paciente'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *" error={formState.errors.nombre && 'Obligatorio'}>
          <Input autoFocus {...register('nombre', { required: true })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de nacimiento">
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
            <Input placeholder="A+, 0-…" {...register('grupo_sanguineo')} />
          </Field>
          <Field label="Teléfono">
            <Input {...register('telefono')} />
          </Field>
          <Field label="Email">
            <Input type="email" {...register('email')} />
          </Field>
          <Field label="Peso inicial (kg)">
            <Input type="number" step="0.1" {...register('peso')} />
          </Field>
          <Field label="Talla (cm)">
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
