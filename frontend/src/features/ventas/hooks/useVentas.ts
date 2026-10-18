import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import type { CierreInput, CorreccionVentaInput, DevolucionInput, Tienda, VentaInput } from '@/types'

type Cliente = ReturnType<typeof useQueryClient>

// Una venta, anulación o devolución mueve el stock, la caja y lo que ve el inicio.
function refrescarVentas(qc: Cliente) {
  for (const queryKey of [qk.ventas.todas, qk.caja.todo, qk.stock.almacen]) void qc.invalidateQueries({ queryKey })
}

export const useVentas = (pacienteId: number | null = null) =>
  useQuery({
    queryKey: qk.ventas.lista(pacienteId),
    queryFn: () => pedir(servidor.ventas.get({ query: pacienteId === null ? {} : { paciente_id: pacienteId } })),
  })

export const useVenta = (id: number | null) =>
  useQuery({
    queryKey: qk.ventas.una(id ?? 0),
    queryFn: () => pedir(servidor.ventas({ id: id ?? 0 }).get()),
    enabled: id !== null,
  })

export function useCreateVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: VentaInput) => pedir(servidor.ventas.post(b)),
    onSuccess: () => refrescarVentas(qc),
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useCorregirVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CorreccionVentaInput }) => pedir(servidor.ventas({ id }).put(body)),
    onSuccess: () => {
      refrescarVentas(qc)
      toast.success('Venta corregida')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useAnularVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      pedir(servidor.ventas({ id }).anular.post({ motivo })),
    onSuccess: () => {
      refrescarVentas(qc)
      toast.success('Venta anulada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDevolucion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DevolucionInput }) =>
      pedir(servidor.ventas({ id }).devoluciones.post(body)),
    onSuccess: () => {
      refrescarVentas(qc)
      toast.success('Devolución registrada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

// Mantiene las cifras anteriores mientras llegan las del periodo nuevo, para que la pantalla no parpadee.
export const useEstadisticasVentas = (rango: { desde: string; hasta: string } | null) =>
  useQuery({
    queryKey: qk.ventas.estadisticas(rango?.desde ?? '', rango?.hasta ?? ''),
    queryFn: () =>
      pedir(servidor.ventas.estadisticas.get({ query: { desde: rango?.desde ?? '', hasta: rango?.hasta ?? '' } })),
    enabled: rango !== null,
    placeholderData: keepPreviousData,
  })

export const useResumenCaja = (fecha: string) =>
  useQuery({ queryKey: qk.caja.dia(fecha), queryFn: () => pedir(servidor.caja.dia({ fecha }).get()) })

export const useCierres = () =>
  useQuery({ queryKey: qk.caja.cierres, queryFn: () => pedir(servidor.caja.cierres.get()) })

export function useCerrarCaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: CierreInput) => pedir(servidor.caja.cierres.post(b)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.caja.todo })
      void qc.invalidateQueries({ queryKey: qk.inicio })
      toast.success('Caja cerrada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useReabrirCaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.caja.cierres({ id }).delete()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.caja.todo })
      void qc.invalidateQueries({ queryKey: qk.inicio })
      toast.success('Caja reabierta')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export const useTienda = () => useQuery({ queryKey: qk.tienda, queryFn: () => pedir(servidor.tienda.get()) })

export function useGuardarTienda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: Tienda) => pedir(servidor.tienda.put(b)),
    onSuccess: (datos) => {
      qc.setQueryData(qk.tienda, datos)
      toast.success('Datos del ticket guardados')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
