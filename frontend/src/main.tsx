import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/lib/api/queryClient'
import { router } from '@/router'
import '@/lib/api/sesion'
import { ToasterTema } from '@/components/ui/ToasterTema'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CifradoGate } from '@/features/cifrado/CifradoGate'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('No se encontró el elemento #root')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <CifradoGate>
            <RouterProvider router={router} />
          </CifradoGate>
          <ToasterTema />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
