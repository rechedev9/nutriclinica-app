import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import type { Me } from '@/types'

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api<Me>('GET', '/api/me'),
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { usuario: string; password: string }) =>
      api<{ ok: boolean; usuario: string; rol: string }>('POST', '/api/login', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api('POST', '/api/logout'),
    // Al cerrar sesión se vacía toda la caché de datos del usuario.
    onSuccess: () => qc.clear(),
  })
}
