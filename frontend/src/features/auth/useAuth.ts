import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, mensajeError, sesionIniciada } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import type { Me } from '@/types'

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      const me = await api<Me>('GET', '/api/me')
      // Una sesión válida (p. ej. iniciada en otra pestaña) rearma el aviso de caducidad.
      sesionIniciada()
      return me
    },
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { usuario: string; password: string }) =>
      api<{ ok: boolean; usuario: string; rol: string }>('POST', '/api/login', body),
    onSuccess: () => {
      sesionIniciada()
      return qc.invalidateQueries({ queryKey: qk.me })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api('POST', '/api/logout'),
    // Al cerrar sesión se vacía toda la caché de datos del usuario.
    onSuccess: () => qc.clear(),
    onError: (e) => toast.error(`No se pudo cerrar la sesión. ${mensajeError(e)}`),
  })
}
