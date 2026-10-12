import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { intentar } from '@/lib/api/intentar'
import { esquemaProveedor } from '@/lib/validacion/esquemas'
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
  const { register, handleSubmit, reset, formState } = useForm<{ nombre: string; telefono: string; email: string; notas: string }>({
    resolver: zodResolver(esquemaProveedor),
  })

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
    const ok = await intentar(
      proveedor ? update.mutateAsync({ id: proveedor.id, body }) : create.mutateAsync(body),
    )
    if (ok) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *" error={formState.errors.nombre?.message}>
          <Input autoFocus {...register('nombre')} />
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
          <Button type="submit" isLoading={create.isPending || update.isPending}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
