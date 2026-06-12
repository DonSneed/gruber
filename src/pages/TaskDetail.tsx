import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Clock, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Collapse } from '../components/Collapse'
import { FlagPicker } from '../components/FlagPicker'
import { PhotoStrip } from '../components/PhotoStrip'
import { NoteList } from '../components/NoteList'
import { dateString, formatDateTime, toTimeInput } from '../lib/date'
import type { Flag, Profile, Task, TaskAssignee, TaskFlag } from '../lib/types'

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [taskFlags, setTaskFlags] = useState<TaskFlag[]>([])
  const [loading, setLoading] = useState(true)

  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(taskId: string) {
    setLoading(true)
    const [taskRes, membersRes, flagsRes, assigneesRes, taskFlagsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', taskId).maybeSingle(),
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('flags').select('*').order('created_at'),
      supabase.from('task_assignees').select('*').eq('task_id', taskId),
      supabase.from('task_flags').select('*').eq('task_id', taskId),
    ])
    setTask(taskRes.data)
    setMembers(membersRes.data ?? [])
    setFlags(flagsRes.data ?? [])
    setAssignees(assigneesRes.data ?? [])
    setTaskFlags(taskFlagsRes.data ?? [])
    setLoading(false)
  }

  async function toggleStatus() {
    if (!task) return
    const isDone = task.status !== 'done'
    const completed_at = isDone ? new Date().toISOString() : null
    const status = isDone ? 'done' : 'todo'
    await supabase.from('tasks').update({ status, completed_at }).eq('id', task.id)
    setTask({ ...task, status, completed_at })
  }

  async function deleteTask() {
    if (!task) return
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    navigate('/')
  }

  async function toggleAssignee(profileId: string) {
    if (!task) return
    const isAssigned = assignees.some((a) => a.profile_id === profileId)
    if (isAssigned) {
      await supabase.from('task_assignees').delete().eq('task_id', task.id).eq('profile_id', profileId)
      setAssignees((prev) => prev.filter((a) => a.profile_id !== profileId))
    } else {
      await supabase.from('task_assignees').insert({ task_id: task.id, profile_id: profileId })
      setAssignees((prev) => [...prev, { task_id: task.id, profile_id: profileId }])
    }
  }

  async function toggleTaskFlag(flagId: string) {
    if (!task) return
    const isAssigned = taskFlags.some((tf) => tf.flag_id === flagId)
    if (isAssigned) {
      await supabase.from('task_flags').delete().eq('task_id', task.id).eq('flag_id', flagId)
      setTaskFlags((prev) => prev.filter((tf) => tf.flag_id !== flagId))
    } else {
      await supabase.from('task_flags').insert({ task_id: task.id, flag_id: flagId })
      setTaskFlags((prev) => [...prev, { task_id: task.id, flag_id: flagId }])
    }
  }

  function startEditSchedule() {
    if (!task) return
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
    setEditingSchedule(true)
  }

  async function saveSchedule() {
    if (!task || !scheduleDate || !scheduleStart) return
    const update = {
      scheduled_start: new Date(`${scheduleDate}T${scheduleStart}`).toISOString(),
      scheduled_end: scheduleEnd ? new Date(`${scheduleDate}T${scheduleEnd}`).toISOString() : null,
    }
    await supabase.from('tasks').update(update).eq('id', task.id)
    setTask({ ...task, ...update })
    setEditingSchedule(false)
  }

  async function clearSchedule() {
    if (!task) return
    const update = { scheduled_start: null, scheduled_end: null }
    await supabase.from('tasks').update(update).eq('id', task.id)
    setTask({ ...task, ...update })
  }

  if (loading) {
    return <div className="px-4 py-8 text-sm text-on-page/60">Loading...</div>
  }
  if (!task) {
    return <Navigate to="/" replace />
  }
  if (task.story_id) {
    return <Navigate to={`/stories/${task.story_id}`} replace />
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Link to="/" className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Today
        </Link>

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={toggleStatus}
              className="mt-1.5 h-5 w-5 shrink-0 accent-forest"
            />
            <h1 className={`text-2xl font-semibold ${task.status === 'done' ? 'text-stone line-through' : ''}`}>
              {task.title}
            </h1>
          </div>
          <button
            onClick={deleteTask}
            className="shrink-0 rounded border border-on-page/30 p-1.5 text-on-page/80 hover:border-red-600 hover:bg-red-600 hover:text-white"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 rounded-lg bg-cream p-4 text-ink shadow">
          <div className="flex items-center gap-1 text-xs text-stone">
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
              onClick={() => (editingSchedule ? setEditingSchedule(false) : startEditSchedule())}
              title="Schedule"
              className={`rounded p-1 ${
                editingSchedule ? 'bg-forest text-white' : 'hover:bg-stone/10 hover:text-forest'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            {task.scheduled_start && (
              <button
                onClick={clearSchedule}
                title="Remove schedule"
                className="rounded p-1 hover:bg-stone/10 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Collapse open={editingSchedule}>
            <div className="flex items-center gap-2">
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
                onClick={saveSchedule}
                className="rounded bg-forest px-2 py-1 text-xs font-medium text-white hover:bg-ink"
              >
                Save
              </button>
              <button onClick={() => setEditingSchedule(false)} className="text-xs text-stone hover:text-ink">
                Cancel
              </button>
            </div>
          </Collapse>

          <div>
            <p className="mb-1 text-xs font-medium text-stone">Assigned to</p>
            <div className="flex gap-1">
              {members.map((member) => {
                const isAssigned = assignees.some((a) => a.profile_id === member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(member.id)}
                    title={member.display_name}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isAssigned ? 'bg-forest text-white' : 'bg-stone/10 text-stone hover:bg-stone/20'
                    }`}
                  >
                    {member.display_name.charAt(0).toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-stone">Flags</p>
            <FlagPicker flags={flags} assignedFlagIds={taskFlags.map((tf) => tf.flag_id)} onToggle={toggleTaskFlag} />
          </div>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Photos</h2>
          {profile && <PhotoStrip familyId={profile.family_id} profileId={profile.id} taskId={task.id} />}
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <h2 className="mb-2 font-medium">Notes</h2>
          {profile && (
            <NoteList familyId={profile.family_id} profileId={profile.id} taskId={task.id} members={members} />
          )}
        </div>
      </div>
    </div>
  )
}
