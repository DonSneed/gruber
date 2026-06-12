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
import { CalendarPage } from './pages/CalendarPage'
import { Settings } from './pages/Settings'

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
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<Settings />} />
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