import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { PacientesPage } from '@/features/pacientes/PacientesPage'
import { WelcomeEmpty } from '@/features/pacientes/WelcomeEmpty'
import { PacienteDetail } from '@/features/pacientes/PacienteDetail'
import { FichaTab } from '@/features/pacientes/tabs/FichaTab'
import { RevisionesTab } from '@/features/pacientes/tabs/RevisionesTab'
import { FotosTab } from '@/features/pacientes/tabs/FotosTab'

// lazyNamed adapta un export con nombre al default que espera React.lazy.
function lazyNamed<K extends string>(
  loader: () => Promise<Record<K, React.ComponentType>>,
  name: K,
) {
  return lazy(() => loader().then((m) => ({ default: m[name] })))
}

// Rutas con carga diferida: el módulo de Análisis arrastra Chart.js (~200 KB) y
// el módulo de Stock y la gestión de Usuarios no se necesitan en el arranque.
const AnalisisTab = lazyNamed(() => import('@/features/pacientes/tabs/analisis/AnalisisTab'), 'AnalisisTab')
const StockPage = lazyNamed(() => import('@/features/stock/StockPage'), 'StockPage')
const AlmacenTab = lazyNamed(() => import('@/features/stock/tabs/AlmacenTab'), 'AlmacenTab')
const ComprasTab = lazyNamed(() => import('@/features/stock/tabs/ComprasTab'), 'ComprasTab')
const VentasTab = lazyNamed(() => import('@/features/stock/tabs/VentasTab'), 'VentasTab')
const ProveedoresTab = lazyNamed(() => import('@/features/stock/tabs/ProveedoresTab'), 'ProveedoresTab')
const UsuariosPage = lazyNamed(() => import('@/features/usuarios/UsuariosPage'), 'UsuariosPage')

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/pacientes" replace /> },
          {
            path: 'pacientes',
            element: <PacientesPage />,
            children: [
              { index: true, element: <WelcomeEmpty /> },
              {
                path: ':id',
                element: <PacienteDetail />,
                children: [
                  { index: true, element: <Navigate to="ficha" replace /> },
                  { path: 'ficha', element: <FichaTab /> },
                  { path: 'revisiones', element: <RevisionesTab /> },
                  { path: 'fotos', element: <FotosTab /> },
                  { path: 'analisis', element: <AnalisisTab /> },
                ],
              },
            ],
          },
          {
            path: 'stock',
            element: <StockPage />,
            children: [
              { index: true, element: <Navigate to="almacen" replace /> },
              { path: 'almacen', element: <AlmacenTab /> },
              { path: 'compras', element: <ComprasTab /> },
              { path: 'ventas', element: <VentasTab /> },
              { path: 'proveedores', element: <ProveedoresTab /> },
            ],
          },
          { path: 'usuarios', element: <UsuariosPage /> },
        ],
      },
    ],
  },
])
