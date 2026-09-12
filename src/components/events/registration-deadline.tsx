import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

import { isRegistrationClosed } from '@/lib/events/registration'

type RegistrationDeadlineProps = {
    event: {
        end_date?: string | null
        is_registration_open?: boolean | null
        registration_close_date?: string | null
        temporary_registration_closes_at?: string | null
    }
    todayIso?: string
    isPastEvent?: boolean
    className?: string
}

function formatDate(dateValue: string) {
    const iso = dateValue.slice(0, 10)
    const [year, month, day] = iso.split('-')

    if (!year || !month || !day) {
        return dateValue
    }

    return `${day}/${month}/${year}`
}

export function RegistrationDeadline({
    event,
    todayIso,
    isPastEvent = false,
    className,
}: RegistrationDeadlineProps) {
    if (isPastEvent || (event.end_date && event.end_date < (todayIso ?? new Date().toISOString().slice(0, 10)))) {
        return null
    }

    const today = todayIso ?? new Date().toISOString().slice(0, 10)
    const isClosed = isRegistrationClosed(event, today)
    const isOpen = !isClosed

    if (isOpen && !event.registration_close_date && !event.temporary_registration_closes_at) {
        return null
    }

    if (!isOpen && !event.registration_close_date && !event.temporary_registration_closes_at && event.is_registration_open !== false) {
        return null
    }

    return (
        <div className={cn('flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground', className)}>
            <Circle
                className={cn(
                    'h-2.5 w-2.5 shrink-0',
                    isOpen ? 'fill-emerald-500 text-emerald-500' : 'fill-red-500 text-red-500'
                )}
            />
            <span className="truncate whitespace-nowrap">
                {isOpen ? (
                    <>
                        <span className="font-medium">
                            {event.temporary_registration_closes_at ? 'Registration Closes Temporarily:' : 'Reg. Deadline:'}
                        </span>{' '}
                        {event.temporary_registration_closes_at 
                            ? new Date(event.temporary_registration_closes_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : event.registration_close_date ? formatDate(event.registration_close_date) : ''}
                    </>
                ) : (
                    <>
                        <span className="font-medium text-red-500">Reg. Deadline passed:</span>{' '}
                        <span className="text-red-500">
                             {event.registration_close_date ? formatDate(event.registration_close_date) : '(date unknown)'}
                        </span>
                    </>
                )}
            </span>
        </div>
    )
}
