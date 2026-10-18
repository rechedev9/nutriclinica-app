import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type {
  CompraInput,
  MermaInput,
  PedidoInput,
  ProductoInput,
  ProveedorInput,
  RecepcionInput,
  RecuentoInput,
} from '@/types'

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
      invalidate(qc, [qk.stock.compras, qk.stock.pedidos, qk.stock.almacen])
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
      invalidate(qc, [qk.stock.compras, qk.stock.pedidos, qk.stock.almacen])
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
      invalidate(qc, [qk.stock.compras, qk.stock.pedidos, qk.stock.almacen])
      toast.success('Compra eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// --- Pedidos a proveedor ---
export const usePedidos = () =>
  useQuery({ queryKey: qk.stock.pedidos, queryFn: () => pedir(servidor.stock.pedidos.get()) })

export function useCreatePedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: PedidoInput) => pedir(servidor.stock.pedidos.post(b)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.pedidos])
      toast.success('Pedido guardado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdatePedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PedidoInput }) => pedir(servidor.stock.pedidos({ id }).put(body)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.pedidos])
      toast.success('Pedido actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeletePedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.stock.pedidos({ id }).delete()),
    onSuccess: () => {
      invalidate(qc, [qk.stock.pedidos])
      toast.success('Pedido eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useCambiarEstadoPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion }: { id: number; accion: 'cerrar' | 'reabrir' }) =>
      pedir(
        accion === 'cerrar'
          ? servidor.stock.pedidos({ id }).cerrar.post()
          : servidor.stock.pedidos({ id }).reabrir.post(),
      ),
    onSuccess: (_r, { accion }) => {
      invalidate(qc, [qk.stock.pedidos])
      toast.success(accion === 'cerrar' ? 'Pedido cerrado' : 'Pedido reabierto')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// Un albarán suma existencias y aparece también en Compras.
export function useRecibirPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RecepcionInput }) =>
      pedir(servidor.stock.pedidos({ id }).recepciones.post(body)),
    onSuccess: () => {
      invalidate(qc, [qk.stock.pedidos, qk.stock.compras, qk.stock.almacen])
      toast.success('Albarán entrado: el stock ya está sumado')
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

// --- Recuentos y movimientos ---
export const useRecuentos = () =>
  useQuery({ queryKey: qk.stock.recuentos, queryFn: () => pedir(servidor.stock.recuentos.get()) })

export const useMovimientos = (id: number) =>
  useQuery({
    queryKey: qk.stock.movimientos(id),
    queryFn: () => pedir(servidor.stock.productos({ id }).movimientos.get()),
  })

export function useCreateRecuento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: RecuentoInput) => pedir(servidor.stock.recuentos.post(b)),
    onSuccess: (r) => {
      invalidate(qc, [qk.stock.recuentos, qk.stock.almacen])
      const ajustes = r.lineas.filter((l) => l.diferencia !== 0).length
      toast.success(ajustes === 0 ? 'Recuento registrado: todo cuadra' : `Recuento registrado: ${ajustes} ajuste(s)`)
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
