import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Clock, Image as ImageIcon, Repeat, StickyNote, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Collapse } from '../components/Collapse'
import { FlagPicker } from '../components/FlagPicker'
import { dateString, formatDateTime, toTimeInput } from '../lib/date'
import { PhotoStrip } from '../components/PhotoStrip'
import { NoteList } from '../components/NoteList'
import { createRecurringTask, DAY_LABELS, materializeRecurringTasks } from '../lib/recurring'
import type { Flag, Profile, Story, Task, TaskAssignee, TaskFlag } from '../lib/types'

export function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [story, setStory] = useState<Story | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [taskFlags, setTaskFlags] = useState<TaskFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

  const [showNewSchedule, setShowNewSchedule] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStart, setNewTaskStart] = useState('09:00')
  const [newTaskEnd, setNewTaskEnd] = useState('')
  const [showRepeat, setShowRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [newTaskFlagIds, setNewTaskFlagIds] = useState<string[]>([])

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')

  const [photosTaskId, setPhotosTaskId] = useState<string | null>(null)
  const [notesTaskId, setNotesTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(storyId: string) {
    setLoading(true)
    const [storyRes, tasksRes, membersRes, flagsRes] = await Promise.all([
      supabase.from('stories').select('*').eq('id', storyId).maybeSingle(),
      supabase.from('tasks').select('*').eq('story_id', storyId).order('created_at'),
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('flags').select('*').order('created_at'),
    ])
    setStory(storyRes.data)
    const loadedTasks = tasksRes.data ?? []
    setTasks(loadedTasks)
    setMembers(membersRes.data ?? [])
    setFlags(flagsRes.data ?? [])

    if (loadedTasks.length > 0) {
      const [assigneeRows, taskFlagRows] = await Promise.all([
        supabase.from('task_assignees').select('*').in('task_id', loadedTasks.map((t) => t.id)),
        supabase.from('task_flags').select('*').in('task_id', loadedTasks.map((t) => t.id)),
      ])
      setAssignees(assigneeRows.data ?? [])
      setTaskFlags(taskFlagRows.data ?? [])
    } else {
      setAssignees([])
      setTaskFlags([])
    }
    setLoading(false)
  }

  function toggleRepeatDay(day: number) {
    setRepeatDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  function toggleNewTaskFlag(flagId: string) {
    setNewTaskFlagIds((prev) => (prev.includes(flagId) ? prev.filter((fid) => fid !== flagId) : [...prev, flagId]))
  }

  async function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!newTask.trim() || !profile || !id) return

    setAdding(true)

    if (showRepeat && repeatDays.length > 0) {
      const recurringTask = await createRecurringTask({
        family_id: profile.family_id,
        title: newTask.trim(),
        days_of_week: repeatDays,
        story_id: id,
        scheduled_start_time: showNewSchedule && newTaskStart ? newTaskStart : null,
        scheduled_end_time: showNewSchedule && newTaskStart && newTaskEnd ? newTaskEnd : null,
        created_by: profile.id,
      })
      const now = new Date()
      const todayStr = dateString(now)
      await materializeRecurringTasks(todayStr, now.getDay())
      if (newTaskFlagIds.length > 0) {
        const { data: createdTask } = await supabase
          .from('tasks')
          .select('id')
          .eq('recurring_task_id', recurringTask.id)
          .eq('due_date', todayStr)
          .maybeSingle()
        if (createdTask) {
          await supabase
            .from('task_flags')
            .insert(newTaskFlagIds.map((flagId) => ({ task_id: createdTask.id, flag_id: flagId })))
        }
      }
      setNewTask('')
      setShowNewSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
      setShowRepeat(false)
      setRepeatDays([])
      setNewTaskFlagIds([])
      await load(id)
      setAdding(false)
      return
    }

    const insert: {
      family_id: string
      story_id: string
      title: string
      scheduled_start?: string
      scheduled_end?: string
    } = {
      family_id: profile.family_id,
      story_id: id,
      title: newTask.trim(),
    }
    if (showNewSchedule && newTaskDate && newTaskStart) {
      insert.scheduled_start = new Date(`${newTaskDate}T${newTaskStart}`).toISOString()
      if (newTaskEnd) {
        insert.scheduled_end = new Date(`${newTaskDate}T${newTaskEnd}`).toISOString()
      }
    }

    const { data: createdTask, error } = await supabase.from('tasks').insert(insert).select('id').single()
    if (!error) {
      if (newTaskFlagIds.length > 0 && createdTask) {
        await supabase
          .from('task_flags')
          .insert(newTaskFlagIds.map((flagId) => ({ task_id: createdTask.id, flag_id: flagId })))
      }
      setNewTask('')
      setShowNewSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
      setShowRepeat(false)
      setRepeatDays([])
      setNewTaskFlagIds([])
      await load(id)
    }
    setAdding(false)
  }

  async function toggleTask(task: Task) {
    const isDone = task.status !== 'done'
    const completed_at = isDone ? new Date().toISOString() : null
    const status = isDone ? 'done' : 'todo'

    await supabase.from('tasks').update({ status, completed_at }).eq('id', task.id)
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, completed_at } : t)))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  async function toggleAssignee(taskId: string, profileId: string) {
    const isAssigned = assignees.some((a) => a.task_id === taskId && a.profile_id === profileId)

    if (isAssigned) {
      await supabase.from('task_assignees').delete().eq('task_id', taskId).eq('profile_id', profileId)
      setAssignees((prev) => prev.filter((a) => !(a.task_id === taskId && a.profile_id === profileId)))
    } else {
      await supabase.from('task_assignees').insert({ task_id: taskId, profile_id: profileId })
      setAssignees((prev) => [...prev, { task_id: taskId, profile_id: profileId }])
    }
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

  function startEditSchedule(task: Task) {
    setEditingScheduleId(task.id)
    if (task.scheduled_start) {
      const start = new Date(task.scheduled_start)
      setScheduleDate(dateString(start))
      setScheduleStart(toTimeInput(start))
      setScheduleEnd(task.scheduled_end ? toTimeInput(new Date(task.scheduled_end)) : '')
    } else {
      setScheduleDate(dateString(new Date()))
      setScheduleStart(toTimeInput(new Date()))
      setScheduleEnd('')
    }
  }

  function cancelEditSchedule() {
    setEditingScheduleId(null)
  }

  async function saveSchedule(taskId: string) {
    if (!scheduleDate || !scheduleStart) return

    const update = {
      scheduled_start: new Date(`${scheduleDate}T${scheduleStart}`).toISOString(),
      scheduled_end: scheduleEnd ? new Date(`${scheduleDate}T${scheduleEnd}`).toISOString() : null,
    }
    await supabase.from('tasks').update(update).eq('id', taskId)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...update } : t)))
    setEditingScheduleId(null)
  }

  async function clearSchedule(taskId: string) {
    const update = { scheduled_start: null, scheduled_end: null }
    await supabase.from('tasks').update(update).eq('id', taskId)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...update } : t)))
  }

  async function toggleStoryStatus() {
    if (!story) return
    const status = story.status === 'active' ? 'done' : 'active'

    await supabase
      .from('stories')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', story.id)
    setStory({ ...story, status })
  }

  async function deleteStory() {
    if (!story) return
    if (!confirm('Delete this story and all its tasks?')) return
    await supabase.from('stories').delete().eq('id', story.id)
    navigate('/stories')
  }

  if (loading) {
    return <div className="px-4 py-8 text-sm text-on-page/60">Loading...</div>
  }
  if (!story) {
    return <Navigate to="/stories" replace />
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Link to="/stories" className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Stories
        </Link>

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold">{story.title}</h1>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={toggleStoryStatus}
              className="rounded border border-on-page/30 px-3 py-1 text-xs font-medium text-on-page/80 hover:bg-on-page/10"
            >
              {story.status === 'active' ? 'Mark done' : 'Mark active'}
            </button>
            <button
              onClick={deleteStory}
              className="rounded border border-on-page/30 p-1.5 text-on-page/80 hover:border-red-600 hover:bg-red-600 hover:text-white"
              title="Delete story"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {story.description && <p className="text-sm text-on-page/60">{story.description}</p>}

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Tasks</h2>
          {tasks.length === 0 && <p className="text-sm text-stone">No tasks yet.</p>}
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => toggleTask(task)}
                    className="h-4 w-4 shrink-0 accent-forest"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.status === 'done' ? 'text-stone line-through' : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {members.map((member) => {
                      const isAssigned = assignees.some(
                        (a) => a.task_id === task.id && a.profile_id === member.id,
                      )
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleAssignee(task.id, member.id)}
                          title={member.display_name}
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isAssigned
                              ? 'bg-forest text-white'
                              : 'bg-stone/10 text-stone hover:bg-stone/20'
                          }`}
                        >
                          {member.display_name.charAt(0).toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-stone hover:text-red-600"
                    title="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="ml-6 mt-1 flex items-center gap-1 text-xs text-stone">
                  <span className="mr-1">
                    {task.scheduled_start ? (
                      <>
                        {formatDateTime(task.scheduled_start)}
                        {task.scheduled_end ? ` – ${formatDateTime(task.scheduled_end)}` : ''}
                      </>
                    ) : (
                      formatDateTime(task.created_at)
                    )}
                  </span>
                  <button
                    onClick={() =>
                      editingScheduleId === task.id ? cancelEditSchedule() : startEditSchedule(task)
                    }
                    title="Schedule"
                    className={`rounded p-1 ${
                      editingScheduleId === task.id ? 'bg-forest text-white' : 'hover:bg-stone/10 hover:text-forest'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                  {task.scheduled_start && (
                    <button
                      onClick={() => clearSchedule(task.id)}
                      title="Remove schedule"
                      className="rounded p-1 hover:bg-stone/10 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setPhotosTaskId(photosTaskId === task.id ? null : task.id)}
                    title="Photos"
                    className={`rounded p-1 ${
                      photosTaskId === task.id ? 'bg-forest text-white' : 'hover:bg-stone/10 hover:text-forest'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setNotesTaskId(notesTaskId === task.id ? null : task.id)}
                    title="Notes"
                    className={`rounded p-1 ${
                      notesTaskId === task.id ? 'bg-forest text-white' : 'hover:bg-stone/10 hover:text-forest'
                    }`}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                  </button>
                  <FlagPicker
                    flags={flags}
                    assignedFlagIds={taskFlags.filter((tf) => tf.task_id === task.id).map((tf) => tf.flag_id)}
                    onToggle={(flagId) => toggleTaskFlag(task.id, flagId)}
                  />
                </div>

                <Collapse open={editingScheduleId === task.id}>
                  <div className="ml-6 flex items-center gap-2">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                    />
                    <input
                      type="time"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                    />
                    <input
                      type="time"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className="rounded border border-stone/30 px-2 py-1 text-xs focus:border-forest focus:outline-none"
                    />
                    <button
                      onClick={() => saveSchedule(task.id)}
                      className="rounded bg-forest px-2 py-1 text-xs font-medium text-white hover:bg-ink"
                    >
                      Save
                    </button>
                    <button onClick={cancelEditSchedule} className="text-xs text-stone hover:text-ink">
                      Cancel
                    </button>
                  </div>
                </Collapse>

                <Collapse open={photosTaskId === task.id}>
                  {profile && (
                    <div className="ml-6">
                      <PhotoStrip familyId={profile.family_id} profileId={profile.id} taskId={task.id} />
                    </div>
                  )}
                </Collapse>

                <Collapse open={notesTaskId === task.id}>
                  {profile && (
                    <div className="ml-6">
                      <NoteList
                        familyId={profile.family_id}
                        profileId={profile.id}
                        taskId={task.id}
                        members={members}
                      />
                    </div>
                  )}
                </Collapse>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddTask} className="mt-3 space-y-2 border-t pt-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 rounded border border-stone/30 px-3 py-1.5 text-sm focus:border-forest focus:outline-none"
              />
              <button
                type="submit"
                disabled={adding || !newTask.trim()}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!showNewSchedule) {
                    setNewTaskDate(dateString(new Date()))
                    setNewTaskStart(toTimeInput(new Date()))
                  }
                  setShowNewSchedule((prev) => !prev)
                }}
                title="Schedule"
                className={`rounded p-1.5 ${
                  showNewSchedule ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10'
                }`}
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowRepeat((prev) => !prev)}
                title="Repeat"
                className={`rounded p-1.5 ${showRepeat ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10'}`}
              >
                <Repeat className="h-4 w-4" />
              </button>
              <FlagPicker flags={flags} assignedFlagIds={newTaskFlagIds} onToggle={toggleNewTaskFlag} />
            </div>
            <Collapse open={showNewSchedule}>
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
                      repeatDays.includes(day) ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Collapse>
          </form>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Memories</h2>
          {profile && <PhotoStrip familyId={profile.family_id} profileId={profile.id} storyId={story.id} />}
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Notes</h2>
          {profile && (
            <NoteList familyId={profile.family_id} profileId={profile.id} storyId={story.id} members={members} />
          )}
        </div>
      </div>
    </div>
  )
}
