import { useQuery } from '@tanstack/react-query'
import { pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'

export function useHistorial(pid: number) {
  return useQuery({
    queryKey: qk.historial(pid),
    queryFn: () => pedir(servidor.pacientes({ id: pid }).historial.get()),
    enabled: pid > 0,
  })
}
