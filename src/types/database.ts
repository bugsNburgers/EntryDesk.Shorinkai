// ============================================================================
// EntryDesk — Database Type Definitions
// Keep in sync with the Neon schema. Add new fields here when running migrations.
// ============================================================================

// ─── Enumerations ────────────────────────────────────────────────────────────

export type UserRole = 'organizer' | 'coach' | 'admin' | 'parent'
export type EventType = 'tournament' | 'seminar' | 'test'
export type EntryStatus =
    | 'draft'
    | 'pending_coach'
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'correction_needed'
    | 'coach_declined'
    | 'withdrawn'
export type ParticipationType = 'kata' | 'kumite' | 'both'
export type MembershipStatus = 'active' | 'removed'
export type AuditActorType = 'parent' | 'coach' | 'organizer' | 'admin' | 'system'
export type AgeCutoffRule = 'tournament_day' | 'jan_1'

// ─── Core Entities ────────────────────────────────────────────────────────────

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
    user_agent?: string | null
    ip_address?: string | null
    created_at: string
}

// ─── Dojo ─────────────────────────────────────────────────────────────────────

export interface Dojo {
    id: string
    coach_id: string
    name: string
    /** URL-safe slug for the parent join link: /join/[slug] */
    slug: string | null
    /** 6-character alphanumeric code for manual entry */
    join_code: string | null
    /** When false, the join link shows "ask your coach for a new link" */
    join_link_enabled: boolean
    welcome_note: string | null
    city: string | null
    created_at: string
}

// ─── Student ──────────────────────────────────────────────────────────────────

export interface Student {
    id: string
    dojo_id: string
    name: string
    gender: string
    date_of_birth: string | null
    weight: number | null
    rank: string | null
    registration_no: string | null
    is_active: boolean
    // Parent portal additions
    parent_id: string | null
    photo_url: string | null
    phone: string | null
    school_or_city: string | null
    /** Locked after first approved entry to prevent DOB manipulation */
    dob_locked: boolean
    // DPDP consent fields
    consent_given_at: string | null
    consent_version: string | null
    consent_given_by: string | null
    // Soft removal tracking
    membership_status: MembershipStatus
    removed_at: string | null
    removed_by: string | null
    removed_reason: string | null
    created_at: string
}

// ─── Event ────────────────────────────────────────────────────────────────────

export interface Event {
    id: string
    organizer_id: string
    title: string
    description: string | null
    event_type: EventType
    level: string
    start_date: string
    end_date: string
    location: string | null
    is_public: boolean
    is_registration_open: boolean
    registration_close_date?: string | null
    temporary_registration_closes_at?: string | null
    // Parent portal additions
    /** When true, parent entries go to pending_coach first; when false they go directly to submitted */
    coach_checks_each_entry: boolean
    /** How age is calculated for category matching */
    age_cutoff_rule: AgeCutoffRule
    /** When true, entries without a photo_url are rejected */
    photo_required: boolean
    max_events_per_athlete: number | null
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

// ─── Applications & Entries ───────────────────────────────────────────────────

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
    generic_checked: boolean
    // Parent portal / review workflow additions
    submitted_by: string | null
    coach_reviewed_by: string | null
    coach_reviewed_at: string | null
    coach_notes: string | null
    org_reviewed_by: string | null
    org_reviewed_at: string | null
    rejection_reason: string | null
    /** QR token for ID card verification. NULL if not approved or revoked. */
    qr_token: string | null
    checked_in_at: string | null
    checked_in_by: string | null
    declared_weight_kg: number | null
    /** Snapshot of category rules at time of submission to prevent retroactive changes */
    category_snapshot: Record<string, unknown> | null
    created_at: string
    updated_at: string
}

// ─── Collaborators ────────────────────────────────────────────────────────────

export interface EventCollaborator {
    id: string
    event_id: string
    user_id: string
    permission: 'read' | 'write'
    email?: string
    full_name?: string | null
    created_at: string
}

export interface DojoCollaborator {
    id: string
    dojo_id: string
    user_id: string
    permission: 'read' | 'write'
    email?: string
    full_name?: string | null
    created_at: string
}

// ─── Misc Public Tables ────────────────────────────────────────────────────────

export interface Contact {
    id: string
    name: string
    email: string
    message: string
    status: 'unread' | 'read' | 'archived'
    created_at: string
}

// ─── New Tables (added in Parent Portal migration) ────────────────────────────

export interface OtpCode {
    id: string
    email: string
    code_hash: string
    expires_at: string
    attempts: number
    used: boolean
    ip_address: string | null
    created_at: string
}

export interface AuthRateLimit {
    key: string
    count: number
    reset_at: string
}

export interface AuditLog {
    id: string
    actor_type: AuditActorType
    actor_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    details: Record<string, unknown> | null
    ip_address: string | null
    created_at: string
}

// ─── View / Query Shapes ──────────────────────────────────────────────────────

/**
 * Flattened shape returned by the organiser entries query.
 * Includes joined data from entries, students, dojos, categories, event_days, users.
 */
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
    generic_checked?: boolean
    // Parent portal additions
    submitted_by: string | null
    rejection_reason: string | null
    qr_token: string | null
    student_name: string
    student_rank: string | null
    student_gender: string
    student_weight: number | null
    student_dob: string | null
    student_registration_no: string | null
    student_is_active?: boolean
    student_photo_url?: string | null
    dojo_name: string | null
    category_name: string | null
    event_day_name: string | null
    event_day_date: string | null
    coach_name: string | null
    coach_email: string
    organizer_id: string
    event_level?: string | null
    registration_close_date?: string | null
    temporary_registration_closes_at?: string | null
    // Source of entry: 'coach' or 'parent'
    entry_source?: 'coach' | 'parent'
}
