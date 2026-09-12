import { requireRole } from '@/lib/auth/require-role'
import { CoachDashboard } from '@/components/coach/coach-dashboard'
import { notFound } from 'next/navigation'
import { isRegistrationClosed } from '@/lib/events/registration'
import sql from '@/lib/db'
import type { Event, EventDay, Dojo } from '@/types/database'

export default async function EventEntriesPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params
    const { user } = await requireRole('coach', { redirectTo: '/dashboard' })

    // Parallel fetch: Event, Application check, Students, Entries, EventDays, Dojos
    const [eventRows, appRows, students, entries, eventDays, dojos] = await Promise.all([
        sql<Event[]>`
            SELECT * FROM events WHERE id = ${eventId} LIMIT 1
        `,
        sql<{ status: string }[]>`
            SELECT status FROM event_applications
            WHERE event_id = ${eventId} AND coach_id = ${user.id}
            LIMIT 1
        `,
        sql<
            {
                id: string
                name: string
                gender: string
                rank: string | null
                weight: number | null
                date_of_birth: string | null
                dojo_id: string
                registration_no: string | null
                is_active: boolean
                created_at: string
                dojos: { id: string; name: string; coach_id: string }
            }[]
        >`
            SELECT 
                s.id,
                s.name,
                s.gender,
                s.rank,
                s.weight,
                s.date_of_birth,
                s.dojo_id,
                s.registration_no,
                s.is_active,
                s.created_at,
                json_build_object('id', d.id, 'name', d.name, 'coach_id', d.coach_id) AS dojos
            FROM students s
            JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN dojo_collaborators dc ON d.id = dc.dojo_id AND dc.user_id = ${user.id}
            WHERE d.coach_id = ${user.id} OR dc.user_id = ${user.id}
            ORDER BY s.name ASC
        `,
        sql<any[]>`
            SELECT 
                e.id,
                e.event_id,
                e.coach_id,
                e.student_id,
                e.category_id,
                e.event_day_id,
                e.participation_type,
                e.status,
                e.chest_no,
                e.generic_checked,
                e.created_at,
                json_build_object(
                    'id', s.id, 
                    'name', s.name, 
                    'gender', s.gender, 
                    'rank', s.rank, 
                    'weight', s.weight, 
                    'date_of_birth', s.date_of_birth, 
                    'dojo_id', s.dojo_id, 
                    'registration_no', s.registration_no,
                    'is_active', s.is_active
                ) AS students,
                CASE WHEN ed.id IS NOT NULL THEN json_build_object('name', ed.name) ELSE NULL END AS event_days
            FROM entries e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN event_days ed ON e.event_day_id = ed.id
            WHERE e.event_id = ${eventId} AND e.coach_id = ${user.id}
            ORDER BY e.created_at DESC
        `,
        sql<EventDay[]>`
            SELECT * FROM event_days WHERE event_id = ${eventId} ORDER BY date ASC
        `,
        sql<Dojo[]>`
            SELECT DISTINCT d.id, d.coach_id, d.name, d.created_at 
            FROM dojos d 
            LEFT JOIN dojo_collaborators dc ON d.id = dc.dojo_id AND dc.user_id = ${user.id}
            WHERE d.coach_id = ${user.id} OR dc.user_id = ${user.id}
            ORDER BY d.name ASC
        `,
    ])

    if (eventRows.length === 0) {
        notFound()
    }

    const event = eventRows[0]

    // Verify coach is approved for this event
    if (appRows.length === 0 || appRows[0].status !== 'approved') {
        return (
            <div className="p-8 text-center text-red-600 font-medium">
                Access Denied: You are not approved to submit entries for this event.
            </div>
        )
    }

    const validEntries = entries || []
    const todayIso = new Date().toISOString().slice(0, 10)
    const isPastEvent = event.end_date ? event.end_date < todayIso : false
    const isLocked = isRegistrationClosed(event, todayIso)

    const stats = {
        total: validEntries.length,
        draft: validEntries.filter((e) => e.status === 'draft').length,
        submitted: validEntries.filter((e) => e.status === 'submitted').length,
        approved: validEntries.filter((e) => e.status === 'approved').length,
    }

    return (
        <CoachDashboard
            event={event}
            eventType={event.event_type}
            stats={stats}
            entries={validEntries}
            students={students || []}
            eventDays={eventDays || []}
            dojos={dojos || []}
            isPastEvent={isPastEvent}
            isRegistrationClosed={isLocked}
        />
    )
}
