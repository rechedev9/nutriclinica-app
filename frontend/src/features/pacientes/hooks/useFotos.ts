import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'

export function useFotos(pid: number) {
  return useQuery({
    queryKey: qk.fotos(pid),
    queryFn: () => pedir(servidor.pacientes({ id: pid }).fotos.get()),
    enabled: pid > 0,
  })
}

export function useUploadFoto(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, nota }: { file: File; nota: string }) =>
      pedir(servidor.pacientes({ id: pid }).fotos.post(nota ? { foto: file, nota } : { foto: file })),
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
    mutationFn: (id: number) => pedir(servidor.fotos({ id }).delete()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.fotos(pid) })
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Foto eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
