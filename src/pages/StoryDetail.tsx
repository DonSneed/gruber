import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile, Story, Task, TaskAssignee } from '../lib/types'

export function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [story, setStory] = useState<Story | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

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
    const { error } = await supabase.from('tasks').insert({
      family_id: profile.family_id,
      story_id: id,
      title: newTask.trim(),
    })
    if (!error) {
      setNewTask('')
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

  async function toggleStoryStatus() {
    if (!story) return
    const status = story.status === 'active' ? 'done' : 'active'

    await supabase
      .from('stories')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', story.id)
    setStory({ ...story, status })
  }

  if (loading) {
    return <div className="px-4 py-8 text-sm text-gray-500">Loading...</div>
  }
  if (!story) {
    return <Navigate to="/stories" replace />
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Link to="/stories" className="text-sm text-indigo-600 hover:underline">
          &larr; Stories
        </Link>

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold">{story.title}</h1>
          <button
            onClick={toggleStoryStatus}
            className="shrink-0 rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            {story.status === 'active' ? 'Mark done' : 'Mark active'}
          </button>
        </div>

        {story.description && <p className="text-sm text-gray-600">{story.description}</p>}

        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Tasks</h2>
          {tasks.length === 0 && <p className="text-sm text-gray-400">No tasks yet.</p>}
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleTask(task)}
                  className="h-4 w-4 shrink-0 accent-indigo-600"
                />
                <span
                  className={`flex-1 text-sm ${
                    task.status === 'done' ? 'text-gray-400 line-through' : ''
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
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {member.display_name.charAt(0).toUpperCase()}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddTask} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Add a task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding || !newTask.trim()}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Memories</h2>
          <p className="text-sm text-gray-400">Photo memories coming soon.</p>
        </div>
      </div>
    </div>
  )
}