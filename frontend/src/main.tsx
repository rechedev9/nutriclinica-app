import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/api/queryClient'
import { router } from '@/router'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'
import '@/lib/chart/chartSetup'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
