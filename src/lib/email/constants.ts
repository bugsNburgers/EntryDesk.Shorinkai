// ============================================================================
// EntryDesk — Email Constants
// src/lib/email/constants.ts
// Key status transitions that trigger parent email notifications.
// Intermediate statuses (draft, pending_coach, submitted, withdrawn) NEVER send emails.
// ============================================================================

export const NOTIFIABLE_STATUSES = [
    'approved',
    'rejected',
    'coach_declined',
    'correction_needed',
] as const

export type NotifiableStatus = (typeof NOTIFIABLE_STATUSES)[number]
