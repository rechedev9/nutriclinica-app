import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// PantallaError es la pantalla de error a pantalla completa (sin traza).
export function PantallaError() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-app p-8 text-center text-ink">
      <div className="text-lg font-bold">Algo ha ido mal</div>
      <p className="max-w-md text-sm text-ink-muted">
        Se ha producido un error inesperado en la aplicación. Puedes recargar la página para continuar.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Recargar
      </button>
    </div>
  )
}

// ErrorBoundary evita que un error en cualquier componente desmonte toda la app
// y deje la pantalla en blanco. Muestra un aviso con opción de recargar.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // El detalle queda en consola; al usuario se le muestra un mensaje neutro.
    console.error('Error no controlado en la interfaz:', error)
  }

  render() {
    if (this.state.error) {
      return <PantallaError />
    }
    return this.props.children
  }
}
