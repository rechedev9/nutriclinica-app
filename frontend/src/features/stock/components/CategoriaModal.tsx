import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { intentar } from '@/lib/api/intentar'
import { esquemaNombre } from '@/lib/validacion/esquemas'
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
  const { register, handleSubmit, reset, formState } = useForm<{ nombre: string }>({
    resolver: zodResolver(esquemaNombre),
  })

  useEffect(() => {
    if (open) reset({ nombre: categoria?.nombre ?? '' })
  }, [open, categoria, reset])

  async function onSubmit(v: { nombre: string }) {
    const nombre = v.nombre.trim()
    const ok = await intentar(categoria ? update.mutateAsync({ id: categoria.id, nombre }) : create.mutateAsync(nombre))
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      className="w-[min(420px,92vw)]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *" error={formState.errors.nombre?.message}>
          <Input autoFocus {...register('nombre')} />
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
