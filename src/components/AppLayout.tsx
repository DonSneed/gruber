import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  const { session, profile } = useAuth()

  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (!profile) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Outlet />
      <BottomNav />
    </div>
  )
}