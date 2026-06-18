import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BottomNav } from './BottomNav'
import { UrodWurmEgg } from './UrodWurmEgg'
import { useUrodWurmEgg } from '../hooks/useUrodWurmEgg'

export function AppLayout() {
  const { session, profile } = useAuth()
  const { show, dismiss } = useUrodWurmEgg(profile)

  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (!profile) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="min-h-screen bg-page">
      <Outlet />
      <BottomNav />
      {show && <UrodWurmEgg onDismiss={dismiss} />}
    </div>
  )
}
