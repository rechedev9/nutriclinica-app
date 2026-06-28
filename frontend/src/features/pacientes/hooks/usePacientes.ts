import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeError } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type { Paciente, PacienteInput } from '@/types'

export function usePacientes() {
  return useQuery({
    queryKey: qk.pacientes,
    queryFn: () => api<Paciente[]>('GET', '/api/pacientes'),
  })
}

export function useCreatePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PacienteInput) => api<Paciente>('POST', '/api/pacientes', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Paciente creado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdatePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PacienteInput }) =>
      api<Paciente>('PUT', `/api/pacientes/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Paciente actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeletePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api('DELETE', `/api/pacientes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pacientes })
      toast.success('Paciente eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
