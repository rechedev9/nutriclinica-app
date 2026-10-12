import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from './useAuth'

// Protege rutas solo para administradores: con otro rol vuelve a Pacientes.
export function RequireAdmin() {
  const { data: me } = useMe()
  if (me?.rol !== 'admin') return <Navigate to="/pacientes" replace />
  return <Outlet />
}
