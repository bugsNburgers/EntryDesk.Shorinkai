// ============================================================================
// EntryDesk — Central Entry Status Map
// ALWAYS use this map to render status labels and colors.
// NEVER render raw DB values (draft, pending_coach, etc.) in the UI.
// ============================================================================

export const ENTRY_STATUS_MAP = {
    draft: {
        label: 'Draft',
        coachLabel: 'Draft (not sent)',
        parentVisible: false,
        color: 'gray',
        bgClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    pending_coach: {
        label: 'Waiting for coach',
        coachLabel: 'Waiting for your review',
        parentVisible: true,
        color: 'yellow',
        bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    submitted: {
        label: 'Waiting for organiser',
        coachLabel: 'Sent to organiser',
        parentVisible: true,
        color: 'yellow',
        bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    correction_needed: {
        label: 'Please correct and send again',
        coachLabel: 'Sent back for correction',
        parentVisible: true,
        color: 'orange',
        bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    coach_declined: {
        label: 'Coach did not send it',
        coachLabel: 'You declined this entry',
        parentVisible: true,
        color: 'red',
        bgClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    approved: {
        label: 'Accepted',
        coachLabel: 'Accepted ✓',
        parentVisible: true,
        color: 'green',
        bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    rejected: {
        label: 'Not accepted',
        coachLabel: 'Rejected by organiser',
        parentVisible: true,
        color: 'red',
        bgClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    withdrawn: {
        label: 'Withdrawn',
        coachLabel: 'Withdrawn',
        parentVisible: true,
        color: 'gray',
        bgClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
} as const

export type EntryStatusKey = keyof typeof ENTRY_STATUS_MAP

/**
 * Returns the human-readable label for a given status.
 * @param status - the raw DB status value
 * @param perspective - 'parent' returns parent-friendly labels; 'coach' returns coach labels
 */
export function getStatusLabel(status: string, perspective: 'parent' | 'coach' = 'parent'): string {
    const entry = ENTRY_STATUS_MAP[status as EntryStatusKey]
    if (!entry) return status // fallback: return raw value (should never happen)
    return perspective === 'coach' ? entry.coachLabel : entry.label
}

/**
 * Returns the Tailwind CSS class string for a status badge.
 */
export function getStatusBgClass(status: string): string {
    const entry = ENTRY_STATUS_MAP[status as EntryStatusKey]
    return entry?.bgClass ?? 'bg-gray-100 text-gray-700'
}

/**
 * Returns a user-friendly explanation of what the status means.
 */
export function getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
        draft: 'Draft — not yet submitted.',
        pending_coach: 'Waiting for coach — your coach is checking the registration details.',
        submitted: 'Waiting for organiser — your coach has verified and forwarded this entry to the tournament organiser.',
        correction_needed: 'Please correct and send again — something needs fixing.',
        coach_declined: 'Coach did not send this entry to the organiser.',
        approved: 'Accepted! Registration is confirmed for the tournament.',
        rejected: 'This entry was not accepted by the organiser.',
        withdrawn: 'This entry was withdrawn.',
    }
    return descriptions[status] ?? 'Status updated.'
}

/**
 * Allowed status transitions. Server-side enforcement only.
 * Structure: { from: Set<to> }
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    draft: ['pending_coach', 'submitted', 'withdrawn'],
    pending_coach: ['submitted', 'correction_needed', 'coach_declined', 'draft', 'withdrawn'],
    correction_needed: ['pending_coach', 'submitted', 'withdrawn'],
    submitted: ['approved', 'rejected', 'correction_needed', 'pending_coach', 'withdrawn'],
    approved: ['withdrawn', 'rejected'],
    rejected: [],       // terminal — organiser can only go back via re-approval flow
    coach_declined: [], // terminal from parent's perspective; coach must explicitly re-open
    withdrawn: [],      // terminal
}

/**
 * Checks whether a transition from one status to another is allowed.
 * Throws if the transition is invalid — this is a hard security boundary.
 */
export function assertTransitionAllowed(from: string, to: string): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? []
    if (!allowed.includes(to)) {
        throw new Error(
            `Invalid status transition: ${from} → ${to}. Allowed: [${allowed.join(', ')}]`
        )
    }
}
