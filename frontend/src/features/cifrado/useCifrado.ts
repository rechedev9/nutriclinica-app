import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type EstadoCifrado = 'configurar' | 'migrar' | 'bloqueado' | 'abierto'

const ESTADO_KEY = ['estado-cifrado'] as const

export function useEstadoCifrado() {
  return useQuery({
    queryKey: ESTADO_KEY,
    queryFn: () => api<{ estado: EstadoCifrado }>('GET', '/api/estado'),
    staleTime: Infinity,
    retry: false,
  })
}

// useConfigurar crea la contraseña maestra (primer arranque o cifrado de una BD
// existente). NO invalida el estado al terminar: la pantalla muestra antes la
// clave de recuperación y solo entonces se refresca el estado.
export function useConfigurar() {
  return useMutation({
    mutationFn: (password: string) =>
      api<{ ok: boolean; recovery_key: string }>('POST', '/api/configurar', { password }),
  })
}

export function useUnlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (password: string) => api('POST', '/api/unlock', { password }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTADO_KEY }),
  })
}

export function useRefrescarEstado() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ESTADO_KEY })
}
