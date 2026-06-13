import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Repeat, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Collapse } from '../components/Collapse'
import { FlagPicker } from '../components/FlagPicker'
import { colorForProfile } from '../lib/colors'
import { addDays, dateString, endOfDay, formatTime, startOfDay, toTimeInput } from '../lib/date'
import { createRecurringTask, DAY_LABELS, materializeRecurringTasks } from '../lib/recurring'
import type { Event, EventOwner, Flag, Profile, Story, Task, TaskAssignee, TaskFlag, TaskStatus } from '../lib/types'

const HOUR_HEIGHT = 56 // px per hour in the timeline
const DEFAULT_HOUR_RANGE = { start: 6, end: 22 }

type DisplayItem =
  | { kind: 'event'; id: string; title: string; start: string; end: string; ownerIds: string[] }
  | {
      kind: 'task'
      id: string
      title: string
      start: string | null
      end: string | null
      status: TaskStatus
      assigneeIds: string[]
      storyId: string | null
    }

function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

// Greedily assigns side-by-side lanes to overlapping items so they share width instead of stacking.
function layoutItems<T extends { startMin: number; endMin: number }>(
  items: T[]
): Array<T & { lane: number; totalLanes: number }> {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin)
  const result: Array<T & { lane: number; totalLanes: number }> = []
  let cluster: T[] = []
  let clusterEnd = -Infinity

  function flush() {
    const laneEnds: number[] = []
    const lanes: number[] = []
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(item.endMin)
      } else {
        laneEnds[lane] = item.endMin
      }
      lanes.push(lane)
    }
    const totalLanes = laneEnds.length
    cluster.forEach((item, i) => result.push({ ...item, lane: lanes[i], totalLanes }))
    cluster = []
  }

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin < clusterEnd) {
      cluster.push(item)
      clusterEnd = Math.max(clusterEnd, item.endMin)
    } else {
      if (cluster.length > 0) flush()
      cluster.push(item)
      clusterEnd = item.endMin
    }
  }
  flush()
  return result
}

