import { cn } from '@/lib/utils'

import { isRegistrationClosed, toIsoDate } from '@/lib/events/registration'
import { daysLeftText } from '@/lib/date'

type RegistrationDeadlineProps = {
    event: {
        end_date?: string | Date | null
        is_registration_open?: boolean | null
        registration_close_date?: string | Date | null
        temporary_registration_closes_at?: string | Date | null
    }
    todayIso?: string
    isPastEvent?: boolean
    className?: string
}

function formatDate(dateValue: string | Date | null | undefined) {
    if (!dateValue) return ''
    const iso = toIsoDate(dateValue)
    if (!iso) return String(dateValue)
    const [year, month, day] = iso.split('-')

    if (!year || !month || !day) {
        return iso
    }

    return `${day}/${month}/${year}`
}

export function RegistrationDeadline({
    event,
    todayIso,
    isPastEvent = false,
    className,
}: RegistrationDeadlineProps) {
    const today = todayIso ?? new Date().toISOString().slice(0, 10)
    const endDateIso = toIsoDate(event.end_date)
    if (isPastEvent || (endDateIso && endDateIso < today)) {
        return null
    }

    const isClosed = isRegistrationClosed(event, today)
    const isOpen = !isClosed

    if (isOpen && !event.registration_close_date && !event.temporary_registration_closes_at) {
        return null
    }

    if (!isOpen && !event.registration_close_date && !event.temporary_registration_closes_at && event.is_registration_open !== false) {
        return null
    }

    const closeIso = event.registration_close_date ? toIsoDate(event.registration_close_date) : null
    const left = closeIso ? daysLeftText(closeIso) : null

    return (
        <div className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 text-[15px]', className)}>
            {isOpen ? (
                event.temporary_registration_closes_at ? (
                    <span className="font-semibold text-[var(--status-pending-fg)]">
                        Entries close today at{' '}
                        {new Date(event.temporary_registration_closes_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </span>
                ) : (
                    <span className="font-semibold text-[var(--status-pending-fg)]">
                        Last day to enter: {formatDate(event.registration_close_date)}
                        {left ? ` · ${left}` : ''}
                    </span>
                )
            ) : (
                <span className="font-semibold text-[var(--status-closed-fg)]">
                    Entries closed{event.registration_close_date ? ` on ${formatDate(event.registration_close_date)}` : ''}
                </span>
            )}
        </div>
    )
}
