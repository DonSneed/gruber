import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Mode = 'create' | 'join'

export function Onboarding() {
  const { session, profile, refreshProfile } = useAuth()
  const [mode, setMode] = useState<Mode>('create')
  const [displayName, setDisplayName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (profile) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } =
      mode === 'create'
        ? await supabase.rpc('create_family', {
            family_name: familyName,
            display_name: displayName,
          })
        : await supabase.rpc('redeem_invite', {
            invite_code: inviteCode,
            display_name: displayName,
          })

    if (error) {
      setError(error.message)
    } else {
      await refreshProfile()
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">Welcome!</h1>

        <div className="mb-4 flex rounded-lg bg-stone/20 p-1">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'create' ? 'bg-cream text-ink shadow' : 'text-cream/60'
            }`}
          >
            Create a household
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'join' ? 'bg-cream text-ink shadow' : 'text-cream/60'
            }`}
          >
            Join with invite
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-cream p-6 text-ink shadow">
          <div>
            <label className="block text-sm font-medium text-ink">Your name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded border border-stone/30 px-3 py-2 focus:border-forest focus:outline-none"
            />
          </div>

          {mode === 'create' ? (
            <div>
              <label className="block text-sm font-medium text-ink">Household name</label>
              <input
                type="text"
                required
                placeholder="The Grubers"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="mt-1 w-full rounded border border-stone/30 px-3 py-2 focus:border-forest focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-ink">Invite code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="mt-1 w-full rounded border border-stone/30 px-3 py-2 font-mono focus:border-forest focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-forest py-2 font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            {submitting ? 'Saving...' : mode === 'create' ? 'Create household' : 'Join household'}
          </button>
        </form>
      </div>
    </div>
  )
}