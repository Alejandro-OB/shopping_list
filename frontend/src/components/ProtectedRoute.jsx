import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  if (user && !user.is_verified) {
    return <Navigate to="/pending-verification" replace />
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return user ? <Navigate to="/" replace /> : <Outlet />
}
