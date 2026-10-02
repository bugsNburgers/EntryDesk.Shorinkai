type EventRegistrationState = {
    end_date?: string | Date | null
    is_registration_open?: boolean | null
    registration_close_date?: string | Date | null
    temporary_registration_closes_at?: string | Date | null
}

export function toIsoDate(val: string | Date | null | undefined): string | null {
    if (!val) return null
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10)
    }
    if (typeof val === 'string') {
        return val.slice(0, 10)
    }
    if (typeof (val as any)?.toISOString === 'function') {
        return (val as any).toISOString().slice(0, 10)
    }
    return String(val).slice(0, 10)
}

export function isRegistrationClosed(
    event: EventRegistrationState,
    todayIso: string = new Date().toISOString().slice(0, 10)
) {
    const endDate = toIsoDate(event.end_date)
    const isPastEvent = !!endDate && endDate < todayIso
    const manuallyClosed = event.is_registration_open === false
    const closeDate = toIsoDate(event.registration_close_date)
    const closedByDate = !!closeDate && closeDate < todayIso

    // Temporary bursts override everything
    if (event.temporary_registration_closes_at) {
        const tempCloseTime = new Date(event.temporary_registration_closes_at).getTime()
        const nowTime = new Date().getTime()
        
        if (!isNaN(tempCloseTime) && tempCloseTime > nowTime) {
            // Unconditionally open if within the burst window
            return false
        }
    }

    return isPastEvent || manuallyClosed || closedByDate
}
