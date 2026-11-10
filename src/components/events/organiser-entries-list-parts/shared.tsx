'use client'

// Icons, helpers and types shared by the OrganiserEntriesList parts (moved verbatim from the original file).



export interface OrganiserEntryItem {
    id: string
    entry_id?: string
    event_id: string
    status: string
    participation_type: string | null
    chest_no: number | null
    declared_weight_kg?: number | null
    coach_notes?: string | null
    rejection_reason?: string | null
    created_at?: string
    coach_id: string
    coach_name: string | null
    coach_email: string
    coach_avatar?: string | null
    student_id: string
    student_name: string
    student_gender: string
    student_rank: string | null
    student_weight: number | null
    student_dob: string | null
    student_photo: string | null
    student_registration_no: string | null
    dojo_id?: string | null
    dojo_name: string | null
    category_name: string | null
    event_day_name?: string | null
}

export interface OrganiserEntriesListProps {
    entries: OrganiserEntryItem[]
    eventId: string
    eventTitle?: string
}

// ----------------------------------------------------------------------------
// SVG Icons matching Coach view
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

export function getAppliedTags(entry: OrganiserEntryItem): string[] {
    const tags: string[] = []
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
