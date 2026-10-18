import { useQuery } from '@tanstack/react-query'
import { pedir, servidor } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'

// Agrega ventas, caja y compras: se pide de nuevo cada vez que se abre Inicio en lugar de
// depender de que cada mutación de esas secciones lo invalide.
export const useResumenInicio = () =>
  useQuery({ queryKey: qk.inicio, queryFn: () => pedir(servidor.inicio.resumen.get()), staleTime: 0 })
