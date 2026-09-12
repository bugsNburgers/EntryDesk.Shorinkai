export type UserRole = 'organizer' | 'coach' | 'admin'
export type EventType = 'tournament' | 'seminar' | 'test'
export type EntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type ParticipationType = 'kata' | 'kumite' | 'both'

export interface User {
    id: string
    email: string
    password_hash?: string | null
    full_name: string | null
    role: UserRole
    avatar_url: string | null
    google_id?: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type Profile = Pick<User, 'id' | 'email' | 'role' | 'full_name' | 'avatar_url' | 'created_at'>

export interface Session {
    id: string
    user_id: string
    session_token: string
    expires_at: string
    created_at: string
}

export interface Dojo {
    id: string
    coach_id: string
    name: string
    created_at: string
}

export interface Student {
    id: string
    dojo_id: string
    name: string
    gender: string
    date_of_birth: string | null
    weight: number | null
    rank: string | null
    registration_no: string | null
    generic_checked: boolean
    created_at: string
}

export interface Event {
    id: string
    organizer_id: string
    title: string
    description: string | null
    event_type: EventType
    start_date: string
    end_date: string
    location: string | null
    is_public: boolean
    is_registration_open: boolean
    created_at: string
}

export interface EventDay {
    id: string
    event_id: string
    date: string
    name: string | null
}

export interface Category {
    id: string
    event_id: string
    name: string
    gender: string | null
    min_age: number | null
    max_age: number | null
    min_weight: number | null
    max_weight: number | null
    min_rank: string | null
    max_rank: string | null
}

export interface EventApplication {
    id: string
    event_id: string
    coach_id: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

export interface Entry {
    id: string
    event_id: string
    coach_id: string
    student_id: string
    category_id: string | null
    event_day_id: string | null
    participation_type: ParticipationType | null
    status: EntryStatus
    chest_no: number | null
    created_at: string
    updated_at: string
}

export interface OrganizerEntry {
    entry_id: string
    event_id: string
    status: EntryStatus
    participation_type: string | null
    created_at: string
    coach_id: string
    event_day_id: string | null
    category_id: string | null
    student_id: string
    chest_no: number | null
    student_name: string
    student_rank: string | null
    student_gender: string
    student_weight: number | null
    student_dob: string | null
    student_registration_no: string | null
    dojo_name: string | null
    category_name: string | null
    event_day_name: string | null
    event_day_date: string | null
    coach_name: string | null
    coach_email: string
    organizer_id: string
}
