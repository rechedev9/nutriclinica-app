import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from './useAuth'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { ApiError } from '@/lib/api/client'

export function RequireAuth() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMe()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <CenteredSpinner />
      </div>
    )
  }
  // Solo 401/403 significan "sin sesión"; red caída o 500 no deben mandar al login.
  if (isError && !(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
    return (
      <div className="flex h-full min-h-screen bg-app">
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} />
      </div>
    )
  }
  if (isError || !data) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
