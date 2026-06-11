export type ProfileRole = 'adult' | 'child'

export interface Profile {
  id: string
  family_id: string
  display_name: string
  role: ProfileRole
  auth_user_id: string | null
  created_at: string
}
