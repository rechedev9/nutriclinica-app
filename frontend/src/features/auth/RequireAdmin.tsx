import { Navigate, Outlet } from '@tanstack/react-router'
import { useMe } from './useAuth'

// Protege rutas solo para administradores: con otro rol vuelve a Pacientes.
export function RequireAdmin() {
  const { data: me } = useMe()
  if (me?.rol !== 'admin') return <Navigate to="/pacientes" replace />
  return <Outlet />
}
