export function excelSerialToIsoDate(serial: number): string | null {
    if (!Number.isFinite(serial)) return null

    // Excel typically stores dates as days since 1899-12-30 (with the 1900 leap-year bug baked in).
    // We only care about the date part.
    const days = Math.floor(serial)
    if (days < 1 || days > 60000) return null

    const excelEpochUtcMs = Date.UTC(1899, 11, 30)
    const dateUtc = new Date(excelEpochUtcMs + days * 86400000)
    return dateUtc.toISOString().slice(0, 10)
}

function pad2(n: number) {
    return String(n).padStart(2, '0')
}

function ymd(y: number, m: number, d: number): string | null {
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
    if (y < 1900 || y > 2100) return null
    if (m < 1 || m > 12) return null
    if (d < 1 || d > 31) return null
    return `${y}-${pad2(m)}-${pad2(d)}`
}

/**
 * Best-effort normalization to ISO date (YYYY-MM-DD).
 * Accepts:
 * - ISO date strings
 * - Excel serial numbers (number or numeric string)
 * - Date objects
 * - DD/MM/YYYY or DD-MM-YYYY (common in IN)
 */
export function normalizeDobToIso(value: unknown): string | null {
    if (value == null) return null

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null
        return value.toISOString().slice(0, 10)
    }

    if (typeof value === 'number') {
        return excelSerialToIsoDate(value)
    }

    const str = String(value).trim()
    if (!str) return null

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

    // Numeric string? Often Excel serial like 39291
    if (/^\d+(?:\.\d+)?$/.test(str)) {
        const asNum = Number(str)
        const iso = excelSerialToIsoDate(asNum)
        if (iso) return iso
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const m = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
    if (m) {
        const day = Number(m[1])
        const month = Number(m[2])
        const year = Number(m[3])
        return ymd(year, month, day)
    }

    return null
}

function formatIsoDateParts(isoDate: string): string {
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
}

export function formatDateStable(value: string | Date): string {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return ''
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC' }).format(value)
    }

    const normalized = String(value).trim()
    if (!normalized) return ''

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return formatIsoDateParts(normalized)
    }

    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) return normalized

    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC' }).format(parsed)
}

export function formatDateRangeStable(startDate: string | Date, endDate: string | Date): string {
    const start = formatDateStable(startDate)
    const end = formatDateStable(endDate)
    return start === end ? start : `${start} – ${end}`
}

export function calculateAge(dobValue: string | Date | null | undefined): string | null {
    if (!dobValue) return null
    let date: Date
    if (typeof dobValue === 'string') {
        const iso = normalizeDobToIso(dobValue) || dobValue
        date = new Date(iso)
    } else {
        date = dobValue
    }
    if (isNaN(date.getTime())) return null

    const today = new Date()
    let age = today.getUTCFullYear() - date.getUTCFullYear()
    const monthDiff = today.getUTCMonth() - date.getUTCMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < date.getUTCDate())) {
        age--
    }
    if (age <= 0) return '< 1 year'
    return `${age} ${age === 1 ? 'year' : 'years'}`
}

export function formatDobLong(dobValue: string | Date | null | undefined): string | null {
    if (!dobValue) return null
    let date: Date
    if (typeof dobValue === 'string') {
        const iso = normalizeDobToIso(dobValue) || dobValue
        date = new Date(iso)
    } else {
        date = dobValue
    }
    if (isNaN(date.getTime())) return null

    const day = String(date.getUTCDate()).padStart(2, '0')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getUTCMonth()]
    const year = date.getUTCFullYear()
    return `${day} ${month} ${year}`
}

export function formatTournamentDateRangeLong(
    startDate: string | Date,
    endDate: string | Date
): string {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const startDay = String(start.getUTCDate()).padStart(2, '0')
    const endDay = String(end.getUTCDate()).padStart(2, '0')
    const startMonth = months[start.getUTCMonth()]
    const endMonth = months[end.getUTCMonth()]
    const startYear = start.getUTCFullYear()
    const endYear = end.getUTCFullYear()

    if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
        return `${startDay} ${startMonth} ${startYear}`
    }

    if (startMonth === endMonth && startYear === endYear) {
        return `${startDay} – ${endDay} ${startMonth} ${startYear}`
    }

    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`
}

export function formatCloseDateBadge(closeDate: string | Date | null | undefined): string | null {
    if (!closeDate) return null
    let date: Date
    if (typeof closeDate === 'string') {
        const iso = normalizeDobToIso(closeDate) || closeDate
        date = new Date(iso)
    } else {
        date = closeDate
    }
    if (isNaN(date.getTime())) return null

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = months[date.getUTCMonth()]
    return `${day} ${month}`
}

export function formatSubmittedTimestamp(val: string | Date | null | undefined): string {
    if (!val) return '—'
    const date = typeof val === 'string' ? new Date(val) : val
    if (isNaN(date.getTime())) return '—'

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    return `${day} ${month} ${year}, ${hours}:${mins}`
}

export function formatStepDate(val: string | Date | null | undefined): string {
    if (!val) return ''
    const date = typeof val === 'string' ? new Date(val) : val
    if (isNaN(date.getTime())) return ''

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
}
