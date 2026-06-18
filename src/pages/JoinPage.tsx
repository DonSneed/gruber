import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function JoinPage() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  if (session) return <Navigate to="/" replace />
  if (!code) return <Navigate to="/login" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    localStorage.setItem('pending-invite-code', code)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })

    if (error) {
      localStorage.removeItem('pending-invite-code')
      setError(error.message)
    } else if (!data.session) {
      setCheckEmail(true)
    }
    setSubmitting(false)
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest px-4">
        <div className="w-full max-w-sm rounded-lg bg-cream p-6 text-center text-ink shadow">
          <p className="mb-2 text-3xl">✉️</p>
          <h1 className="mb-2 text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-stone">
            We sent a confirmation link to <strong>{email}</strong>. Click it and you're all set!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest px-4">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center text-4xl">🎉</p>
        <h1 className="mb-2 text-center text-2xl font-semibold text-cream">You're invited!</h1>
        <p className="mb-6 text-center text-sm text-cream/70">
          Create your account to get started.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-cream p-6 text-ink shadow">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-stone/30 px-3 py-2 focus:border-forest focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-stone/30 px-3 py-2 focus:border-forest focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-forest py-2 font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
