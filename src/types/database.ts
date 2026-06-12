export type MissionStatus = 'in_progress' | 'submitted' | 'approved'
export type PartyStatus = 'draft' | 'live' | 'ended'
export type ProofType = 'photo' | 'video'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type AssignedTo = 'all' | 'selected' | 'one'
export type RsvpStatus = 'pending' | 'accepted' | 'declined'

export interface NoteBlock {
  icon?: string
  text: string
  link?: string
}

export interface EventLink {
  label: string
  url: string
}

export interface Party {
  id: string
  host_id: string
  birthday_person_name: string
  birthday_person_photo: string | null
  party_title: string
  party_date: string
  party_story: string | null
  event_time: string | null
  event_location: string | null
  meeting_point: string | null
  event_notes: NoteBlock[]
  event_links: EventLink[]
  theme: string
  adult_count: number
  kid_count: number
  invite_code: string
  status: PartyStatus
  host_notes: string | null
  created_at: string
}

export interface Guest {
  id: string
  party_id: string
  name: string
  email: string
  photo: string | null
  role_name: string | null
  role_description: string | null
  mission_title: string | null
  mission_instructions: string | null
  mission_difficulty: Difficulty | null
  mission_easy: string | null
  mission_medium: string | null
  mission_legendary: string | null
  proof_required: boolean
  proof_type: ProofType | null
  mission_status: MissionStatus
  rsvp_status: RsvpStatus
  mission_accepted: boolean
  submission_url: string | null
  submission_note: string | null
  memory_appreciation: string | null
  memory_favorite_moment: string | null
  memory_future_prediction: string | null
  invite_code: string | null
  is_host: boolean
  created_at: string
}

export interface Child {
  id: string
  guest_id: string
  party_id: string
  name: string
  age: number
  role_name: string | null
  role_description: string | null
  created_at: string
}

export interface BonusMission {
  id: string
  party_id: string
  title: string
  instructions: string
  assigned_to: AssignedTo
  guest_ids: string[]
  proof_required: boolean
  created_at: string
}

export interface BirthdayNewspaper {
  id: string
  party_id: string
  title: string
  generated_content: Record<string, unknown> | null
  status: 'draft' | 'published'
  created_at: string
}
