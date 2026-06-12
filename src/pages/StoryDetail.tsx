import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { dateString, formatDateTime, toTimeInput } from '../lib/date'
import { PhotoStrip } from '../components/PhotoStrip'
import type { Profile, Story, Task, TaskAssignee } from '../lib/types'

export function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [story, setStory] = useState<Story | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

  const [showNewSchedule, setShowNewSchedule] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStart, setNewTaskStart] = useState('09:00')
  const [newTaskEnd, setNewTaskEnd] = useState('')

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')

  const [photosTaskId, setPhotosTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(storyId: string) {
    setLoading(true)
    const [storyRes, tasksRes, membersRes] = await Promise.all([
      supabase.from('stories').select('*').eq('id', storyId).maybeSingle(),
      supabase.from('tasks').select('*').eq('story_id', storyId).order('created_at'),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setStory(storyRes.data)
    const loadedTasks = tasksRes.data ?? []
    setTasks(loadedTasks)
    setMembers(membersRes.data ?? [])

    if (loadedTasks.length > 0) {
      const { data: assigneeRows } = await supabase
        .from('task_assignees')
        .select('*')
        .in('task_id', loadedTasks.map((t) => t.id))
      setAssignees(assigneeRows ?? [])
    } else {
      setAssignees([])
    }
    setLoading(false)
  }

  async function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!newTask.trim() || !profile || !id) return

    setAdding(true)
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

    const { error } = await supabase.from('tasks').insert(insert)
    if (!error) {
      setNewTask('')
      setShowNewSchedule(false)
      setNewTaskDate('')
      setNewTaskEnd('')
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

  function startEditSchedule(task: Task) {
    setEditingScheduleId(task.id)
    if (task.scheduled_start) {
      const start = new Date(task.scheduled_start)
      setScheduleDate(dateString(start))
      setScheduleStart(toTimeInput(start))
      setScheduleEnd(task.scheduled_end ? toTimeInput(new Date(task.scheduled_end)) : '')
    } else {
      setScheduleDate(dateString(new Date()))
      setScheduleStart('09:00')
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
              className="rounded border border-on-page/30 px-3 py-1 text-xs font-medium text-on-page/80 hover:bg-red-600 hover:text-white hover:border-red-600"
            >
              Delete
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
                    className="text-xs text-stone hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>

                <div className="ml-6 mt-1 flex items-center gap-2 text-xs text-stone">
                  {task.scheduled_start ? (
                    <>
                      <span>
                        {formatDateTime(task.scheduled_start)}
                        {task.scheduled_end ? ` – ${formatDateTime(task.scheduled_end)}` : ''}
                      </span>
                      <button onClick={() => startEditSchedule(task)} className="hover:text-forest">
                        Edit
                      </button>
                      <button onClick={() => clearSchedule(task.id)} className="hover:text-red-600">
                        Remove
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEditSchedule(task)} className="hover:text-forest">
                      + Schedule
                    </button>
                  )}
                  <button
                    onClick={() => setPhotosTaskId(photosTaskId === task.id ? null : task.id)}
                    className="hover:text-forest"
                  >
                    {photosTaskId === task.id ? 'Hide photos' : '+ Photos'}
                  </button>
                </div>

                {photosTaskId === task.id && profile && (
                  <div className="ml-6 mt-1">
                    <PhotoStrip familyId={profile.family_id} profileId={profile.id} taskId={task.id} />
                  </div>
                )}

                {editingScheduleId === task.id && (
                  <div className="ml-6 mt-1 flex items-center gap-2">
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
                )}
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
            {showNewSchedule ? (
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
                <button
                  type="button"
                  onClick={() => setShowNewSchedule(false)}
                  className="text-xs text-stone hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowNewSchedule(true)
                  setNewTaskDate(dateString(new Date()))
                }}
                className="text-xs text-forest hover:underline"
              >
                + Add schedule
              </button>
            )}
          </form>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Memories</h2>
          {profile && <PhotoStrip familyId={profile.family_id} profileId={profile.id} storyId={story.id} />}
        </div>
      </div>
    </div>
  )
}