export function Today() {
  const { profile } = useAuth()
  const [viewedDate, setViewedDate] = useState(() => new Date())
  const [hourRange, setHourRange] = useState(DEFAULT_HOUR_RANGE)
  const [members, setMembers] = useState<Profile[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [eventOwners, setEventOwners] = useState<EventOwner[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([])
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [taskFlags, setTaskFlags] = useState<TaskFlag[]>([])
  const [activeFlagFilters, setActiveFlagFilters] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [creationMode, setCreationMode] = useState<'task' | 'event'>('task')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [eventStart, setEventStart] = useState('09:00')
  const [eventEnd, setEventEnd] = useState('10:00')

  const [newTask, setNewTask] = useState('')
  const [newTaskStoryId, setNewTaskStoryId] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStart, setNewTaskStart] = useState('09:00')
  const [newTaskEnd, setNewTaskEnd] = useState('')
  const [showRepeat, setShowRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [newTaskFlagIds, setNewTaskFlagIds] = useState<string[]>([])
  const [showAllDay, setShowAllDay] = useState(false)

  useEffect(() => {
    setHourRange(DEFAULT_HOUR_RANGE)
    load()
  }, [viewedDate])

  async function load() {
    setLoading(true)
    const dayStr = dateString(viewedDate)
    const dayStart = startOfDay(viewedDate).toISOString()
    const dayEnd = endOfDay(viewedDate).toISOString()

    await materializeRecurringTasks(dayStr, viewedDate.getDay())

    const [membersRes, storiesRes, eventsRes, scheduledRes, unscheduledRes, flagsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('stories').select('*').eq('status', 'active').order('created_at'),
      supabase.from('events').select('*').gte('start', dayStart).lte('start', dayEnd).order('start'),
      supabase
        .from('tasks')
        .select('*')
        .gte('scheduled_start', dayStart)
        .lte('scheduled_start', dayEnd)
        .order('scheduled_start'),
      supabase.from('tasks').select('*').lte('due_date', dayStr).is('scheduled_start', null).order('created_at'),
      supabase.from('flags').select('*').order('created_at'),
    ])

    const loadedScheduled = scheduledRes.data ?? []
    const loadedEvents = eventsRes.data ?? []
    // Unscheduled tasks still due today, plus unfinished ones carried over from earlier days.
    const loadedUnscheduled = (unscheduledRes.data ?? []).filter(
      (t) => t.due_date === dayStr || t.status !== 'done',
    )
    setMembers(membersRes.data ?? [])
    setStories(storiesRes.data ?? [])
    setEvents(loadedEvents)
    setScheduledTasks(loadedScheduled)
    setUnscheduledTasks(loadedUnscheduled)
    setFlags(flagsRes.data ?? [])

    const allTaskIds = [...loadedScheduled, ...loadedUnscheduled].map((t) => t.id)
    if (allTaskIds.length > 0) {
      const [assigneesRes, taskFlagsRes] = await Promise.all([
        supabase.from('task_assignees').select('*').in('task_id', allTaskIds),
        supabase.from('task_flags').select('*').in('task_id', allTaskIds),
      ])
      setAssignees(assigneesRes.data ?? [])
      setTaskFlags(taskFlagsRes.data ?? [])
    } else {
      setAssignees([])
      setTaskFlags([])
    }

    if (loadedEvents.length > 0) {
      const { data } = await supabase
        .from('event_owners')
        .select('*')
        .in('event_id', loadedEvents.map((e) => e.id))
      setEventOwners(data ?? [])
    } else {
      setEventOwners([])
    }
    setLoading(false)
  }

  async function handleAddEvent() {
    if (!newTask.trim() || !profile) return

    setSubmitting(true)
    setFormError(null)

    const [startH, startM] = eventStart.split(':').map(Number)
    const [endH, endM] = eventEnd.split(':').map(Number)
    const start = new Date(viewedDate)
    start.setHours(startH, startM, 0, 0)
    const end = new Date(viewedDate)
    end.setHours(endH, endM, 0, 0)

    const { data: createdEvent, error } = await supabase
      .from('events')
      .insert({
        family_id: profile.family_id,
        title: newTask.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
      })
      .select('id')
      .single()
    if (error) {
      setFormError(error.message)
    } else {
      if (createdEvent) {
        await supabase.from('event_owners').insert({ event_id: createdEvent.id, profile_id: profile.id })
      }
      setNewTask('')
      await load()
    }
    setSubmitting(false)
  }

  function toggleRepeatDay(day: number) {
    setRepeatDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  function toggleNewTaskFlag(flagId: string) {
    setNewTaskFlagIds((prev) => (prev.includes(flagId) ? prev.filter((id) => id !== flagId) : [...prev, flagId]))
  }

  async function handleAddTask() {
    if (!newTask.trim() || !profile) return

    setSubmitting(true)
    setFormError(null)
    const dayStr = dateString(viewedDate)
    const scheduleDate = showSchedule && newTaskDate ? newTaskDate : dayStr

    if (showRepeat && repeatDays.length > 0) {
      const recurringTask = await createRecurringTask({
        family_id: profile.family_id,
        title: newTask.trim(),
        days_of_week: repeatDays,
        story_id: newTaskStoryId || null,
        scheduled_start_time: showSchedule && newTaskStart ? newTaskStart : null,
        scheduled_end_time: showSchedule && newTaskStart && newTaskEnd ? newTaskEnd : null,
        created_by: profile.id,
      })
      await materializeRecurringTasks(dayStr, viewedDate.getDay())
      if (newTaskFlagIds.length > 0) {
        const { data: createdTask } = await supabase
          .from('tasks')
          .select('id')
          .eq('recurring_task_id', recurringTask.id)
          .eq('due_date', dayStr)
          .maybeSingle()
        if (createdTask) {
          await supabase
            .from('task_flags')
            .insert(newTaskFlagIds.map((flagId) => ({ task_id: createdTask.id, flag_id: flagId })))
        }
      }
      setNewTask('')
      setNewTaskStoryId('')
      setShowSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
      setShowRepeat(false)
      setRepeatDays([])
      setNewTaskFlagIds([])
      await load()
      setSubmitting(false)
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

    const { data: createdTask, error } = await supabase.from('tasks').insert(insert).select('id').single()
    if (error) {
      setFormError(error.message)
    } else {
      if (newTaskFlagIds.length > 0 && createdTask) {
        await supabase
          .from('task_flags')
          .insert(newTaskFlagIds.map((flagId) => ({ task_id: createdTask.id, flag_id: flagId })))
      }
      setNewTask('')
      setNewTaskStoryId('')
      setShowSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
      setShowRepeat(false)
      setRepeatDays([])
      setNewTaskFlagIds([])
      await load()
    }
    setSubmitting(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (creationMode === 'event') {
      await handleAddEvent()
    } else {
      await handleAddTask()
    }
  }

  async function toggleTask(taskId: string, currentStatus: TaskStatus) {
    const isDone = currentStatus !== 'done'
    const completed_at = isDone ? new Date().toISOString() : null
    const status: TaskStatus = isDone ? 'done' : 'todo'
    // Carried-over tasks get checked off "today" (the viewed day) rather than staying on their original due date.
    const due_date = isDone ? dateString(viewedDate) : undefined

    await supabase.from('tasks').update({ status, completed_at, ...(due_date ? { due_date } : {}) }).eq('id', taskId)
    setUnscheduledTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, completed_at, due_date: due_date ?? t.due_date } : t)),
    )
    setScheduledTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status, completed_at } : t)))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setUnscheduledTasks((prev) => prev.filter((t) => t.id !== taskId))
    setScheduledTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  async function toggleTaskFlag(taskId: string, flagId: string) {
    const isAssigned = taskFlags.some((tf) => tf.task_id === taskId && tf.flag_id === flagId)
    if (isAssigned) {
      await supabase.from('task_flags').delete().eq('task_id', taskId).eq('flag_id', flagId)
      setTaskFlags((prev) => prev.filter((tf) => !(tf.task_id === taskId && tf.flag_id === flagId)))
    } else {
      await supabase.from('task_flags').insert({ task_id: taskId, flag_id: flagId })
      setTaskFlags((prev) => [...prev, { task_id: taskId, flag_id: flagId }])
    }
  }

  function toggleFlagFilter(flagId: string) {
    setActiveFlagFilters((prev) =>
      prev.includes(flagId) ? prev.filter((id) => id !== flagId) : [...prev, flagId]
    )
  }

  const memberIds = members.map((m) => m.id)
  const isToday = dateString(viewedDate) === dateString(new Date())

  const taskMatchesFilter = (task: Task) =>
    activeFlagFilters.length === 0 ||
    taskFlags.some((tf) => tf.task_id === task.id && activeFlagFilters.includes(tf.flag_id))

  const filteredScheduledTasks = scheduledTasks.filter(taskMatchesFilter)
  const filteredUnscheduledTasks = unscheduledTasks.filter(taskMatchesFilter)

  const items: DisplayItem[] = [
    ...events.map((e) => ({
      kind: 'event' as const,
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      ownerIds: eventOwners.filter((eo) => eo.event_id === e.id).map((eo) => eo.profile_id),
    })),
    ...filteredScheduledTasks.map((t) => ({
      kind: 'task' as const,
      id: t.id,
      title: t.title,
      start: t.scheduled_start as string,
      end: t.scheduled_end,
      status: t.status,
      assigneeIds: assignees.filter((a) => a.task_id === t.id).map((a) => a.profile_id),
      storyId: t.story_id,
    })),
    ...filteredUnscheduledTasks.map((t) => ({
      kind: 'task' as const,
      id: t.id,
      title: t.title,
      start: null,
      end: null,
      status: t.status,
      assigneeIds: assignees.filter((a) => a.task_id === t.id).map((a) => a.profile_id),
      storyId: t.story_id,
    })),
  ]

  const timedItems = items.filter((item) => item.start !== null) as Array<DisplayItem & { start: string }>
  const allDayTasks = items.filter(
    (item): item is DisplayItem & { kind: 'task'; start: null } => item.kind === 'task' && item.start === null
  )
  const allDayDoneCount = allDayTasks.filter((t) => t.status === 'done').length

  const totalHeight = (hourRange.end - hourRange.start) * HOUR_HEIGHT
  const rangeStartMin = hourRange.start * 60
  const hours = Array.from({ length: hourRange.end - hourRange.start }, (_, i) => hourRange.start + i)

  const laidOutItems = layoutItems(
    timedItems.map((item) => {
      const startMin = minutesSinceMidnight(item.start)
      const endMin = item.end ? minutesSinceMidnight(item.end) : startMin + 30
      return { item, startMin, endMin: Math.max(endMin, startMin + 15) }
    })
  )

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

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setViewedDate((d) => addDays(d, -1))}
              className="rounded p-1 text-stone hover:bg-stone/10"
              title="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h2 className="font-medium">
                {viewedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              {!isToday && (
                <button
                  onClick={() => setViewedDate(new Date())}
                  className="text-xs text-forest hover:underline"
                >
                  Jump to today
                </button>
              )}
            </div>
            <button
              onClick={() => setViewedDate((d) => addDays(d, 1))}
              className="rounded p-1 text-stone hover:bg-stone/10"
              title="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {flags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {flags.map((flag) => {
                const active = activeFlagFilters.includes(flag.id)
                return (
                  <button
                    key={flag.id}
                    type="button"
                    onClick={() => toggleFlagFilter(flag.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      active ? 'text-white' : 'text-stone ring-1 ring-inset ring-stone/30 hover:bg-stone/10'
                    }`}
                    style={active ? { backgroundColor: flag.color } : undefined}
                  >
                    {flag.name}
                  </button>
                )
              })}
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-stone">
              {activeFlagFilters.length === 0 ? 'Nothing today.' : 'Nothing with these flags.'}
            </p>
          )}

          {allDayTasks.length > 0 && (
            <div className="mb-2 border-b border-stone/10 pb-2">
              <button
                type="button"
                onClick={() => setShowAllDay((prev) => !prev)}
                className="w-full rounded bg-stone/10 px-2 py-1 text-left text-xs font-medium text-stone hover:bg-stone/20"
              >
                Today's stuff ({allDayDoneCount}/{allDayTasks.length})
              </button>
              <Collapse open={showAllDay}>
                <ul className="mt-1 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {allDayTasks.map((item) => (
                    <li key={`task-${item.id}`} className="flex items-start gap-2.5 rounded px-1 py-1.5">
                      <input
                        type="checkbox"
                        checked={item.status === 'done'}
                        onChange={() => toggleTask(item.id, item.status)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-forest"
                      />
                      <span
                        className={`min-w-0 flex-1 text-base ${item.status === 'done' ? 'text-stone line-through' : ''}`}
                      >
                        <Link
                          to={item.storyId ? `/stories/${item.storyId}` : `/tasks/${item.id}`}
                          className="hover:underline"
                        >
                          {item.title}
                        </Link>
                      </span>
                      <span className="inline-flex shrink-0 gap-1 pt-1">
                        {item.assigneeIds.map((id) => (
                          <span
                            key={id}
                            className={`inline-block h-2 w-2 rounded-full ${colorForProfile(id, memberIds).dot}`}
                          />
                        ))}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                        <FlagPicker
                          flags={flags}
                          assignedFlagIds={taskFlags.filter((tf) => tf.task_id === item.id).map((tf) => tf.flag_id)}
                          onToggle={(flagId) => toggleTaskFlag(item.id, flagId)}
                        />
                        <button
                          onClick={() => deleteTask(item.id)}
                          className="shrink-0 text-stone hover:text-red-600"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Collapse>
            </div>
          )}

          {hourRange.start > 0 && (
            <button
              onClick={() => setHourRange((r) => ({ ...r, start: Math.max(0, r.start - 2) }))}
              className="mb-1 flex w-full items-center justify-center gap-1 text-xs text-stone hover:text-forest"
            >
              <ChevronUp className="h-3 w-3" /> Earlier
            </button>
          )}

          <div className="relative overflow-hidden" style={{ height: totalHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-stone/10"
                style={{ top: (h - hourRange.start) * HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 left-0 bg-cream px-0.5 text-[10px] text-stone">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}

            <div className="absolute left-10 right-0 top-0" style={{ height: totalHeight }}>
              {laidOutItems.map(({ item, startMin, endMin, lane, totalLanes }) => {
                const top = ((startMin - rangeStartMin) / 60) * HOUR_HEIGHT
                const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22)
                const widthPct = 100 / totalLanes
                const leftPct = lane * widthPct
                const style = {
                  top,
                  height,
                  left: `${leftPct}%`,
                  width: `calc(${widthPct}% - 2px)`,
                }

                if (item.kind === 'event') {
                  const color =
                    item.ownerIds.length === 1
                      ? colorForProfile(item.ownerIds[0], memberIds)
                      : colorForProfile(null, memberIds)
                  return (
                    <Link
                      key={`event-${item.id}`}
                      to={`/events/${item.id}`}
                      className={`absolute flex items-center gap-1 overflow-hidden rounded px-1.5 py-0.5 text-xs hover:underline ${color.bg} ${color.text}`}
                      style={style}
                    >
                      <span className="truncate">
                        <span className="font-medium">{formatTime(item.start)}</span> {item.title}
                      </span>
                      {item.ownerIds.length > 1 && (
                        <span className="ml-auto inline-flex shrink-0 gap-0.5">
                          {item.ownerIds.map((id) => (
                            <span
                              key={id}
                              className={`inline-block h-1.5 w-1.5 rounded-full ${colorForProfile(id, memberIds).dot}`}
                            />
                          ))}
                        </span>
                      )}
                    </Link>
                  )
                }

                return (
                  <div
                    key={`task-${item.id}`}
                    className="absolute flex items-center gap-1 overflow-hidden rounded bg-stone/10 px-1.5 text-xs"
                    style={style}
                  >
                    <input
                      type="checkbox"
                      checked={item.status === 'done'}
                      onChange={() => toggleTask(item.id, item.status)}
                      className="h-3 w-3 shrink-0 accent-forest"
                    />
                    <span className={`truncate ${item.status === 'done' ? 'text-stone line-through' : ''}`}>
                      <Link
                        to={item.storyId ? `/stories/${item.storyId}` : `/tasks/${item.id}`}
                        className="hover:underline"
                      >
                        {item.title}
                      </Link>
                    </span>
                    <span className="ml-auto inline-flex shrink-0 gap-0.5">
                      {item.assigneeIds.map((id) => (
                        <span
                          key={id}
                          className={`inline-block h-1.5 w-1.5 rounded-full ${colorForProfile(id, memberIds).dot}`}
                        />
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {hourRange.end < 24 && (
            <button
              onClick={() => setHourRange((r) => ({ ...r, end: Math.min(24, r.end + 2) }))}
              className="mt-1 flex w-full items-center justify-center gap-1 text-xs text-stone hover:text-forest"
            >
              <ChevronDown className="h-3 w-3" /> Later
            </button>
          )}

          <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t pt-3">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCreationMode('task')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  creationMode === 'task' ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                }`}
              >
                Task
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('event')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  creationMode === 'event' ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                }`}
              >
                Event
              </button>
            </div>
            <input
              type="text"
              placeholder={creationMode === 'event' ? 'Event title' : 'Add something for today...'}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="w-full rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
            />

            {creationMode === 'event' ? (
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
                  disabled={submitting || !newTask.trim()}
                  className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ) : (
              <>
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
                    disabled={submitting || !newTask.trim()}
                    className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!showSchedule) {
                        setNewTaskDate(dateString(viewedDate))
                        setNewTaskStart(toTimeInput(new Date()))
                      }
                      setShowSchedule((prev) => !prev)
                    }}
                    title="Schedule"
                    className={`rounded p-1.5 ${
                      showSchedule ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRepeat((prev) => !prev)}
                    title="Repeat"
                    className={`rounded p-1.5 ${
                      showRepeat ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10'
                    }`}
                  >
                    <Repeat className="h-4 w-4" />
                  </button>
                  <FlagPicker flags={flags} assignedFlagIds={newTaskFlagIds} onToggle={toggleNewTaskFlag} />
                </div>
                <Collapse open={showSchedule}>
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
                  </div>
                </Collapse>
                <Collapse open={showRepeat}>
                  <div className="flex items-center gap-1">
                    {DAY_LABELS.map((label, day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRepeatDay(day)}
                        className={`h-7 w-7 rounded-full text-xs font-medium ${
                          repeatDays.includes(day)
                            ? 'bg-forest text-white'
                            : 'bg-stone/10 text-stone hover:bg-stone/20'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Collapse>
              </>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
