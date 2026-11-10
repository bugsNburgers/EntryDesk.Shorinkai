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

/** Parses a DB date / ISO string / Date to a UTC Date (date-only strings stay on their calendar day). */
function toUtcDate(value: string | Date): Date | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    const iso = normalizeDobToIso(value) || value
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? null : d
}

function ddmmyyyyUtc(date: Date): string {
    return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
}

// All user-facing dates are DD/MM/YYYY (owner decision 09/11/2026). The "Long" names are kept for compatibility.

export function formatDobLong(dobValue: string | Date | null | undefined): string | null {
    if (!dobValue) return null
    const date = toUtcDate(dobValue)
    return date ? ddmmyyyyUtc(date) : null
}

export function formatTournamentDateRangeLong(
    startDate: string | Date,
    endDate: string | Date
): string {
    const start = toUtcDate(startDate)
    const end = toUtcDate(endDate)
    if (!start || !end) return ''
    const a = ddmmyyyyUtc(start)
    const b = ddmmyyyyUtc(end)
    return a === b ? a : `${a} – ${b}`
}

export function formatCloseDateBadge(closeDate: string | Date | null | undefined): string | null {
    if (!closeDate) return null
    const date = toUtcDate(closeDate)
    return date ? ddmmyyyyUtc(date) : null
}

/** Whole days from today (UTC calendar) until the given date-only value. Negative when it has passed. */
export function daysUntil(value: string | Date | null | undefined, today: Date = new Date()): number | null {
    if (!value) return null
    const date = toUtcDate(value)
    if (!date) return null
    const a = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    const b = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    return Math.round((a - b) / 86400000)
}

/** "57 days left", "Last day today", "1 day left", or "Closed". */
export function daysLeftText(value: string | Date | null | undefined, today: Date = new Date()): string | null {
    const n = daysUntil(value, today)
    if (n === null) return null
    if (n < 0) return 'Closed'
    if (n === 0) return 'Last day today'
    return n === 1 ? '1 day left' : `${n} days left`
}

/** Weekday name for a date-only value, e.g. "Sunday". */
export function weekdayName(value: string | Date | null | undefined): string {
    if (!value) return ''
    const date = toUtcDate(value)
    if (!date) return ''
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()]
}

export function formatSubmittedTimestamp(val: string | Date | null | undefined): string {
    if (!val) return '—'
    const date = typeof val === 'string' ? new Date(val) : val
    if (isNaN(date.getTime())) return '—'
    // Shown in India time regardless of server timezone, so server and browser render the same text.
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    return `${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')}`
}

export function formatStepDate(val: string | Date | null | undefined): string {
    if (!val) return ''
    const date = typeof val === 'string' ? new Date(val) : val
    if (isNaN(date.getTime())) return ''
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric',
    }).formatToParts(date)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    return `${get('day')}/${get('month')}/${get('year')}`
}
