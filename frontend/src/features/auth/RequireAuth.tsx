import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from './useAuth'
import { CenteredSpinner } from '@/components/ui/Spinner'

export function RequireAuth() {
  const { data, isLoading, isError } = useMe()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <CenteredSpinner />
      </div>
    )
  }
  if (isError || !data) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
