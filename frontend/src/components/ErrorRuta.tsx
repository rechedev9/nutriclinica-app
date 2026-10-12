import { useEffect } from 'react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { PantallaError } from '@/components/ErrorBoundary'

// errorComponent del router: reutiliza la pantalla de ErrorBoundary, sin traza.
export function ErrorRuta({ error }: ErrorComponentProps) {
  useEffect(() => {
    console.error('Error de ruta:', error)
  }, [error])
  return <PantallaError />
}
