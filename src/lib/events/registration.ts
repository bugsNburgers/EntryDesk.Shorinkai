type EventRegistrationState = {
    end_date?: string | null
    is_registration_open?: boolean | null
    registration_close_date?: string | null
    temporary_registration_closes_at?: string | null
}

export function isRegistrationClosed(
    event: EventRegistrationState,
    todayIso: string = new Date().toISOString().slice(0, 10)
) {
    const isPastEvent = !!event.end_date && event.end_date < todayIso
    const manuallyClosed = event.is_registration_open === false
    const closeDate = event.registration_close_date?.slice(0, 10)
    const closedByDate = !!closeDate && closeDate < todayIso

    // Temporary bursts override everything
    if (event.temporary_registration_closes_at) {
        const tempCloseTime = new Date(event.temporary_registration_closes_at).getTime()
        const nowTime = new Date().getTime()
        
        if (tempCloseTime > nowTime) {
            // Unconditionally open if within the burst window
            return false
        }
    }

    return isPastEvent || manuallyClosed || closedByDate
}
