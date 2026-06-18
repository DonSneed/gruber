import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile } from '../lib/types'

const ENRICO_PROFILE = 'Enrico'

interface Suggestion {
  id: string
  family_id: string
  created_by: string | null
  title: string
  status: 'open' | 'done'
  created_at: string
}

export function BonusSuggestions() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const isEnrico = profile?.display_name === ENRICO_PROFILE

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [sugRes, memRes] = await Promise.all([
      supabase.from('suggestions').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setSuggestions(sugRes.data ?? [])
    setMembers(memRes.data ?? [])
    setLoading(false)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !profile) return
    setAdding(true)
    await supabase.from('suggestions').insert({
      family_id: profile.family_id,
      created_by: profile.id,
      title: newTitle.trim(),
    })
    setNewTitle('')
    await load()
    setAdding(false)
  }

  async function toggleDone(s: Suggestion) {
    if (!isEnrico) return
    const status = s.status === 'done' ? 'open' : 'done'
    await supabase.from('suggestions').update({ status }).eq('id', s.id)
    setSuggestions((prev) => prev.map((x) => x.id === s.id ? { ...x, status } : x))
  }

  async function deleteSuggestion(id: string) {
    await supabase.from('suggestions').delete().eq('id', id)
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  function creatorName(id: string | null) {
    if (!id) return null
    return members.find((m) => m.id === id)?.display_name ?? null
  }

  const open = suggestions.filter((s) => s.status === 'open')
  const done = suggestions.filter((s) => s.status === 'done')

  return (
    <div className="px-4 pb-8 pt-14">
      <div className="mx-auto max-w-sm space-y-4">
        <button onClick={() => navigate(-1)} className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Back
        </button>

        <h1 className="text-2xl font-semibold">Suggestions 💡</h1>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="I wish the app could…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-lg border border-on-page/20 bg-cream px-3 py-2 text-sm text-ink focus:border-forest focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="flex items-center gap-1 rounded-lg bg-forest px-3 py-2 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-on-page/60">Loading…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-on-page/40">No suggestions yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {open.length > 0 && (
              <ul className="space-y-2">
                {open.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-lg bg-cream px-4 py-3 text-ink shadow">
                    {isEnrico && (
                      <button
                        onClick={() => toggleDone(s)}
                        title="Mark as done"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-stone/40 hover:border-forest"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{s.title}</p>
                      {creatorName(s.created_by) && (
                        <p className="mt-0.5 text-xs text-stone">from {creatorName(s.created_by)}</p>
                      )}
                    </div>
                    {(isEnrico || s.created_by === profile?.id) && (
                      <button
                        onClick={() => deleteSuggestion(s.id)}
                        className="mt-0.5 shrink-0 text-stone hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {done.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-stone/60 uppercase tracking-wide">Done</p>
                <ul className="space-y-2">
                  {done.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 rounded-lg bg-cream px-4 py-3 text-ink shadow opacity-60">
                      {isEnrico && (
                        <button
                          onClick={() => toggleDone(s)}
                          title="Mark as open"
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-forest bg-forest text-white"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm line-through">{s.title}</p>
                        {creatorName(s.created_by) && (
                          <p className="mt-0.5 text-xs text-stone">from {creatorName(s.created_by)}</p>
                        )}
                      </div>
                      {(isEnrico || s.created_by === profile?.id) && (
                        <button
                          onClick={() => deleteSuggestion(s.id)}
                          className="mt-0.5 shrink-0 text-stone hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
