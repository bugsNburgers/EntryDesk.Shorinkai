import React from 'react'

// Moved verbatim from id-card-preview.tsx (printed output must stay pixel-identical:
// fixed colours here are intentional).

export interface IdCardData {
    id: string
    status?: string
    chest_no: number | null
    registration_no?: string | null
    created_at?: string | null
    participation_type: string | null
    category_name: string | null
    category_snapshot?: any
    declared_weight_kg?: number | null
    student: {
        name: string
        gender: string
        rank: string | null
        photo_url: string | null
        dob?: string | null
        weight?: number | null
        phone?: string | null
        school_or_city?: string | null
    }
    dojo: {
        name: string
        coach_name: string | null
        city?: string | null
    }
    event: {
        id?: string
        title: string
        location: string | null
        start_date: string
        end_date: string
    }
    emergency_contact?: {
        name?: string | null
        phone?: string | null
    } | null
    registration?: {
        email?: string | null
        phone?: string | null
    } | null
    qr: {
        token?: string
        verify_url: string
        data_url: string
    }
}

// ─── Formatters & Helpers ────────────────────────────────────────────────────

export function formatEventDates(startDate?: string | null, endDate?: string | null): string {
    if (!startDate) return '[DD] – [DD] [Month] 2026'
    try {
        const s = new Date(startDate)
        const e = endDate ? new Date(endDate) : s
        const sDay = s.getDate()
        const eDay = e.getDate()
        const sMonth = s.toLocaleDateString('en-IN', { month: 'short' })
        const eMonth = e.toLocaleDateString('en-IN', { month: 'short' })
        const year = s.getFullYear()

        if (s.toDateString() === e.toDateString()) {
            return `${sDay} ${sMonth} ${year}`
        }
        if (sMonth === eMonth && s.getFullYear() === e.getFullYear()) {
            return `${sDay} – ${eDay} ${sMonth} ${year}`
        }
        return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`
    } catch {
        return '[DD] – [DD] [Month] 2026'
    }
}

export function formatDob(dob?: string | null): string {
    if (!dob) return '[DD/MM/YYYY]'
    try {
        const d = new Date(dob)
        if (isNaN(d.getTime())) return dob
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    } catch {
        return dob
    }
}

export function formatRegistrationDateTime(dateStr?: string | null): { date: string; time: string } {
    if (!dateStr) {
        return { date: '[DD Mon YYYY]', time: '[HH:MM]' }
    }
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return { date: '[DD Mon YYYY]', time: '[HH:MM]' }
        const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        return { date, time }
    } catch {
        return { date: '[DD Mon YYYY]', time: '[HH:MM]' }
    }
}

export function getAgeCategory(data: IdCardData): string {
    if (data.category_name) {
        const cat = data.category_name.toLowerCase()
        if (cat.includes('cadet')) return 'Cadet'
        if (cat.includes('junior')) return 'Junior'
        if (cat.includes('senior')) return 'Senior'
        if (cat.includes('sub-junior') || cat.includes('sub junior')) return 'Sub-Junior'
        if (cat.includes('u-') || cat.includes('u21')) return 'U-21'
        return data.category_name.split(' ')[0] || 'Cadet'
    }
    if (data.student.dob) {
        const birth = new Date(data.student.dob)
        const ageDiffMs = Date.now() - birth.getTime()
        const age = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000))
        if (age < 14) return 'Sub-Junior'
        if (age <= 15) return 'Cadet'
        if (age <= 17) return 'Junior'
        if (age <= 20) return 'U-21'
        return 'Senior'
    }
    return '[Cadet]'
}

export function getCategorySubtitle(data: IdCardData, forA4 = false): string {
    const ageCat = getAgeCategory(data)
    const gender = data.student.gender
        ? data.student.gender.toLowerCase() === 'female'
            ? 'Girls'
            : 'Boys'
        : 'Boys'
    
    const weightVal = data.declared_weight_kg || data.student.weight
    const weight = weightVal ? `U-${Math.ceil(Number(weightVal))} kg` : 'U-47 kg'
    
    let belt = data.student.rank || 'Brown'
    if (forA4) {
        belt = belt.toLowerCase().includes('belt') ? belt : `${belt} belt`
    }
    
    return `${ageCat} · ${gender} · ${weight} · ${belt}`
}

// ─── Reusable QR Definition ──────────────────────────────────────────────────

export function QrSymbolDef() {
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <symbol id="qr" viewBox="0 0 21 21">
                <rect x=".5" y=".5" width="6" height="6" fill="none" stroke="currentColor" />
                <rect x="2" y="2" width="3" height="3" fill="currentColor" />
                <rect x="14.5" y=".5" width="6" height="6" fill="none" stroke="currentColor" />
                <rect x="16" y="2" width="3" height="3" fill="currentColor" />
                <rect x=".5" y="14.5" width="6" height="6" fill="none" stroke="currentColor" />
                <rect x="2" y="16" width="3" height="3" fill="currentColor" />
                <path
                    fill="currentColor"
                    d="M8 1h2v1H8zM11 2h1v2h-1zM8 4h1v2H8zM10 5h2v1h-2zM0 8h2v1H0zM3 9h1v2H3zM5 8h2v1H5zM8 8h1v1H8zM10 9h2v1h-2zM13 8h2v2h-2zM16 9h1v1h-1zM18 8h3v1h-3zM2 11h2v1H2zM6 10h1v2H6zM9 11h1v3H9zM12 11h1v1h-1zM15 12h2v1h-2zM18 11h1v2h-1zM8 15h2v1H8zM11 14h1v2h-1zM14 15h2v2h-2zM17 14h1v1h-1zM19 16h2v1h-2zM8 18h1v2H8zM10 19h2v1h-2zM13 18h1v3h-1zM16 19h2v1h-2zM19 18h2v1h-2z"
                />
            </symbol>
        </svg>
    )
}
