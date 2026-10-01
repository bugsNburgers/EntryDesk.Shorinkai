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
    weight: number | null
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

/**
 * Calculates age on tournament day (today).
 * Indian national championships typically use Jan 1 of tournament year,
 * but we default to "today" as a reasonable estimate.
 */
function calcAge(dob: string): number {
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
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

export function calculateCategory(student: StudentProfile): CalculatedCategory {
    const genderLabel = student.gender.toLowerCase() === 'male' ? 'Boys' : 'Girls'

    let ageYears: number | null = null
    let ageGroup: string | null = null

    if (student.date_of_birth) {
        try {
            ageYears = calcAge(student.date_of_birth)
            ageGroup = getAgeGroup(ageYears)
        } catch {
            // malformed DOB
        }
    }

    let weightClass: string | null = null
    if (student.weight && ageYears !== null) {
        weightClass = getWeightClass(student.weight, ageYears, student.gender)
    }

    const parts = [ageGroup, genderLabel, weightClass].filter(Boolean)
    const displayName = parts.length > 0 ? parts.join(' · ') : 'Category will be assigned by organiser'

    return { ageGroup, genderLabel, weightClass, displayName, ageYears }
}
