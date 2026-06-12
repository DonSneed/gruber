import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { applyTheme, THEME_PRESETS } from '../lib/themes'
import type { Profile, ProfileRole, RecurringTask, Story } from '../lib/types'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function Settings() {
  const { profile, refreshProfile } = useAuth()
  const [savingTheme, setSavingTheme] = useState(false)
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

  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [rtTitle, setRtTitle] = useState('')
  const [rtDays, setRtDays] = useState<number[]>([])
  const [rtStoryId, setRtStoryId] = useState('')
  const [rtShowTime, setRtShowTime] = useState(false)
  const [rtStart, setRtStart] = useState('09:00')
  const [rtEnd, setRtEnd] = useState('')
  const [savingRecurring, setSavingRecurring] = useState(false)
  const [recurringError, setRecurringError] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
    loadRecurringTasks()
    loadStories()
  }, [])

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setMembers(data)
  }

  async function loadRecurringTasks() {
    const { data } = await supabase.from('recurring_tasks').select('*').order('created_at')
    if (data) setRecurringTasks(data)
  }

  async function loadStories() {
    const { data } = await supabase.from('stories').select('*').eq('status', 'active').order('created_at')
    if (data) setStories(data)
  }

  function toggleRtDay(day: number) {
    setRtDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  async function handleAddRecurringTask(e: FormEvent) {
    e.preventDefault()
    if (!rtTitle.trim() || rtDays.length === 0 || !profile) return

    setSavingRecurring(true)
    setRecurringError(null)
    const { error } = await supabase.from('recurring_tasks').insert({
      family_id: profile.family_id,
      title: rtTitle.trim(),
      days_of_week: rtDays,
      story_id: rtStoryId || null,
      scheduled_start_time: rtShowTime && rtStart ? rtStart : null,
      scheduled_end_time: rtShowTime && rtEnd ? rtEnd : null,
      created_by: profile.id,
    })
    if (error) {
      setRecurringError(error.message)
    } else {
      setRtTitle('')
      setRtDays([])
      setRtStoryId('')
      setRtShowTime(false)
      setRtStart('09:00')
      setRtEnd('')
      await loadRecurringTasks()
    }
    setSavingRecurring(false)
  }

  async function deleteRecurringTask(id: string) {
    await supabase.from('recurring_tasks').delete().eq('id', id)
    setRecurringTasks((prev) => prev.filter((rt) => rt.id !== id))
  }

  function daysSummary(days: number[]) {
    return days
      .slice()
      .sort()
      .map((d) => DAY_LABELS[d])
      .join(', ')
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

  async function handleSelectTheme(bg: string) {
    if (!profile || savingTheme) return
    setSavingTheme(true)
    applyTheme(bg)
    const { error } = await supabase.from('profiles').update({ theme_color: bg }).eq('id', profile.id)
    if (!error) await refreshProfile()
    setSavingTheme(false)
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
        <Link to="/" className="text-sm text-on-page/80 hover:text-on-page hover:underline">
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
          <h2 className="mb-2 font-medium">Theme</h2>
          <div className="flex gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.bg}
                onClick={() => handleSelectTheme(preset.bg)}
                title={preset.label}
                style={{ backgroundColor: preset.bg }}
                className={`h-8 w-8 rounded-full border-2 ${
                  profile?.theme_color === preset.bg ? 'border-forest' : 'border-stone/20'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Recurring tasks</h2>
          <ul className="space-y-2 text-sm">
            {recurringTasks.map((rt) => (
              <li key={rt.id} className="flex items-center justify-between gap-2">
                <span>
                  {rt.title}
                  <span className="ml-2 text-xs text-stone">
                    {daysSummary(rt.days_of_week)}
                    {rt.scheduled_start_time ? ` · ${rt.scheduled_start_time.slice(0, 5)}` : ''}
                  </span>
                </span>
                <button
                  onClick={() => deleteRecurringTask(rt.id)}
                  className="shrink-0 text-xs text-stone hover:text-red-600"
                  title="Delete recurring task"
                >
                  &times;
                </button>
              </li>
            ))}
            {recurringTasks.length === 0 && <p className="text-sm text-stone">No recurring tasks yet.</p>}
          </ul>

          <form onSubmit={handleAddRecurringTask} className="mt-3 space-y-2 border-t pt-3">
            <input
              type="text"
              placeholder="e.g. Take out trash"
              value={rtTitle}
              onChange={(e) => setRtTitle(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <div className="flex gap-1">
              {DAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleRtDay(day)}
                  className={`h-7 w-7 rounded-full text-xs font-medium ${
                    rtDays.includes(day) ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {stories.length > 0 && (
                <select
                  value={rtStoryId}
                  onChange={(e) => setRtStoryId(e.target.value)}
                  className="flex-1 rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
                >
                  <option value="">No story</option>
                  {stories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                disabled={savingRecurring || !rtTitle.trim() || rtDays.length === 0}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {rtShowTime ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={rtStart}
                  onChange={(e) => setRtStart(e.target.value)}
                  className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                />
                <span className="text-xs text-stone">to</span>
                <input
                  type="time"
                  value={rtEnd}
                  onChange={(e) => setRtEnd(e.target.value)}
                  className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setRtShowTime(false)}
                  className="text-xs text-stone hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRtShowTime(true)}
                className="text-xs text-forest hover:underline"
              >
                + Add time
              </button>
            )}
            {recurringError && <p className="text-sm text-red-600">{recurringError}</p>}
          </form>
          <p className="mt-2 text-xs text-stone">
            Repeats on the selected days. Each day's task is added to "To do today" automatically.
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
          className="text-sm text-on-page/60 hover:text-on-page hover:underline"
        >
          Log out
        </button>
      </div>
    </div>
  )
}