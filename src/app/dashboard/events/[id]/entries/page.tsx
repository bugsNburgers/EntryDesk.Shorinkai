import { requireRole } from '@/lib/auth/require-role'
import { CoachDashboard } from '@/components/coach/coach-dashboard'
import { isRegistrationClosed, toIsoDate } from '@/lib/events/registration'
import { redirect, notFound } from 'next/navigation'
import sql from '@/lib/db'
import type { Event, EventDay, Dojo } from '@/types/database'

export default async function EventEntriesPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ q?: string; status?: string; coach?: string; day?: string; page?: string }>
}) {
    const { id } = await params
    const { user, role } = await requireRole(['organizer', 'admin', 'coach'], { redirectTo: '/dashboard' })
    const p = await searchParams

    // =========================================================================
    // COACH FLOW: Render full CoachDashboard with tournament entries table
    // =========================================================================
    if (role === 'coach') {
        const [eventRows, appRows, students, entries, eventDays, dojos] = await Promise.all([
            sql<Event[]>`
                SELECT * FROM events WHERE id = ${id} LIMIT 1
            `,
            sql<{ status: string }[]>`
                SELECT status FROM event_applications
                WHERE event_id = ${id} AND coach_id = ${user.id}
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
                    photo_url: string | null
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
                    s.photo_url,
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
                    e.submitted_by,
                    e.coach_notes,
                    e.rejection_reason,
                    e.declared_weight_kg,
                    COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
                    e.created_at,
                    pu.full_name AS parent_name,
                    pu.email AS parent_email,
                    s.phone AS parent_phone,
                    json_build_object(
                        'id', s.id, 
                        'name', CASE WHEN e.status = 'draft' THEN s.name ELSE COALESCE(e.snap_name, s.name) END, 
                        'gender', CASE WHEN e.status = 'draft' THEN s.gender ELSE COALESCE(e.snap_gender, s.gender) END, 
                        'rank', CASE WHEN e.status = 'draft' THEN s.rank ELSE COALESCE(e.snap_rank, s.rank) END, 
                        'weight', CASE WHEN e.status = 'draft' THEN s.weight ELSE COALESCE(e.declared_weight_kg, s.weight) END, 
                        'date_of_birth', CASE WHEN e.status = 'draft' THEN s.date_of_birth ELSE COALESCE(e.snap_dob, s.date_of_birth) END, 
                        'school_or_city', CASE WHEN e.status = 'draft' THEN s.school_or_city ELSE COALESCE(e.snap_school_or_city, s.school_or_city) END,
                        'dojo_id', s.dojo_id, 
                        'dojo_name', d.name,
                        'registration_no', s.registration_no,
                        'photo_url', s.photo_url,
                        'is_active', s.is_active,
                        'parent_id', s.parent_id
                    ) AS students,
                    CASE WHEN ed.id IS NOT NULL THEN json_build_object('id', ed.id, 'name', ed.name, 'date', ed.date) ELSE NULL END AS event_days
                FROM entries e
                JOIN students s ON e.student_id = s.id
                JOIN dojos d ON s.dojo_id = d.id
                LEFT JOIN categories c ON e.category_id = c.id
                LEFT JOIN event_days ed ON e.event_day_id = ed.id
                LEFT JOIN users pu ON s.parent_id = pu.id
                WHERE e.event_id = ${id}
                  AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
                ORDER BY 
                    CASE WHEN e.status = 'pending_coach' THEN 0 WHEN e.status = 'correction_needed' THEN 1 ELSE 2 END,
                    e.created_at DESC
            `,
            sql<EventDay[]>`
                SELECT * FROM event_days WHERE event_id = ${id} ORDER BY date ASC
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

        // Verify coach is approved for this event OR is the event organizer
        const isOrganizer = event.organizer_id === user.id
        if (!isOrganizer && (appRows.length === 0 || appRows[0].status !== 'approved')) {
            return (
                <div className="p-8 text-center text-red-600 font-medium">
                    Access Denied: You are not approved to submit entries for this event.
                </div>
            )
        }

        const validEntries = entries || []
        const todayIso = new Date().toISOString().slice(0, 10)
        const endDateIso = toIsoDate(event.end_date)
        const isPastEvent = endDateIso ? endDateIso < todayIso : false
        const isLocked = isRegistrationClosed(event, todayIso)

        const stats = {
            total: validEntries.length,
            draft: validEntries.filter((e) => e.status === 'draft').length,
            pending_coach: validEntries.filter((e) => e.status === 'pending_coach' || e.status === 'correction_needed').length,
            submitted: validEntries.filter((e) => e.status === 'submitted').length,
            approved: validEntries.filter((e) => e.status === 'approved').length,
            rejected: validEntries.filter((e) => e.status === 'rejected' || e.status === 'coach_declined').length,
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
                initialStatus={p?.status}
            />
        )
    }

    // =========================================================================
    // ORGANIZER FLOW:
    // =========================================================================
    // Security check: Verify event ownership or collaborator access
    const events = await sql<{ id: string }[]>`
        SELECT id FROM events
        WHERE id = ${id}
          ${role !== 'admin' ? sql`AND (organizer_id = ${user.id} OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_id = ${id} AND user_id = ${user.id}))` : sql``}
        LIMIT 1
    `

    if (events.length === 0) {
        notFound()
    }

    // Since 09/11/2026 the organiser works from ONE page: the event page has the count boxes, labelled
    // Accept / Don't accept buttons and phone cards. Keep this URL working (emails, bookmarks).
    redirect(`/dashboard/events/${id}${p.status ? `?status=${encodeURIComponent(p.status)}` : ''}`)
}
