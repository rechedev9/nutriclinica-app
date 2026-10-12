import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { PantallaError } from '@/components/ErrorBoundary'

// errorElement del router: reutiliza la pantalla de ErrorBoundary, sin traza.
export function ErrorRuta() {
  const error = useRouteError()
  useEffect(() => {
    console.error('Error de ruta:', error)
  }, [error])
  return <PantallaError />
}
