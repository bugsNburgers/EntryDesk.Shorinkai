// ============================================================================
// EntryDesk — Central Entry Status Map
// ALWAYS use this map to render status labels and colors.
// NEVER render raw DB values (draft, pending_coach, etc.) in the UI.
// ============================================================================

// ONE word per stage, the same for parent, coach and organiser (owner decision 09/11/2026).
// Every stage also has its own icon (see components/ui/status-badge.tsx) so colour is never the only signal.
//   With coach → With organiser → Accepted   (or Needs a fix / Not accepted / Withdrawn)
// `coachLabel` is kept for API compatibility and is deliberately identical to `label`.

export type StatusIcon = 'draft' | 'clock' | 'send' | 'check' | 'pencil' | 'x' | 'minus'

export const ENTRY_STATUS_MAP = {
    draft: {
        label: 'Not sent',
        coachLabel: 'Not sent',
        parentVisible: false,
        color: 'gray',
        icon: 'draft' as StatusIcon,
        bgClass: 'bg-[var(--status-draft-bg)] text-[var(--status-draft-fg)]',
    },
    pending_coach: {
        label: 'With coach',
        coachLabel: 'With coach',
        parentVisible: true,
        color: 'yellow',
        icon: 'clock' as StatusIcon,
        bgClass: 'bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]',
    },
    submitted: {
        label: 'With organiser',
        coachLabel: 'With organiser',
        parentVisible: true,
        color: 'blue',
        icon: 'send' as StatusIcon,
        bgClass: 'bg-[var(--status-org-bg)] text-[var(--status-org-fg)]',
    },
    correction_needed: {
        label: 'Needs a fix',
        coachLabel: 'Needs a fix',
        parentVisible: true,
        color: 'orange',
        icon: 'pencil' as StatusIcon,
        bgClass: 'bg-[var(--status-rejected-bg)] text-[var(--status-rejected-fg)]',
    },
    coach_declined: {
        label: 'Not accepted',
        coachLabel: 'Not accepted',
        parentVisible: true,
        color: 'gray',
        icon: 'x' as StatusIcon,
        bgClass: 'bg-[var(--status-closed-bg)] text-[var(--status-closed-fg)]',
    },
    approved: {
        label: 'Accepted',
        coachLabel: 'Accepted',
        parentVisible: true,
        color: 'green',
        icon: 'check' as StatusIcon,
        bgClass: 'bg-[var(--status-approved-bg)] text-[var(--status-approved-fg)]',
    },
    rejected: {
        label: 'Not accepted',
        coachLabel: 'Not accepted',
        parentVisible: true,
        color: 'gray',
        icon: 'x' as StatusIcon,
        bgClass: 'bg-[var(--status-closed-bg)] text-[var(--status-closed-fg)]',
    },
    withdrawn: {
        label: 'Withdrawn',
        coachLabel: 'Withdrawn',
        parentVisible: true,
        color: 'gray',
        icon: 'minus' as StatusIcon,
        bgClass: 'bg-[var(--status-draft-bg)] text-[var(--status-draft-fg)]',
    },
} as const

export type EntryStatusKey = keyof typeof ENTRY_STATUS_MAP

/** The four stages shown as filter boxes everywhere, in this order. */
export const STAGE_FILTERS = [
    { key: 'pending_coach', label: 'With coach' },
    { key: 'submitted', label: 'With organiser' },
    { key: 'approved', label: 'Accepted' },
    { key: 'correction_needed', label: 'Needs a fix' },
] as const

/**
 * Returns the human-readable label for a given status.
 * The perspective argument is kept for compatibility; every role sees the same word.
 */
export function getStatusLabel(status: string, perspective: 'parent' | 'coach' = 'parent'): string {
    const entry = ENTRY_STATUS_MAP[status as EntryStatusKey]
    if (!entry) return status // fallback: return raw value (should never happen)
    return perspective === 'coach' ? entry.coachLabel : entry.label
}

/** Returns the icon name for a status (used by StatusBadge). */
export function getStatusIcon(status: string): StatusIcon {
    return ENTRY_STATUS_MAP[status as EntryStatusKey]?.icon ?? 'minus'
}

/**
 * Returns the Tailwind CSS class string for a status badge.
 */
export function getStatusBgClass(status: string): string {
    const entry = ENTRY_STATUS_MAP[status as EntryStatusKey]
    return entry?.bgClass ?? 'bg-muted text-muted-foreground'
}

/**
 * Returns a short, plain explanation of what the status means (parent-facing).
 */
export function getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
        draft: 'Not sent yet.',
        pending_coach: 'Your coach is checking the details.',
        submitted: 'Your coach sent it to the organiser. The organiser will accept it.',
        correction_needed: 'Something needs to be fixed. Change it and send again.',
        coach_declined: 'Your coach did not send this entry.',
        approved: 'Accepted. The chest number and ID card are ready.',
        rejected: 'The organiser did not accept this entry.',
        withdrawn: 'This entry was cancelled.',
    }
    return descriptions[status] ?? 'Updated.'
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
