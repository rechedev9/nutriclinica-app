import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeError } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type {
  AlmacenRow,
  Categoria,
  Compra,
  CompraInput,
  Merma,
  MermaInput,
  Producto,
  ProductoInput,
  Proveedor,
  ProveedorInput,
  Venta,
  VentaInput,
} from '@/types'

const invalidate = (
  qc: ReturnType<typeof useQueryClient>,
  keys: ReadonlyArray<readonly unknown[]>,
) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))

// --- Almacén / Productos ---
export const useAlmacen = () =>
  useQuery({ queryKey: qk.stock.almacen, queryFn: () => api<AlmacenRow[]>('GET', '/api/stock/almacen') })

export const useProductos = () =>
  useQuery({ queryKey: qk.stock.productos, queryFn: () => api<Producto[]>('GET', '/api/stock/productos') })

export const useCategorias = () =>
  useQuery({ queryKey: qk.stock.categorias, queryFn: () => api<Categoria[]>('GET', '/api/stock/categorias') })

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: ProductoInput) => api<Producto>('POST', '/api/stock/productos', b),
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
      api<Producto>('PUT', `/api/stock/productos/${id}`, body),
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
    mutationFn: (id: number) => api('DELETE', `/api/stock/productos/${id}`),
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
    mutationFn: (nombre: string) => api<Categoria>('POST', '/api/stock/categorias', { nombre }),
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
      api<Categoria>('PUT', `/api/stock/categorias/${id}`, { nombre }),
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
    mutationFn: (id: number) => api('DELETE', `/api/stock/categorias/${id}`),
    onSuccess: () => {
      invalidate(qc, [qk.stock.categorias])
      toast.success('Categoría eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Proveedores ---
export const useProveedores = () =>
  useQuery({ queryKey: qk.stock.proveedores, queryFn: () => api<Proveedor[]>('GET', '/api/stock/proveedores') })

export function useCreateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: ProveedorInput) => api<Proveedor>('POST', '/api/stock/proveedores', b),
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
      api<Proveedor>('PUT', `/api/stock/proveedores/${id}`, body),
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
    mutationFn: (id: number) => api('DELETE', `/api/stock/proveedores/${id}`),
    onSuccess: () => {
      invalidate(qc, [qk.stock.proveedores])
      toast.success('Proveedor eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Compras ---
export const useCompras = () =>
  useQuery({ queryKey: qk.stock.compras, queryFn: () => api<Compra[]>('GET', '/api/stock/compras') })

export function useCreateCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: CompraInput) => api('POST', '/api/stock/compras', b),
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
    mutationFn: ({ id, body }: { id: number; body: CompraInput }) =>
      api('PUT', `/api/stock/compras/${id}`, body),
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
    mutationFn: (id: number) => api('DELETE', `/api/stock/compras/${id}`),
    onSuccess: () => {
      invalidate(qc, [qk.stock.compras, qk.stock.almacen])
      toast.success('Compra eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Ventas ---
export const useVentas = () =>
  useQuery({ queryKey: qk.stock.ventas, queryFn: () => api<Venta[]>('GET', '/api/stock/ventas') })

export function useCreateVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: VentaInput) => api('POST', '/api/stock/ventas', b),
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
    mutationFn: (id: number) => api('DELETE', `/api/stock/ventas/${id}`),
    onSuccess: () => {
      invalidate(qc, [qk.stock.ventas, qk.stock.almacen])
      toast.success('Venta eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Mermas ---
export const useMermas = () =>
  useQuery({ queryKey: qk.stock.mermas, queryFn: () => api<Merma[]>('GET', '/api/stock/mermas') })

export function useCreateMerma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: MermaInput) => api('POST', '/api/stock/mermas', b),
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
    mutationFn: (id: number) => api('DELETE', `/api/stock/mermas/${id}`),
    onSuccess: () => {
      invalidate(qc, [qk.stock.mermas, qk.stock.almacen])
      toast.success('Merma eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
