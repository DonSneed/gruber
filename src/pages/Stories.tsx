import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Story, TaskStatus } from '../lib/types'

type TaskSummary = { id: string; story_id: string | null; status: TaskStatus }

export function Stories() {
  const { profile } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadStories()
  }, [])

  async function loadStories() {
    setLoading(true)
    const [storiesRes, tasksRes] = await Promise.all([
      supabase.from('stories').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('id, story_id, status'),
    ])
    if (storiesRes.data) setStories(storiesRes.data)
    if (tasksRes.data) setTasks(tasksRes.data)
    setLoading(false)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !profile) return

    setCreating(true)
    const { error } = await supabase.from('stories').insert({
      family_id: profile.family_id,
      title: newTitle.trim(),
      created_by: profile.id,
    })
    if (!error) {
      setNewTitle('')
      await loadStories()
    }
    setCreating(false)
  }

  function progressFor(storyId: string) {
    const storyTasks = tasks.filter((t) => t.story_id === storyId)
    const done = storyTasks.filter((t) => t.status === 'done').length
    return { total: storyTasks.length, done }
  }

  async function deleteStory(storyId: string) {
    if (!confirm('Delete this story and all its tasks?')) return
    await supabase.from('stories').delete().eq('id', storyId)
    setStories((prev) => prev.filter((s) => s.id !== storyId))
  }

  const active = stories.filter((s) => s.status === 'active')
  const done = stories.filter((s) => s.status === 'done')

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Stories</h1>

        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="New story title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded border border-stone/30 bg-cream px-3 py-2 text-ink focus:border-forest focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="rounded bg-cream px-4 py-2 text-sm font-medium text-ink hover:bg-stone/20 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-on-page/60">Loading...</p>
        ) : (
          <div className="space-y-6 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            <StoryColumn title="Active" stories={active} progressFor={progressFor} onDelete={deleteStory} />
            <StoryColumn title="Done" stories={done} progressFor={progressFor} onDelete={deleteStory} />
          </div>
        )}
      </div>
    </div>
  )
}

function StoryColumn({
  title,
  stories,
  progressFor,
  onDelete,
}: {
  title: string
  stories: Story[]
  progressFor: (storyId: string) => { total: number; done: number }
  onDelete: (storyId: string) => void
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone">{title}</h2>
      {stories.length === 0 && <p className="text-sm text-stone">No stories yet.</p>}
      {stories.map((story) => {
        const { total, done } = progressFor(story.id)
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        return (
          <Link
            key={story.id}
            to={`/stories/${story.id}`}
            className="relative block rounded-lg bg-cream p-4 text-ink shadow hover:shadow-md"
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete(story.id)
              }}
              className="absolute right-3 top-3 text-stone hover:text-red-600"
              title="Delete story"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <h3 className="pr-4 font-medium">{story.title}</h3>
            {total > 0 && (
              <>
                <div className="mt-2 h-2 w-full rounded-full bg-stone/20">
                  <div
                    className="h-2 rounded-full bg-forest"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-stone">
                  {done} of {total} tasks
                </p>
              </>
            )}
          </Link>
        )
      })}
    </div>
  )
}