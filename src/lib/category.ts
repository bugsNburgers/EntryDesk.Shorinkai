// ============================================================================
// EntryDesk — Category Auto-Calculator
// Derives a student's tournament category from DOB, gender, belt/rank, weight.
// Used in the parent registration flow and coach dashboard.
// This is INFORMATIONAL — the definitive category assignment is by the organiser.
// ============================================================================

export interface StudentProfile {
    date_of_birth: string | null
    gender: string
    rank: string | null
    weight: number | string | null
}

export interface CalculatedCategory {
    ageGroup: string | null
    genderLabel: string
    weightClass: string | null
    displayName: string
    ageYears: number | null
}

/** Belt rank ordering for weight-class eligibility hint */
const BELT_ORDER: Record<string, number> = {
    white: 0,
    yellow: 1,
    orange: 2,
    green: 3,
    blue: 4,
    purple: 5,
    brown: 6,
    black: 7,
}

function getBeltLevel(rank: string | null): number {
    if (!rank) return -1
    const normalized = rank.toLowerCase().replace(/\s+/g, ' ').trim()
    for (const [belt, level] of Object.entries(BELT_ORDER)) {
        if (normalized.includes(belt)) return level
    }
    return -1
}

export type AgeCutoffRule = 'tournament_day' | 'jan_1'

function parseIsoDate(value: string | Date): { y: number; m: number; d: number } | null {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null
        return { y: value.getUTCFullYear(), m: value.getUTCMonth() + 1, d: value.getUTCDate() }
    }
    const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return null
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

/**
 * The date an athlete's age is measured on for an event.
 * `tournament_day` → the event start date; `jan_1` → 1 January of the start year.
 * Returns an ISO date (YYYY-MM-DD) or null when the start date is unusable.
 */
export function ageReferenceDate(startDate: string | Date | null | undefined, rule: string | null | undefined): string | null {
    if (!startDate) return null
    const p = parseIsoDate(startDate)
    if (!p) return null
    const pad = (n: number) => String(n).padStart(2, '0')
    if (rule === 'jan_1') return `${p.y}-01-01`
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** Whole years between `dob` and `on` (both ISO dates or Dates, compared as UTC calendar dates). */
export function ageOn(dob: string | Date, on: string | Date): number | null {
    const b = parseIsoDate(dob)
    const r = parseIsoDate(on)
    if (!b || !r) return null
    let age = r.y - b.y
    if (r.m < b.m || (r.m === b.m && r.d < b.d)) age--
    return age
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10)
}

/** Maps age to standard WKF/national karate age groups */
function getAgeGroup(age: number): string {
    if (age <= 8) return 'Mini (Under 8)'
    if (age <= 10) return 'Under 10'
    if (age <= 12) return 'Under 12'
    if (age <= 14) return 'Under 14'
    if (age <= 16) return 'Under 16'
    if (age <= 18) return 'Under 18 (Junior)'
    if (age <= 21) return 'Under 21 (Junior)'
    return 'Senior (21+)'
}

/** Maps weight to typical Kumite weight class for given age + gender */
function getWeightClass(weight: number, age: number, gender: string): string {
    const g = gender.toLowerCase()

    // Under 14 — lighter weight classes
    if (age <= 14) {
        if (g === 'male') {
            if (weight <= 25) return '-25 kg'
            if (weight <= 30) return '-30 kg'
            if (weight <= 35) return '-35 kg'
            if (weight <= 40) return '-40 kg'
            if (weight <= 45) return '-45 kg'
            if (weight <= 50) return '-50 kg'
            return '+50 kg'
        } else {
            if (weight <= 25) return '-25 kg'
            if (weight <= 30) return '-30 kg'
            if (weight <= 35) return '-35 kg'
            if (weight <= 40) return '-40 kg'
            if (weight <= 45) return '-45 kg'
            return '+45 kg'
        }
    }

    // Under 21 / Senior — WKF style
    if (g === 'male') {
        if (weight <= 55) return '-55 kg'
        if (weight <= 60) return '-60 kg'
        if (weight <= 67) return '-67 kg'
        if (weight <= 75) return '-75 kg'
        if (weight <= 84) return '-84 kg'
        return '+84 kg'
    } else {
        if (weight <= 50) return '-50 kg'
        if (weight <= 55) return '-55 kg'
        if (weight <= 61) return '-61 kg'
        if (weight <= 68) return '-68 kg'
        return '+68 kg'
    }
}

export interface CategoryOptions {
    /** ISO date the age is measured on (see `ageReferenceDate`). Defaults to today. */
    referenceDate?: string | null
}

export function calculateCategory(student: StudentProfile, options: CategoryOptions = {}): CalculatedCategory {
    const g = (student.gender || '').toLowerCase()
    const genderLabel = g === 'male' ? 'Boys' : g === 'female' ? 'Girls' : 'Open'

    let ageYears: number | null = null
    let ageGroup: string | null = null

    if (student.date_of_birth) {
        ageYears = ageOn(student.date_of_birth, options.referenceDate || todayIso())
        if (ageYears !== null && ageYears >= 0) {
            ageGroup = getAgeGroup(ageYears)
        } else {
            ageYears = null // malformed or future DOB
        }
    }

    let weightClass: string | null = null
    const weight = student.weight == null ? NaN : Number(student.weight)
    if (Number.isFinite(weight) && weight > 0 && ageYears !== null) {
        weightClass = getWeightClass(weight, ageYears, student.gender || '')
    }

    const parts = [ageGroup, genderLabel, weightClass].filter(Boolean)
    const displayName = parts.length > 0 ? parts.join(' · ') : 'Category will be assigned by organiser'

    return { ageGroup, genderLabel, weightClass, displayName, ageYears }
}
