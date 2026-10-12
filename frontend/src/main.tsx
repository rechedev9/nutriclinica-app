import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/api/queryClient'
import { router } from '@/router'
import '@/lib/api/sesion'
import { ToasterTema } from '@/components/ui/ToasterTema'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConexionGate } from '@/features/arranque/ConexionGate'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('No se encontró el elemento #root')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConexionGate>
          <RouterProvider router={router} />
        </ConexionGate>
        <ToasterTema />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
