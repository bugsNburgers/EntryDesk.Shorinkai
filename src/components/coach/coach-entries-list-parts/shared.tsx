'use client'

// Icons, helpers and types shared by the CoachEntriesList parts (moved verbatim from the original file).



export interface CoachEntriesListProps {
    entries: any[]
    eventDays?: any[]
    dojos?: any[]
    eventType?: string | null
    statusPreset?: string
    onStatusChange?: (status: string) => void
    isReadOnly?: boolean
    isRegistrationClosed?: boolean
    eventId?: string
    approvedCount?: number
    onAddStudent?: () => void
}

// ----------------------------------------------------------------------------
// Helper SVGs matching reference designs exactly
// ----------------------------------------------------------------------------

export function CheckmarkSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 14 14">
            <path
                d="M2 7.5l3 3 7-7.5"
                fill="none"
                stroke="#04231e"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
        </svg>
    )
}

export function PillCheckmarkSvg() {
    return (
        <svg width="13" height="13" viewBox="0 0 14 14">
            <path
                d="M2 7.5l3 3 7-7.5"
                fill="none"
                stroke="#2dd4b4"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
        </svg>
    )
}

export function ButtonCheckmarkSvg() {
    return (
        <svg width="13" height="13" viewBox="0 0 14 14">
            <path
                d="M2 7.5l3 3 7-7.5"
                fill="none"
                stroke="#04231e"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
        </svg>
    )
}

export function AvatarPlaceholderSvg() {
    return (
        <svg width="23" height="23" viewBox="0 0 46 46" fill="none" stroke="#8a99ab" strokeWidth="1.6" style={{ display: 'block' }}>
            <circle cx="23" cy="16" r="8" />
            <path d="M6 42c0-10 7-16 17-16s17 6 17 16" />
        </svg>
    )
}

export function AvatarVerifiedBadge() {
    return (
        <span
            style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#2dd4b4',
                border: '2px solid #111a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#04231e" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 1h3v3M4 9H1V6M9 1L6 4M1 9l3-3" />
            </svg>
        </span>
    )
}

export function MenuDownloadSvg() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2v9M5.5 7.5L9 11l3.5-3.5M3 14.5h12" />
        </svg>
    )
}

export function MenuLockSvg() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8a99ab" strokeWidth="1.6" strokeLinecap="round">
            <rect x="3" y="7" width="10" height="7" rx="2" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
        </svg>
    )
}

export function MenuRejectSvg() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="7" />
            <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" />
        </svg>
    )
}

// ----------------------------------------------------------------------------
// Utility formatting functions
// ----------------------------------------------------------------------------

export function getAthleteAge(dob: string | null | undefined): string {
    if (!dob) return '—'
    const birthDate = new Date(dob)
    if (isNaN(birthDate.getTime())) return '—'
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age > 0 ? String(age) : '—'
}

export function formatBelt(rank: string | null | undefined): string {
    if (!rank) return 'White'
    const cleaned = rank.replace(/\bbelts?\b/gi, '').replace(/\s+/g, ' ').trim()
    return cleaned || 'White'
}

export function getAppliedTags(entry: any): string[] {
    const tags: string[] = []
    if (entry.event_days?.name) {
        tags.push(entry.event_days.name)
    }
    const type = (entry.participation_type || '').toLowerCase()
    const catName = (entry.category_name || '').toLowerCase()

    if (type.includes('team') || catName.includes('team')) {
        tags.push('Team Kata')
    }
    if (type.includes('kata') || catName.includes('kata') || type === 'both') {
        if (!tags.includes('Kata') && !tags.includes('Team Kata')) tags.push('Kata')
    }
    if (type.includes('kumite') || catName.includes('kumite') || type === 'both') {
        if (!tags.includes('Kumite')) tags.push('Kumite')
    }
    if (tags.length === 0) {
        if (entry.category_name) {
            tags.push(entry.category_name)
        } else {
            tags.push('Kata')
        }
    }
    return tags
}

export function normalizeCoachStatus(s?: string) {
    if (!s) return 'not_forwarded'
    const lower = s.toLowerCase().trim()
    if (
        lower === 'not_forwarded' ||
        lower === 'pending_submission' ||
        lower === 'pending' ||
        lower === 'pending_coach' ||
        lower === 'draft' ||
        lower === 'correction_needed'
    ) {
        return 'not_forwarded'
    }
    if (lower === 'forwarded' || lower === 'submitted' || lower === 'under_review') {
        return 'forwarded'
    }
    if (lower === 'approved' || lower === 'cleared') {
        return 'approved'
    }
    if (lower === 'rejected' || lower === 'coach_declined' || lower === 'declined') {
        return 'rejected'
    }
    if (lower === 'all') {
        return 'all'
    }
    return 'not_forwarded'
}
