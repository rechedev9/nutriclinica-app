import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, uploadFoto, mensajeError } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type { Foto } from '@/types'

export function useFotos(pid: number) {
  return useQuery({
    queryKey: qk.fotos(pid),
    queryFn: () => api<Foto[]>('GET', `/api/pacientes/${pid}/fotos`),
    enabled: pid > 0,
  })
}

export function useUploadFoto(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, nota }: { file: File; nota: string }) => uploadFoto(pid, file, nota),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.fotos(pid) })
      qc.invalidateQueries({ queryKey: qk.pacientes })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteFoto(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api('DELETE', `/api/fotos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.fotos(pid) })
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Foto eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
