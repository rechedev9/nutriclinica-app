import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeError, pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { toast } from 'sonner'
import type { UsuarioInput } from '@/types'

export const useUsuarios = () => useQuery({ queryKey: qk.usuarios, queryFn: () => pedir(servidor.usuarios.get()) })

export function useCreateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: UsuarioInput) => pedir(servidor.usuarios.post(b)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios })
      toast.success('Usuario creado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, usuario, rol }: { id: number; usuario: string; rol: string }) =>
      pedir(servidor.usuarios({ id }).put({ usuario, rol })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios })
      toast.success('Usuario actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useSetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      pedir(servidor.usuarios({ id }).password.post({ password })),
    onSuccess: () => toast.success('Contraseña actualizada'),
    onError: (e) => toast.error(mensajeError(e)),
  })
}

export function useDeleteUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedir(servidor.usuarios({ id }).delete()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios })
      toast.success('Usuario eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
}
