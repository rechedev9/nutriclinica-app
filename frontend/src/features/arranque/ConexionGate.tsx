import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { MENSAJE_SIN_CONEXION, esErrorDeRed, pedir, servidor } from '@/lib/api/client'

// Marco común: fondo degradado + tarjeta centrada (igual que el login).
function Marco({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a3d4a 0%, #0F7B92 50%, #1aaccc 100%)' }}
    >
      <div className="w-[min(440px,92vw)] rounded-card bg-surface p-8 shadow-md">{children}</div>
    </div>
  )
}

// ConexionGate comprueba al arrancar que el servidor responde. Si no hay conexión
// muestra un aviso con reintento en lugar de una app vacía.
export function ConexionGate({ children }: { children: ReactNode }) {
  const { isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['estado'],
    queryFn: () => pedir(servidor.estado.get()),
    staleTime: Infinity,
    retry: false,
  })

  if (isLoading) {
    return (
      <Marco>
        <div className="flex justify-center py-6">
          <Spinner className="h-8 w-8" />
        </div>
      </Marco>
    )
  }

  if (isError && esErrorDeRed(error)) {
    return (
      <Marco>
        <h1 className="mb-2 text-xl font-extrabold text-ink">{MENSAJE_SIN_CONEXION}</h1>
        <p className="mb-5 text-sm text-ink-muted">
          Comprueba que la aplicación sigue en marcha y vuelve a intentarlo.
        </p>
        <Button className="w-full" isLoading={isFetching} onClick={() => void refetch()}>
          Reintentar
        </Button>
      </Marco>
    )
  }

  // Con cualquier otro error no se bloquea: cada pantalla muestra su propio estado.
  return <>{children}</>
}
