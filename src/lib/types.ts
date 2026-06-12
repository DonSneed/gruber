export type ProfileRole = 'adult' | 'child'
export type StoryStatus = 'active' | 'done'
export type TaskStatus = 'todo' | 'done'

export interface Profile {
  id: string
  family_id: string
  display_name: string
  role: ProfileRole
  auth_user_id: string | null
  theme_color: string
  created_at: string
}

export interface Story {
  id: string
  family_id: string
  title: string
  description: string | null
  status: StoryStatus
  created_by: string | null
  cover_photo: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  story_id: string | null
  family_id: string
  title: string
  status: TaskStatus
  due_date: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  completed_at: string | null
  recurring_task_id: string | null
  created_at: string
}

export interface RecurringTask {
  id: string
  family_id: string
  story_id: string | null
  title: string
  days_of_week: number[]
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  created_by: string | null
  active: boolean
  created_at: string
}

export interface TaskAssignee {
  task_id: string
  profile_id: string
}

export type EventVisibility = 'family' | 'private'

export interface Event {
  id: string
  family_id: string
  title: string
  start: string
  end: string
  owner_id: string | null
  visibility: EventVisibility
  created_at: string
}
