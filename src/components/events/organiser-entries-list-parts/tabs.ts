// Plain (server + client) module: the organiser list's tab keys and the ?status= mapping.
// Kept out of shared.tsx because that file is 'use client' and the event page (a server component) calls this.

export type OrganiserTab = 'pending' | 'all' | 'approved' | 'rejected' | 'fix'

/** Maps a ?status= value (DB status or tab key) to the organiser list tab. */
export function toOrganiserTab(s?: string | null): OrganiserTab | undefined {
    if (!s) return undefined
    if (s === 'submitted' || s === 'pending') return 'pending'
    if (s === 'approved') return 'approved'
    if (s === 'rejected' || s === 'coach_declined') return 'rejected'
    if (s === 'correction_needed' || s === 'fix') return 'fix'
    if (s === 'all') return 'all'
    return undefined
}
