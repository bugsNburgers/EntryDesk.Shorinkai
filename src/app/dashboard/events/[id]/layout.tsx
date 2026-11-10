import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { formatDateRangeStable } from '@/lib/date'
import { RegistrationDeadline } from '@/components/events/registration-deadline'
import { requireRole } from '@/lib/auth/require-role'
import { notFound } from 'next/navigation'
import sql from '@/lib/db'
import type { Event } from '@/types/database'

export default async function EventLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { user, role } = await requireRole(['organizer', 'admin', 'coach'], { redirectTo: '/dashboard' })

    const events = await sql<Event[]>`
        SELECT * FROM events
        WHERE id = ${id}
          ${role === 'coach' ? sql`` : role !== 'admin' ? sql`AND organizer_id = ${user.id}` : sql``}
        LIMIT 1
    `

    if (events.length === 0) {
        notFound()
    }

    // For coaches, CoachDashboard already provides its own complete header and toolbar
    if (role === 'coach') {
        return <>{children}</>
    }

    const event = events[0]

    return (
        <div className="space-y-5">
            <div>
                <Link href="/dashboard/events" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    All events
                </Link>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
                <p className="mt-1 text-base text-muted-foreground">
                    {formatDateRangeStable(event.start_date, event.end_date)}
                    {event.location ? ` · ${event.location}` : ''}
                </p>
                <RegistrationDeadline event={event} className="mt-1" />
            </div>

            {children}
        </div>
    )
}
