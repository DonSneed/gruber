import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { colorForProfile } from '../lib/colors'
import { addDays, dateString, endOfDay, formatDayLabel, formatTime, startOfDay, startOfWeek } from '../lib/date'
import type { Event, Profile, Task, TaskAssignee } from '../lib/types'

type TimelineItem =
  | { kind: 'event'; id: string; title: string; start: string; ownerId: string | null }
  | {
      kind: 'task'
      id: string
      title: string
      start: string
      assigneeIds: string[]
      done: boolean
      storyId: string | null
    }

export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [members, setMembers] = useState<Profile[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [weekStart])

  async function load() {
    setLoading(true)
    const rangeStart = startOfDay(weekStart).toISOString()
    const rangeEnd = endOfDay(addDays(weekStart, 6)).toISOString()

    const [membersRes, eventsRes, scheduledRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('events').select('*').gte('start', rangeStart).lte('start', rangeEnd).order('start'),
      supabase
        .from('tasks')
        .select('*')
        .gte('scheduled_start', rangeStart)
        .lte('scheduled_start', rangeEnd)
        .order('scheduled_start'),
    ])

    const loadedScheduled = scheduledRes.data ?? []
    setMembers(membersRes.data ?? [])
    setEvents(eventsRes.data ?? [])
    setScheduledTasks(loadedScheduled)

    if (loadedScheduled.length > 0) {
      const { data } = await supabase
        .from('task_assignees')
        .select('*')
        .in('task_id', loadedScheduled.map((t) => t.id))
      setAssignees(data ?? [])
    } else {
      setAssignees([])
    }
    setLoading(false)
  }

  const memberIds = members.map((m) => m.id)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayStr = dateString(new Date())

  const itemsByDay = new Map<string, TimelineItem[]>()
  for (const day of days) itemsByDay.set(dateString(day), [])

  for (const e of events) {
    const key = dateString(new Date(e.start))
    itemsByDay.get(key)?.push({ kind: 'event', id: e.id, title: e.title, start: e.start, ownerId: e.owner_id })
  }
  for (const t of scheduledTasks) {
    const key = dateString(new Date(t.scheduled_start as string))
    itemsByDay.get(key)?.push({
      kind: 'task',
      id: t.id,
      title: t.title,
      start: t.scheduled_start as string,
      assigneeIds: assignees.filter((a) => a.task_id === t.id).map((a) => a.profile_id),
      done: t.status === 'done',
      storyId: t.story_id,
    })
  }
  for (const items of itemsByDay.values()) {
    items.sort((a, b) => a.start.localeCompare(b.start))
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="text-sm text-cream/80 hover:text-cream hover:underline"
          >
            Today
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="rounded border border-cream/30 px-3 py-1 text-sm text-cream/80 hover:bg-cream/10"
          >
            &larr; Prev
          </button>
          <span className="text-sm text-cream/60">
            {formatDayLabel(weekStart)} &ndash; {formatDayLabel(addDays(weekStart, 6))}
          </span>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="rounded border border-cream/30 px-3 py-1 text-sm text-cream/80 hover:bg-cream/10"
          >
            Next &rarr;
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-cream/60">Loading...</p>
        ) : (
          days.map((day) => {
            const key = dateString(day)
            const items = itemsByDay.get(key) ?? []
            return (
              <div key={key} className="rounded-lg bg-cream p-4 text-ink shadow">
                <h2 className={`mb-2 font-medium ${key === todayStr ? 'text-forest' : ''}`}>
                  {formatDayLabel(day)}
                </h2>
                {items.length === 0 && <p className="text-sm text-stone">Nothing scheduled.</p>}
                <ul className="space-y-2">
                  {items.map((item) => {
                    const color =
                      item.kind === 'event'
                        ? colorForProfile(item.ownerId, memberIds)
                        : colorForProfile(null, memberIds)
                    return (
                      <li key={`${item.kind}-${item.id}`} className="flex items-start gap-3">
                        <span className="w-12 shrink-0 text-xs text-stone">{formatTime(item.start)}</span>
                        {item.kind === 'event' ? (
                          <span className={`flex-1 rounded px-2 py-1 text-sm ${color.bg} ${color.text}`}>
                            {item.title}
                          </span>
                        ) : (
                          <span className={`flex-1 text-sm ${item.done ? 'text-stone line-through' : ''}`}>
                            {item.storyId ? (
                              <Link to={`/stories/${item.storyId}`} className="hover:underline">
                                {item.title}
                              </Link>
                            ) : (
                              item.title
                            )}
                            <span className="ml-2 inline-flex gap-1">
                              {item.assigneeIds.map((id) => (
                                <span
                                  key={id}
                                  className={`inline-block h-2 w-2 rounded-full ${colorForProfile(id, memberIds).dot}`}
                                />
                              ))}
                            </span>
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}