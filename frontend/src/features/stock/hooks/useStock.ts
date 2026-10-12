import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type { CompraInput, MermaInput, ProductoInput, ProveedorInput, VentaInput } from '@/types'

const invalidate = (qc: ReturnType<typeof useQueryClient>, keys: ReadonlyArray<readonly unknown[]>) =>
  keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))

// --- Almacén / Productos ---
export const useAlmacen = () =>
  useQuery({ queryKey: qk.stock.almacen, queryFn: () => pedir(servidor.stock.almacen.get()) })

export const useProductos = () =>
  useQuery({ queryKey: qk.stock.productos, queryFn: () => pedir(servidor.stock.productos.get()) })

export const useCategorias = () =>
  useQuery({ queryKey: qk.stock.categorias, queryFn: () => pedir(servidor.stock.categorias.get()) })

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: ProductoInput) => pedir(servidor.stock.productos.post(b)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.productos, qk.stock.almacen])
      toast.success('Producto creado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductoInput }) =>
      pedir(servidor.stock.productos({ id }).put(body)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.productos, qk.stock.almacen])
      toast.success('Producto actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.productos({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.productos, qk.stock.almacen])
      toast.success('Producto eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useCreateCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => pedir(servidor.stock.categorias.post({ nombre })),
    onSuccess: () => {
      invalidate(qc, [qk.stock.categorias])
      toast.success('Categoría creada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdateCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      pedir(servidor.stock.categorias({ id }).put({ nombre })),
    onSuccess: () => {
      invalidate(qc, [qk.stock.categorias])
      toast.success('Categoría actualizada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.categorias({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.categorias])
      toast.success('Categoría eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Proveedores ---
export const useProveedores = () =>
  useQuery({ queryKey: qk.stock.proveedores, queryFn: () => pedir(servidor.stock.proveedores.get()) })

export function useCreateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: ProveedorInput) => pedir(servidor.stock.proveedores.post(b)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.proveedores])
      toast.success('Proveedor creado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProveedorInput }) =>
      pedir(servidor.stock.proveedores({ id }).put(body)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.proveedores])
      toast.success('Proveedor actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.proveedores({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.proveedores])
      toast.success('Proveedor eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Compras ---
export const useCompras = () =>
  useQuery({ queryKey: qk.stock.compras, queryFn: () => pedir(servidor.stock.compras.get()) })

export function useCreateCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: CompraInput) => pedir(servidor.stock.compras.post(b)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.compras, qk.stock.almacen])
      toast.success('Compra registrada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdateCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CompraInput }) => pedir(servidor.stock.compras({ id }).put(body)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.compras, qk.stock.almacen])
      toast.success('Compra actualizada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.compras({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.compras, qk.stock.almacen])
      toast.success('Compra eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Ventas ---
export const useVentas = () =>
  useQuery({ queryKey: qk.stock.ventas, queryFn: () => pedir(servidor.stock.ventas.get()) })

export function useCreateVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: VentaInput) => pedir(servidor.stock.ventas.post(b)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.ventas, qk.stock.almacen])
      toast.success('Venta registrada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.ventas({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.ventas, qk.stock.almacen])
      toast.success('Venta eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Mermas ---
export const useMermas = () =>
  useQuery({ queryKey: qk.stock.mermas, queryFn: () => pedir(servidor.stock.mermas.get()) })

export function useCreateMerma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: MermaInput) => pedir(servidor.stock.mermas.post(b)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.mermas, qk.stock.almacen])
      toast.success('Merma registrada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteMerma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.mermas({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.mermas, qk.stock.almacen])
      toast.success('Merma eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
