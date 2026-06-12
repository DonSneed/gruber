import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { FLAG_COLORS } from '../lib/flags'
import type { Flag } from '../lib/types'

export function SettingsFlags() {
  const { profile } = useAuth()
  const [flags, setFlags] = useState<Flag[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(FLAG_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFlags()
  }, [])

  async function loadFlags() {
    if (!profile) return
    const { data } = await supabase.from('flags').select('*').eq('profile_id', profile.id).order('created_at')
    if (data) setFlags(data)
  }

  async function handleAddFlag(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !profile) return

    setSaving(true)
    setError(null)
    const { error } = await supabase.from('flags').insert({
      family_id: profile.family_id,
      profile_id: profile.id,
      name: name.trim(),
      color,
    })
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setColor(FLAG_COLORS[0])
      await loadFlags()
    }
    setSaving(false)
  }

  async function deleteFlag(id: string) {
    await supabase.from('flags').delete().eq('id', id)
    setFlags((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <Link to="/settings" className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Settings
        </Link>

        <h1 className="text-2xl font-semibold">Flags</h1>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <ul className="space-y-2 text-sm">
            {flags.map((flag) => (
              <li key={flag.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: flag.color }} />
                  {flag.name}
                </span>
                <button
                  onClick={() => deleteFlag(flag.id)}
                  className="shrink-0 text-stone hover:text-red-600"
                  title="Delete flag"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {flags.length === 0 && <p className="text-sm text-stone">No flags yet.</p>}
          </ul>

          <form onSubmit={handleAddFlag} className="mt-3 space-y-2 border-t pt-3">
            <input
              type="text"
              placeholder="e.g. Work"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {FLAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-forest' : 'border-stone/20'}`}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
            >
              Add
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
          <p className="mt-2 text-xs text-stone">
            Create personal categories and attach them to tasks. Flags you create are visible to
            everyone in your household, and shared tasks can carry flags from multiple people.
          </p>
        </div>
      </div>
    </div>
  )
}
