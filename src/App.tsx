import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './components/AppLayout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Onboarding } from './pages/Onboarding'
import { Today } from './pages/Today'
import { Stories } from './pages/Stories'
import { StoryDetail } from './pages/StoryDetail'
import { TaskDetail } from './pages/TaskDetail'
import { EventDetail } from './pages/EventDetail'
import { CalendarPage } from './pages/CalendarPage'
import { Settings } from './pages/Settings'
import { SettingsMembers } from './pages/SettingsMembers'
import { SettingsTheme } from './pages/SettingsTheme'
import { SettingsFlags } from './pages/SettingsFlags'

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-on-page/60">
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Today />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/stories/:id" element={<StoryDetail />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/members" element={<SettingsMembers />} />
        <Route path="/settings/theme" element={<SettingsTheme />} />
        <Route path="/settings/flags" element={<SettingsFlags />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App