import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useCreateProveedor, useUpdateProveedor } from '../hooks/useStock'
import type { Proveedor, ProveedorInput } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  proveedor?: Proveedor
}

const nil = (s: string) => (s.trim() === '' ? null : s.trim())

export function ProveedorModal({ open, onClose, proveedor }: Props) {
  const isEdit = !!proveedor
  const create = useCreateProveedor()
  const update = useUpdateProveedor()
  const { register, handleSubmit, reset } = useForm<{ nombre: string; telefono: string; email: string; notas: string }>()

  useEffect(() => {
    if (open)
      reset({
        nombre: proveedor?.nombre ?? '',
        telefono: proveedor?.telefono ?? '',
        email: proveedor?.email ?? '',
        notas: proveedor?.notas ?? '',
      })
  }, [open, proveedor, reset])

  async function onSubmit(v: { nombre: string; telefono: string; email: string; notas: string }) {
    const body: ProveedorInput = {
      nombre: v.nombre.trim(),
      telefono: nil(v.telefono),
      email: nil(v.email),
      notas: nil(v.notas),
    }
    if (isEdit) await update.mutateAsync({ id: proveedor!.id, body })
    else await create.mutateAsync(body)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *">
          <Input autoFocus {...register('nombre', { required: true })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input {...register('telefono')} />
          </Field>
          <Field label="Email">
            <Input type="email" {...register('email')} />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea {...register('notas')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{isEdit ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
