export type MissionStatus = 'in_progress' | 'submitted' | 'approved'
export type PartyStatus = 'draft' | 'live' | 'ended'
export type ProofType = 'photo' | 'video'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type AssignedTo = 'all' | 'selected' | 'one'

export interface Party {
  id: string
  host_id: string
  birthday_person_name: string
  birthday_person_photo: string | null
  party_title: string
  party_date: string
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
  proof_required: boolean
  proof_type: ProofType | null
  mission_status: MissionStatus
  submission_url: string | null
  submission_note: string | null
  memory_appreciation: string | null
  memory_favorite_moment: string | null
  memory_future_prediction: string | null
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

export interface Database {
  public: {
    Tables: {
      parties: { Row: Party; Insert: Omit<Party, 'id' | 'created_at'>; Update: Partial<Party> }
      guests: { Row: Guest; Insert: Omit<Guest, 'id' | 'created_at'>; Update: Partial<Guest> }
      children: { Row: Child; Insert: Omit<Child, 'id' | 'created_at'>; Update: Partial<Child> }
      bonus_missions: { Row: BonusMission; Insert: Omit<BonusMission, 'id' | 'created_at'>; Update: Partial<BonusMission> }
      birthday_newspapers: { Row: BirthdayNewspaper; Insert: Omit<BirthdayNewspaper, 'id' | 'created_at'>; Update: Partial<BirthdayNewspaper> }
    }
  }
}
