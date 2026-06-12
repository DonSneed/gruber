import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile, ProfileRole } from '../lib/types'

export function Settings() {
  const { profile } = useAuth()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const [members, setMembers] = useState<Profile[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<ProfileRole>('child')
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  const [profileInviteCodes, setProfileInviteCodes] = useState<Record<string, string>>({})
  const [profileInviteErrors, setProfileInviteErrors] = useState<Record<string, string>>({})
  const [generatingProfileInvite, setGeneratingProfileInvite] = useState<string | null>(null)

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

  async function handleGenerateProfileInvite(profileId: string) {
    setProfileInviteErrors((prev) => ({ ...prev, [profileId]: '' }))
    setGeneratingProfileInvite(profileId)
    const { data, error } = await supabase.rpc('create_profile_invite', { target_profile_id: profileId })
    if (error) {
      setProfileInviteErrors((prev) => ({ ...prev, [profileId]: error.message }))
    } else {
      setProfileInviteCodes((prev) => ({ ...prev, [profileId]: data }))
    }
    setGeneratingProfileInvite(null)
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
        <Link to="/" className="text-sm text-cream/80 hover:text-cream hover:underline">
          &larr; Today
        </Link>

        <h1 className="text-2xl font-semibold">Household settings</h1>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Household members</h2>
          <ul className="space-y-2 text-sm">
            {members.map((member) => (
              <li key={member.id}>
                <div className="flex items-center justify-between">
                  <span>{member.display_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-stone">{member.role}</span>
                    {!member.auth_user_id && (
                      <button
                        onClick={() => handleGenerateProfileInvite(member.id)}
                        disabled={generatingProfileInvite === member.id}
                        className="rounded border border-stone/30 px-2 py-0.5 text-xs text-stone hover:bg-stone/10 disabled:opacity-50"
                      >
                        {generatingProfileInvite === member.id ? 'Generating...' : 'Get login code'}
                      </button>
                    )}
                  </div>
                </div>
                {profileInviteCodes[member.id] && (
                  <p className="mt-1 font-mono text-xs">
                    Code: <span className="font-semibold">{profileInviteCodes[member.id]}</span>{' '}
                    <span className="text-stone">
                      (valid 7 days &mdash; signs in as {member.display_name})
                    </span>
                  </p>
                )}
                {profileInviteErrors[member.id] && (
                  <p className="mt-1 text-xs text-red-600">{profileInviteErrors[member.id]}</p>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as ProfileRole)}
              className="rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
            >
              <option value="child">Child</option>
              <option value="adult">Adult</option>
            </select>
            <button
              type="submit"
              disabled={addingMember || !newMemberName.trim()}
              className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {memberError && <p className="mt-2 text-sm text-red-600">{memberError}</p>}
          <p className="mt-2 text-xs text-stone">
            Use this for family members without their own login (kids, etc). For adults who'll
            log in themselves, send them an invite code instead.
          </p>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Invite someone to your household</h2>
          <button
            onClick={handleGenerateInvite}
            disabled={generating}
            className="rounded bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate invite code'}
          </button>
          {inviteCode && (
            <p className="mt-2 font-mono text-sm">
              Code: <span className="font-semibold">{inviteCode}</span>{' '}
              <span className="text-stone">(valid 7 days, single use)</span>
            </p>
          )}
          {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-cream/60 hover:text-cream hover:underline"
        >
          Log out
        </button>
      </div>
    </div>
  )
}