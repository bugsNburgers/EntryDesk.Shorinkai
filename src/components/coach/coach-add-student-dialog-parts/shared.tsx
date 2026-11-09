'use client'

// Icons, helpers and types shared by the CoachAddStudentDialog parts (moved verbatim from the original file).



export const BELT_CONFIGS: Record<string, { label: string; hex: string }> = {
    white: { label: 'White Belt', hex: '#E4E4E7' },
    yellow: { label: 'Yellow Belt', hex: '#FACC15' },
    orange: { label: 'Orange Belt', hex: '#F97316' },
    green: { label: 'Green Belt', hex: '#059669' },
    blue: { label: 'Blue Belt', hex: '#2563EB' },
    purple: { label: 'Purple Belt', hex: '#9333EA' },
    brown_3: { label: 'Brown Belt (3rd Kyu)', hex: '#5C3A21' },
    brown_2: { label: 'Brown Belt (2nd Kyu)', hex: '#5C3A21' },
    brown_1: { label: 'Brown Belt (1st Kyu)', hex: '#5C3A21' },
    black_1: { label: 'Black Belt (1st Dan)', hex: '#09090B' },
    black_2: { label: 'Black Belt (2nd Dan)', hex: '#09090B' },
    black_3: { label: 'Black Belt (3rd Dan+)', hex: '#09090B' },
}

export function formatDateLabel(val: any): string {
    if (!val) return ''
    if (typeof val === 'string') return val.slice(0, 10)
    if (val instanceof Date) return val.toISOString().slice(0, 10)
    return String(val).slice(0, 10)
}

export interface CoachAddStudentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: {
        id: string
        title: string
        location?: string | null
        start_date?: string
        event_type?: string | null
        age_cutoff_rule?: string | null
    }
    eventType?: string | null
    eventDays?: { id: string; name?: string; date: any }[]
    dojos: { id: string; name: string }[]
    students: any[]
    existingStudentIds: Set<string>
}
