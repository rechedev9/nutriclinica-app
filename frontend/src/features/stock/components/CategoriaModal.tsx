import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useCreateCategoria, useUpdateCategoria } from '../hooks/useStock'
import type { Categoria } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  categoria?: Categoria
}

export function CategoriaModal({ open, onClose, categoria }: Props) {
  const isEdit = !!categoria
  const create = useCreateCategoria()
  const update = useUpdateCategoria()
  const { register, handleSubmit, reset } = useForm<{ nombre: string }>()

  useEffect(() => {
    if (open) reset({ nombre: categoria?.nombre ?? '' })
  }, [open, categoria, reset])

  async function onSubmit(v: { nombre: string }) {
    const nombre = v.nombre.trim()
    if (isEdit) await update.mutateAsync({ id: categoria!.id, nombre })
    else await create.mutateAsync(nombre)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar categoría' : 'Nueva categoría'} className="w-[min(420px,92vw)]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *">
          <Input autoFocus {...register('nombre', { required: true })} />
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
