import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import {
  useCategorias,
  useCreateCategoria,
  useCreateProducto,
  useProveedores,
  useUpdateProducto,
} from '../hooks/useStock'
import type { Producto, ProductoInput } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  producto?: Producto
}

interface FormValues {
  nombre: string
  categoria_id: string
  proveedor_id: string
  precio_coste: string
  precio_venta: string
  unidad: string
  stock_minimo: string
}

const num = (s: string) => (s.trim() === '' ? null : Number(s))
const id = (s: string) => (s === '' ? null : Number(s))

export function ProductoModal({ open, onClose, producto }: Props) {
  const isEdit = !!producto
  const { data: categorias = [] } = useCategorias()
  const { data: proveedores = [] } = useProveedores()
  const create = useCreateProducto()
  const update = useUpdateProducto()
  const createCat = useCreateCategoria()
  const [nuevaCat, setNuevaCat] = useState('')
  const { register, handleSubmit, reset } = useForm<FormValues>()

  useEffect(() => {
    if (open)
      reset({
        nombre: producto?.nombre ?? '',
        categoria_id: producto?.categoria_id != null ? String(producto.categoria_id) : '',
        proveedor_id: producto?.proveedor_id != null ? String(producto.proveedor_id) : '',
        precio_coste: producto?.precio_coste != null ? String(producto.precio_coste) : '',
        precio_venta: producto?.precio_venta != null ? String(producto.precio_venta) : '',
        unidad: producto?.unidad ?? 'ud',
        stock_minimo: producto?.stock_minimo != null ? String(producto.stock_minimo) : '',
      })
  }, [open, producto, reset])

  async function onSubmit(v: FormValues) {
    const body: ProductoInput = {
      nombre: v.nombre.trim(),
      categoria_id: id(v.categoria_id),
      proveedor_id: id(v.proveedor_id),
      precio_coste: num(v.precio_coste),
      precio_venta: num(v.precio_venta),
      unidad: v.unidad.trim() || 'ud',
      stock_minimo: num(v.stock_minimo),
    }
    if (isEdit) await update.mutateAsync({ id: producto!.id, body })
    else await create.mutateAsync(body)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Field label="Nombre *">
          <Input autoFocus {...register('nombre', { required: true })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select {...register('categoria_id')}>
              <option value="">—</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proveedor">
            <Select {...register('proveedor_id')}>
              <option value="">—</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex items-end gap-2">
          <Field label="Nueva categoría" className="flex-1">
            <Input value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Crear categoría…" />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={!nuevaCat.trim() || createCat.isPending}
            onClick={async () => {
              await createCat.mutateAsync(nuevaCat.trim())
              setNuevaCat('')
            }}
          >
            Añadir
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio coste (€)">
            <Input type="number" step="0.01" {...register('precio_coste')} />
          </Field>
          <Field label="Precio venta (€)">
            <Input type="number" step="0.01" {...register('precio_venta')} />
          </Field>
          <Field label="Unidad">
            <Input {...register('unidad')} />
          </Field>
          <Field label="Stock mínimo">
            <Input type="number" step="0.1" {...register('stock_minimo')} />
          </Field>
        </div>

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
