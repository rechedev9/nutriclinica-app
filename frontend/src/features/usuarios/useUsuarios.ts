import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type { Usuario, UsuarioInput } from '@/types'

export const useUsuarios = () =>
  useQuery({ queryKey: qk.usuarios, queryFn: () => api<Usuario[]>('GET', '/api/usuarios') })

export function useCreateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: UsuarioInput) => api<Usuario>('POST', '/api/usuarios', b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios })
      toast.success('Usuario creado')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, usuario, rol }: { id: number; usuario: string; rol: string }) =>
      api<Usuario>('PUT', `/api/usuarios/${id}`, { usuario, rol }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios })
      toast.success('Usuario actualizado')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useSetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api('POST', `/api/usuarios/${id}/password`, { password }),
    onSuccess: () => toast.success('Contraseña actualizada'),
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api('DELETE', `/api/usuarios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios })
      toast.success('Usuario eliminado')
    },
    onError: (e) => toast.error(e.message),
  })
}
