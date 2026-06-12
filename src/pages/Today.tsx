import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { colorForProfile } from '../lib/colors'
import { dateString, endOfDay, formatTime, startOfDay } from '../lib/date'
import { createRecurringTask, DAY_LABELS, materializeRecurringTasks } from '../lib/recurring'
import type { Event, Profile, Story, Task, TaskAssignee } from '../lib/types'

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

export function Today() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([])
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [loading, setLoading] = useState(true)

  const [eventTitle, setEventTitle] = useState('')
  const [eventStart, setEventStart] = useState('09:00')
  const [eventEnd, setEventEnd] = useState('10:00')
  const [addingEvent, setAddingEvent] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)

  const [newTask, setNewTask] = useState('')
  const [newTaskStoryId, setNewTaskStoryId] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStart, setNewTaskStart] = useState('09:00')
  const [newTaskEnd, setNewTaskEnd] = useState('')
  const [showRepeat, setShowRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const now = new Date()
    const todayStr = dateString(now)
    const dayStart = startOfDay(now).toISOString()
    const dayEnd = endOfDay(now).toISOString()

    await materializeRecurringTasks(todayStr, now.getDay())

    const [membersRes, storiesRes, eventsRes, scheduledRes, unscheduledRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('stories').select('*').eq('status', 'active').order('created_at'),
      supabase.from('events').select('*').gte('start', dayStart).lte('start', dayEnd).order('start'),
      supabase
        .from('tasks')
        .select('*')
        .gte('scheduled_start', dayStart)
        .lte('scheduled_start', dayEnd)
        .order('scheduled_start'),
      supabase.from('tasks').select('*').eq('due_date', todayStr).is('scheduled_start', null).order('created_at'),
    ])

    const loadedScheduled = scheduledRes.data ?? []
    const loadedUnscheduled = unscheduledRes.data ?? []
    setMembers(membersRes.data ?? [])
    setStories(storiesRes.data ?? [])
    setEvents(eventsRes.data ?? [])
    setScheduledTasks(loadedScheduled)
    setUnscheduledTasks(loadedUnscheduled)

    const allTaskIds = [...loadedScheduled, ...loadedUnscheduled].map((t) => t.id)
    if (allTaskIds.length > 0) {
      const { data } = await supabase.from('task_assignees').select('*').in('task_id', allTaskIds)
      setAssignees(data ?? [])
    } else {
      setAssignees([])
    }
    setLoading(false)
  }

  async function handleAddEvent(e: FormEvent) {
    e.preventDefault()
    if (!eventTitle.trim() || !profile) return

    setAddingEvent(true)
    setEventError(null)

    const [startH, startM] = eventStart.split(':').map(Number)
    const [endH, endM] = eventEnd.split(':').map(Number)
    const start = new Date()
    start.setHours(startH, startM, 0, 0)
    const end = new Date()
    end.setHours(endH, endM, 0, 0)

    const { error } = await supabase.from('events').insert({
      family_id: profile.family_id,
      title: eventTitle.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      owner_id: profile.id,
    })
    if (error) {
      setEventError(error.message)
    } else {
      setEventTitle('')
      await load()
    }
    setAddingEvent(false)
  }

  function toggleRepeatDay(day: number) {
    setRepeatDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  async function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!newTask.trim() || !profile) return

    setAddingTask(true)
    const now = new Date()
    const todayStr = dateString(now)
    const scheduleDate = showSchedule && newTaskDate ? newTaskDate : todayStr

    if (showRepeat && repeatDays.length > 0) {
      await createRecurringTask({
        family_id: profile.family_id,
        title: newTask.trim(),
        days_of_week: repeatDays,
        story_id: newTaskStoryId || null,
        scheduled_start_time: showSchedule && newTaskStart ? newTaskStart : null,
        scheduled_end_time: showSchedule && newTaskStart && newTaskEnd ? newTaskEnd : null,
        created_by: profile.id,
      })
      await materializeRecurringTasks(todayStr, now.getDay())
      setNewTask('')
      setNewTaskStoryId('')
      setShowSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
      setShowRepeat(false)
      setRepeatDays([])
      await load()
      setAddingTask(false)
      return
    }

    const insert: {
      family_id: string
      title: string
      due_date: string
      story_id: string | null
      scheduled_start?: string
      scheduled_end?: string
    } = {
      family_id: profile.family_id,
      title: newTask.trim(),
      due_date: scheduleDate,
      story_id: newTaskStoryId || null,
    }
    if (showSchedule && newTaskStart) {
      insert.scheduled_start = new Date(`${scheduleDate}T${newTaskStart}`).toISOString()
      if (newTaskEnd) {
        insert.scheduled_end = new Date(`${scheduleDate}T${newTaskEnd}`).toISOString()
      }
    }

    const { error } = await supabase.from('tasks').insert(insert)
    if (!error) {
      setNewTask('')
      setNewTaskStoryId('')
      setShowSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
      setShowRepeat(false)
      setRepeatDays([])
      await load()
    }
    setAddingTask(false)
  }

  async function toggleTask(task: Task) {
    const isDone = task.status !== 'done'
    const completed_at = isDone ? new Date().toISOString() : null
    const status = isDone ? 'done' : 'todo'

    await supabase.from('tasks').update({ status, completed_at }).eq('id', task.id)
    setUnscheduledTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, completed_at } : t)))
    setScheduledTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, completed_at } : t)))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setUnscheduledTasks((prev) => prev.filter((t) => t.id !== taskId))
    setScheduledTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const memberIds = members.map((m) => m.id)

  const timeline: TimelineItem[] = [
    ...events.map((e) => ({
      kind: 'event' as const,
      id: e.id,
      title: e.title,
      start: e.start,
      ownerId: e.owner_id,
    })),
    ...scheduledTasks.map((t) => ({
      kind: 'task' as const,
      id: t.id,
      title: t.title,
      start: t.scheduled_start as string,
      assigneeIds: assignees.filter((a) => a.task_id === t.id).map((a) => a.profile_id),
      done: t.status === 'done',
      storyId: t.story_id,
    })),
  ].sort((a, b) => a.start.localeCompare(b.start))

  if (loading) {
    return <div className="px-4 py-8 text-sm text-on-page/60">Loading...</div>
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Hi, {profile?.display_name}</h1>
          <Link to="/settings" className="text-sm text-on-page/60 hover:text-on-page">
            Settings
          </Link>
        </div>
        <p className="text-sm text-on-page/60">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Today's schedule</h2>
          {timeline.length === 0 && <p className="text-sm text-stone">Nothing scheduled today.</p>}
          <ul className="space-y-2">
            {timeline.map((item) => {
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
                  {item.kind === 'task' && (
                    <button
                      onClick={() => deleteTask(item.id)}
                      className="shrink-0 text-xs text-stone hover:text-red-600"
                      title="Delete task"
                    >
                      &times;
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <form onSubmit={handleAddEvent} className="mt-3 space-y-2 border-t pt-3">
            <input
              type="text"
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={eventStart}
                onChange={(e) => setEventStart(e.target.value)}
                className="flex-1 rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
              />
              <input
                type="time"
                value={eventEnd}
                onChange={(e) => setEventEnd(e.target.value)}
                className="flex-1 rounded border border-stone/30 px-2 py-1.5 text-sm focus:border-forest focus:outline-none"
              />
              <button
                type="submit"
                disabled={addingEvent || !eventTitle.trim()}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {eventError && <p className="text-sm text-red-600">{eventError}</p>}
          </form>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">To do today</h2>
          {unscheduledTasks.length === 0 && <p className="text-sm text-stone">Nothing on the list.</p>}
          <ul className="space-y-2">
            {unscheduledTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleTask(task)}
                  className="h-4 w-4 shrink-0 accent-forest"
                />
                <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-stone line-through' : ''}`}>
                  {task.story_id ? (
                    <Link to={`/stories/${task.story_id}`} className="hover:underline">
                      {task.title}
                    </Link>
                  ) : (
                    task.title
                  )}
                </span>
                <span className="inline-flex gap-1">
                  {assignees
                    .filter((a) => a.task_id === task.id)
                    .map((a) => (
                      <span
                        key={a.profile_id}
                        className={`inline-block h-2 w-2 rounded-full ${colorForProfile(a.profile_id, memberIds).dot}`}
                      />
                    ))}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="shrink-0 text-xs text-stone hover:text-red-600"
                  title="Delete task"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddTask} className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Add something for today..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />
            <div className="flex gap-2">
              {stories.length > 0 && (
                <select
                  value={newTaskStoryId}
                  onChange={(e) => setNewTaskStoryId(e.target.value)}
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
                disabled={addingTask || !newTask.trim()}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {showSchedule ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                />
                <input
                  type="time"
                  value={newTaskStart}
                  onChange={(e) => setNewTaskStart(e.target.value)}
                  className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                />
                <span className="text-xs text-stone">to</span>
                <input
                  type="time"
                  value={newTaskEnd}
                  onChange={(e) => setNewTaskEnd(e.target.value)}
                  className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSchedule(false)}
                  className="text-xs text-stone hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowSchedule(true)
                  setNewTaskDate(dateString(new Date()))
                }}
                className="text-xs text-forest hover:underline"
              >
                + Schedule
              </button>
            )}
            {showRepeat ? (
              <div className="flex items-center gap-1">
                {DAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleRepeatDay(day)}
                    className={`h-7 w-7 rounded-full text-xs font-medium ${
                      repeatDays.includes(day) ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowRepeat(false)
                    setRepeatDays([])
                  }}
                  className="ml-1 text-xs text-stone hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowRepeat(true)} className="text-xs text-forest hover:underline">
                + Repeat
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}