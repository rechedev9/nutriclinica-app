import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type { PacienteInput } from '@/types'

export function usePacientes() {
  return useQuery({
    queryKey: qk.pacientes,
    queryFn: () => pedir(servidor.pacientes.get()),
  })
}

export function useCreatePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PacienteInput) => pedir(servidor.pacientes.post(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Cliente creado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdatePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PacienteInput }) => pedir(servidor.pacientes({ id }).put(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Cliente actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeletePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.pacientes({ id }).delete()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Cliente eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
