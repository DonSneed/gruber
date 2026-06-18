import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Check, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { dateString } from '../lib/date'
import type { Movie, Profile } from '../lib/types'

type Tab = 'watchlist' | 'watched'

export function BonusMovies() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [movies, setMovies] = useState<Movie[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('watchlist')

  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSuggestedBy, setNewSuggestedBy] = useState('')
  const [newStatus, setNewStatus] = useState<'to_watch' | 'watched'>('to_watch')
  const [adding, setAdding] = useState(false)

  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('20:00')
  const [scheduling, setScheduling] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [moviesRes, membersRes] = await Promise.all([
      supabase.from('movies').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setMovies(moviesRes.data ?? [])
    setMembers(membersRes.data ?? [])
    setLoading(false)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !profile) return
    setAdding(true)
    await supabase.from('movies').insert({
      family_id: profile.family_id,
      title: newTitle.trim(),
      status: newStatus,
      suggested_by: newSuggestedBy || null,
    })
    setNewTitle('')
    setNewSuggestedBy('')
    setNewStatus('to_watch')
    setShowAdd(false)
    await load()
    setAdding(false)
  }

  async function toggleWatched(movie: Movie) {
    const status = movie.status === 'watched' ? 'to_watch' : 'watched'
    const watched_at = status === 'watched' ? dateString(new Date()) : null
    await supabase.from('movies').update({ status, watched_at }).eq('id', movie.id)
    setMovies((prev) => prev.map((m) => m.id === movie.id ? { ...m, status, watched_at } : m))
  }

  async function deleteMovie(id: string) {
    await supabase.from('movies').delete().eq('id', id)
    setMovies((prev) => prev.filter((m) => m.id !== id))
  }

  function openSchedule(movie: Movie) {
    setSchedulingId(schedulingId === movie.id ? null : movie.id)
    setSchedDate(dateString(new Date()))
    setSchedTime('20:00')
    setScheduledFor(null)
  }

  async function handleSchedule(movie: Movie) {
    if (!profile || !schedDate) return
    setScheduling(true)
    const start = new Date(`${schedDate}T${schedTime}`)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000) // +2h

    const { data: event } = await supabase
      .from('events')
      .insert({
        family_id: profile.family_id,
        title: `🎬 ${movie.title}`,
        start: start.toISOString(),
        end: end.toISOString(),
        visibility: 'family',
      })
      .select('id')
      .single()

    if (event) {
      const adults = members.filter((m) => m.role === 'adult')
      if (adults.length > 0) {
        await supabase
          .from('event_owners')
          .insert(adults.map((m) => ({ event_id: event.id, profile_id: m.id })))
      }
      setScheduledFor(movie.id)
      setSchedulingId(null)
    }
    setScheduling(false)
  }

  const watchlist = movies.filter((m) => m.status === 'to_watch')
  const watched = movies.filter((m) => m.status === 'watched')
  const displayed = tab === 'watchlist' ? watchlist : watched

  function suggestedByName(id: string | null) {
    if (!id) return null
    return members.find((m) => m.id === id)?.display_name ?? null
  }

  return (
    <div className="px-4 pb-8 pt-14">
      <div className="mx-auto max-w-sm space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-on-page/80 hover:text-on-page hover:underline"
        >
          &larr; Back
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Movies 🎬</h1>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              showAdd ? 'bg-forest text-white' : 'bg-on-page/10 text-on-page/70 hover:bg-on-page/20'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="rounded-lg bg-cream p-4 text-ink shadow space-y-3">
            <input
              type="text"
              placeholder="Movie title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={newSuggestedBy}
                onChange={(e) => setNewSuggestedBy(e.target.value)}
                className="flex-1 rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
              >
                <option value="">Who picked it?</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
              <div className="flex rounded border border-stone/30 overflow-hidden text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setNewStatus('to_watch')}
                  className={`px-2 py-1.5 ${newStatus === 'to_watch' ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10'}`}
                >
                  To watch
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus('watched')}
                  className={`px-2 py-1.5 ${newStatus === 'watched' ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10'}`}
                >
                  Watched
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-stone hover:text-ink">
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !newTitle.trim()}
                className="rounded bg-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-ink disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="flex rounded-lg bg-on-page/5 p-1 gap-1">
          <button
            onClick={() => setTab('watchlist')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === 'watchlist' ? 'bg-page text-on-page shadow-sm' : 'text-on-page/50 hover:text-on-page/70'
            }`}
          >
            Watch together
            {watchlist.length > 0 && (
              <span className="ml-1.5 rounded-full bg-forest/20 px-1.5 py-0.5 text-xs text-forest">
                {watchlist.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('watched')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === 'watched' ? 'bg-page text-on-page shadow-sm' : 'text-on-page/50 hover:text-on-page/70'
            }`}
          >
            Watched
            {watched.length > 0 && (
              <span className="ml-1.5 rounded-full bg-stone/20 px-1.5 py-0.5 text-xs text-stone">
                {watched.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-on-page/60">Loading...</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-on-page/40">
            {tab === 'watchlist' ? 'Nothing on the list yet.' : 'No watched movies yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {displayed.map((movie) => (
              <li key={movie.id} className="rounded-lg bg-cream text-ink shadow">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleWatched(movie)}
                    title={movie.status === 'watched' ? 'Mark as unwatched' : 'Mark as watched'}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      movie.status === 'watched'
                        ? 'border-forest bg-forest text-white'
                        : 'border-stone/40 hover:border-forest'
                    }`}
                  >
                    {movie.status === 'watched' && <Check className="h-3 w-3" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${movie.status === 'watched' ? 'text-stone line-through' : ''}`}>
                      {movie.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone">
                      {suggestedByName(movie.suggested_by) && (
                        <span>picked by {suggestedByName(movie.suggested_by)}</span>
                      )}
                      {movie.watched_at && (
                        <span>watched {new Date(movie.watched_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
                      )}
                      {scheduledFor === movie.id && (
                        <span className="text-forest font-medium">event added ✓</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {movie.status === 'to_watch' && (
                      <button
                        onClick={() => openSchedule(movie)}
                        title="Plan movie date"
                        className={`rounded p-1.5 transition-colors ${
                          schedulingId === movie.id
                            ? 'bg-forest text-white'
                            : 'text-stone hover:bg-stone/10 hover:text-forest'
                        }`}
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMovie(movie.id)}
                      className="rounded p-1.5 text-stone hover:bg-red-50 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {schedulingId === movie.id && (
                  <div className="border-t border-stone/10 px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-stone">Plan movie date</p>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={schedDate}
                        onChange={(e) => setSchedDate(e.target.value)}
                        className="flex-1 rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
                      />
                      <input
                        type="time"
                        value={schedTime}
                        onChange={(e) => setSchedTime(e.target.value)}
                        className="rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-stone/70">
                        Adds a 2h event for all household members
                      </p>
                      <button
                        onClick={() => handleSchedule(movie)}
                        disabled={scheduling || !schedDate}
                        className="rounded bg-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-ink disabled:opacity-50"
                      >
                        {scheduling ? 'Adding…' : 'Add to calendar'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
