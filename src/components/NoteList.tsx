import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { addNote, deleteNote, listNotes } from '../lib/notes'
import type { Note } from '../lib/notes'
import { formatDateTime } from '../lib/date'
import type { Profile } from '../lib/types'

interface NoteListProps {
  familyId: string
  profileId: string
  storyId?: string
  taskId?: string
  eventId?: string
  members?: Profile[]
}

export function NoteList({ familyId, profileId, storyId, taskId, eventId, members = [] }: NoteListProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [storyId, taskId, eventId])

  async function load() {
    const data = await listNotes({ storyId, taskId, eventId })
    setNotes(data)
  }

  function authorName(profileId: string | null) {
    return members.find((m) => m.id === profileId)?.display_name ?? 'Someone'
  }

  async function handleAdd() {
    if (!content.trim()) return
    setSaving(true)
    await addNote(content.trim(), familyId, profileId, { storyId, taskId, eventId })
    setContent('')
    await load()
    setSaving(false)
  }

  async function handleDelete(note: Note) {
    if (!confirm('Delete this note?')) return
    await deleteNote(note.id)
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
  }

  return (
    <div className="space-y-2">
      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="group rounded border border-stone/20 p-2 text-sm">
              <p className="whitespace-pre-wrap">{note.content}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-stone">
                <span>
                  {authorName(note.created_by)} &middot; {formatDateTime(note.created_at)}
                </span>
                <button onClick={() => handleDelete(note)} className="hover:text-red-600" title="Delete note">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !content.trim()}
          className="self-end rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
