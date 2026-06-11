import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile, ProfileRole } from '../lib/types'

export function Today() {
  const { profile } = useAuth()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const [members, setMembers] = useState<Profile[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<ProfileRole>('child')
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setMembers(data)
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

  async function handleAddMember(e: FormEvent) {
    e.preventDefault()
    if (!newMemberName.trim() || !profile) return

    setAddingMember(true)
    setMemberError(null)
    const { error } = await supabase.from('profiles').insert({
      family_id: profile.family_id,
      display_name: newMemberName.trim(),
      role: newMemberRole,
    })
    if (error) {
      setMemberError(error.message)
    } else {
      setNewMemberName('')
      setNewMemberRole('child')
      await loadMembers()
    }
    setAddingMember(false)
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Hi, {profile?.display_name}</h1>
        <p className="text-sm text-gray-600">
          The Today timeline (events + scheduled tasks) is coming soon.
        </p>

        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Household members</h2>
          <ul className="space-y-1 text-sm">
            {members.map((member) => (
              <li key={member.id} className="flex justify-between">
                <span>{member.display_name}</span>
                <span className="text-gray-400">{member.role}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as ProfileRole)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="child">Child</option>
              <option value="adult">Adult</option>
            </select>
            <button
              type="submit"
              disabled={addingMember || !newMemberName.trim()}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {memberError && <p className="mt-2 text-sm text-red-600">{memberError}</p>}
          <p className="mt-2 text-xs text-gray-400">
            Use this for family members without their own login (kids, etc). For adults who'll
            log in themselves, send them an invite code instead.
          </p>
        </div>

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