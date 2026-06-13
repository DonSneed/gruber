import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PhotoStrip } from '../components/PhotoStrip'
import { NoteList } from '../components/NoteList'
import { dateString, toTimeInput } from '../lib/date'
import type { Event, EventVisibility, Profile } from '../lib/types'

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<EventVisibility>('family')

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(eventId: string) {
    setLoading(true)
    const [eventRes, membersRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setEvent(eventRes.data)
    setMembers(membersRes.data ?? [])
    if (eventRes.data) {
      const start = new Date(eventRes.data.start)
      const end = new Date(eventRes.data.end)
      setTitle(eventRes.data.title)
      setDate(dateString(start))
      setStartTime(toTimeInput(start))
      setEndTime(toTimeInput(end))
      setOwnerId(eventRes.data.owner_id)
      setVisibility(eventRes.data.visibility)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!event || !title.trim() || !date || !startTime || !endTime) return
    setSaving(true)
    const update = {
      title: title.trim(),
      start: new Date(`${date}T${startTime}`).toISOString(),
      end: new Date(`${date}T${endTime}`).toISOString(),
      owner_id: ownerId,
      visibility,
    }
    await supabase.from('events').update(update).eq('id', event.id)
    setEvent({ ...event, ...update })
    setSaving(false)
  }

  async function deleteEvent() {
    if (!event) return
    if (!confirm('Delete this event?')) return
    await supabase.from('events').delete().eq('id', event.id)
    navigate('/')
  }

  if (loading) {
    return <div className="px-4 py-8 text-sm text-on-page/60">Loading...</div>
  }
  if (!event) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-on-page/80 hover:text-on-page hover:underline"
        >
          &larr; Back
        </button>

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <button
            onClick={deleteEvent}
            className="shrink-0 rounded border border-on-page/30 p-1.5 text-on-page/80 hover:border-red-600 hover:bg-red-600 hover:text-white"
            title="Delete event"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 rounded-lg bg-cream p-4 text-ink shadow">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <span className="text-sm text-stone">to</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-stone">Owner</p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setOwnerId(null)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  ownerId === null ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                }`}
              >
                Shared
              </button>
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setOwnerId(member.id)}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    ownerId === member.id ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                  }`}
                >
                  {member.display_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-stone">Visibility</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setVisibility('family')}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  visibility === 'family' ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                }`}
              >
                Family
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  visibility === 'private' ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Photos</h2>
          {profile && <PhotoStrip familyId={profile.family_id} profileId={profile.id} eventId={event.id} />}
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Notes</h2>
          {profile && (
            <NoteList familyId={profile.family_id} profileId={profile.id} eventId={event.id} members={members} />
          )}
        </div>
      </div>
    </div>
  )
}
