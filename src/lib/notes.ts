import { supabase } from './supabase'

export interface Note {
  id: string
  family_id: string
  story_id: string | null
  task_id: string | null
  event_id: string | null
  content: string
  created_by: string | null
  created_at: string
}

export async function listNotes(filter: { storyId?: string; taskId?: string; eventId?: string }): Promise<Note[]> {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false })
  if (filter.storyId) query = query.eq('story_id', filter.storyId)
  if (filter.taskId) query = query.eq('task_id', filter.taskId)
  if (filter.eventId) query = query.eq('event_id', filter.eventId)
  const { data } = await query
  return data ?? []
}

export async function addNote(
  content: string,
  familyId: string,
  profileId: string,
  target: { storyId?: string; taskId?: string; eventId?: string },
): Promise<void> {
  await supabase.from('notes').insert({
    family_id: familyId,
    story_id: target.storyId ?? null,
    task_id: target.taskId ?? null,
    event_id: target.eventId ?? null,
    content,
    created_by: profileId,
  })
}

export async function deleteNote(id: string): Promise<void> {
  await supabase.from('notes').delete().eq('id', id)
}
