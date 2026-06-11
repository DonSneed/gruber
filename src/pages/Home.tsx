import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function Home() {
  const { session, profile } = useAuth()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (!profile) {
    return <Navigate to="/onboarding" replace />
  }

  async function handleGenerateInvite() {
    setInviteError(null)
    setGenerating(true)
    const { data, error } = await supabase.rpc('create_invite')
    if (error) {
      setInviteError(error.message)
    } else {
      setInviteCode(data)
    }
    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Hi, {profile?.display_name}</h1>
        <p className="text-sm text-gray-600">
          You're set up. The Today / Stories / Calendar views are coming next.
        </p>

        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Invite someone to your household</h2>
          <button
            onClick={handleGenerateInvite}
            disabled={generating}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate invite code'}
          </button>
          {inviteCode && (
            <p className="mt-2 font-mono text-sm">
              Code: <span className="font-semibold">{inviteCode}</span>{' '}
              <span className="text-gray-500">(valid 7 days, single use)</span>
            </p>
          )}
          {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-500 hover:underline"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
