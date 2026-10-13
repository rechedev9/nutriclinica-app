import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import { limpiaRevision } from '@/lib/format/revision'
import type { RevisionInput } from '@/types'

export function useRevisiones(pid: number) {
  return useQuery({
    queryKey: qk.revisiones(pid),
    queryFn: async () => (await pedir(servidor.pacientes({ id: pid }).revisiones.get())).map(limpiaRevision),
    enabled: pid > 0,
  })
}

export function useCreateRevision(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RevisionInput) => pedir(servidor.pacientes({ id: pid }).revisiones.post(body)),
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
    mutationFn: ({ id, body }: { id: number; body: RevisionInput }) => pedir(servidor.revisiones({ id }).put(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.revisiones(pid) })
      qc.invalidateQueries({ queryKey: qk.historial(pid) })
      // Cambiar la fecha mueve la "última revisión" que muestran la lista e Inicio.
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Revisión actualizada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteRevision(pid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.revisiones({ id }).delete()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.revisiones(pid) })
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Revisión eliminada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
