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
import { AnalisisTab } from '@/features/pacientes/tabs/analisis/AnalisisTab'
import { StockPage } from '@/features/stock/StockPage'
import { AlmacenTab } from '@/features/stock/tabs/AlmacenTab'
import { ComprasTab } from '@/features/stock/tabs/ComprasTab'
import { VentasTab } from '@/features/stock/tabs/VentasTab'
import { ProveedoresTab } from '@/features/stock/tabs/ProveedoresTab'
import { UsuariosPage } from '@/features/usuarios/UsuariosPage'

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
