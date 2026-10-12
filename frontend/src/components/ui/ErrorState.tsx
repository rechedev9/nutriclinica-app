import { ApiError, MENSAJE_SIN_CONEXION, esErrorDeRed, mensajeError } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface Props {
  error: unknown
  onRetry: () => void
  isRetrying?: boolean
  // Qué no se pudo cargar, en minúsculas (p. ej. "los pacientes").
  recurso?: string
  className?: string
}

// ErrorState sustituye al estado vacío cuando una consulta de lectura falla.
// Distingue "no existe" (404) de "no se pudo cargar" (red, 500, etc.).
export function ErrorState({ error, onRetry, isRetrying = false, recurso, className }: Props) {
  const noExiste = error instanceof ApiError && error.status === 404
  const sinConexion = esErrorDeRed(error)

  const titulo = noExiste
    ? 'No encontrado'
    : sinConexion
      ? MENSAJE_SIN_CONEXION
      : recurso
        ? `No se pudieron cargar ${recurso}`
        : 'No se pudo cargar la información'
  const detalle = noExiste
    ? 'Lo que buscas no existe o se ha eliminado.'
    : sinConexion
      ? 'Comprueba que la aplicación sigue en marcha y vuelve a intentarlo.'
      : mensajeError(error)

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center text-ink-muted',
        className,
      )}
    >
      <div className="opacity-40">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-ink">{titulo}</h2>
      <p className="max-w-md text-sm">{detalle}</p>
      {!noExiste && (
        <Button variant="outline" onClick={onRetry} isLoading={isRetrying} className="mt-2">
          Reintentar
        </Button>
      )}
    </div>
  )
}
