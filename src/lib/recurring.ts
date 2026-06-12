import { supabase } from './supabase'
import type { RecurringTask } from './types'

export const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function taskInsertFromRecurring(rt: RecurringTask, dateStr: string) {
  return {
    family_id: rt.family_id,
    story_id: rt.story_id,
    title: rt.title,
    due_date: dateStr,
    recurring_task_id: rt.id,
    scheduled_start: rt.scheduled_start_time
      ? new Date(`${dateStr}T${rt.scheduled_start_time}`).toISOString()
      : null,
    scheduled_end: rt.scheduled_end_time
      ? new Date(`${dateStr}T${rt.scheduled_end_time}`).toISOString()
      : null,
  }
}

// Creates today's task instances for any active recurring template that
// covers `dayOfWeek` and doesn't already have one for `dateStr`.
export async function materializeRecurringTasks(dateStr: string, dayOfWeek: number) {
  const { data: recurring } = await supabase
    .from('recurring_tasks')
    .select('*')
    .eq('active', true)
    .contains('days_of_week', [dayOfWeek])
  if (!recurring || recurring.length === 0) return

  const { data: existing } = await supabase
    .from('tasks')
    .select('recurring_task_id')
    .eq('due_date', dateStr)
    .not('recurring_task_id', 'is', null)
  const existingIds = new Set((existing ?? []).map((t) => t.recurring_task_id))

  const missing = recurring.filter((rt) => !existingIds.has(rt.id))
  if (missing.length === 0) return

  await supabase.from('tasks').insert(missing.map((rt) => taskInsertFromRecurring(rt, dateStr)))
}

export interface NewRecurringTask {
  family_id: string
  title: string
  days_of_week: number[]
  story_id: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  created_by: string
}

export async function createRecurringTask(input: NewRecurringTask): Promise<RecurringTask> {
  const { data, error } = await supabase.from('recurring_tasks').insert(input).select().single()
  if (error) throw error
  return data
}