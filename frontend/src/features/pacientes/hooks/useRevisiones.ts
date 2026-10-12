import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeError } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import { limpiaRevision } from '@/lib/format/revision'
import type { Revision, RevisionInput } from '@/types'

export function useRevisiones(pid: number) {
  return useQuery({
    queryKey: qk.revisiones(pid),
    queryFn: async () => (await api<Revision[]>('GET', `/api/pacientes/${pid}/revisiones`)).map(limpiaRevision),
    enabled: pid > 0,
  })
}

export function useCreateRevision(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RevisionInput) => api<Revision>('POST', `/api/pacientes/${pid}/revisiones`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.revisiones(pid) })
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Revisión guardada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdateRevision(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RevisionInput }) =>
      api<Revision>('PUT', `/api/revisiones/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.revisiones(pid) })
      toast.success('Revisión actualizada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteRevision(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api('DELETE', `/api/revisiones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.revisiones(pid) })
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Revisión eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
