import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportEntries } from '@/components/events/export-entries'
import { EntriesTable } from '@/components/events/entries-table'
import { EntryFilters } from '@/components/events/entry-filters'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { CoachDashboard } from '@/components/coach/coach-dashboard'
import { isRegistrationClosed, toIsoDate } from '@/lib/events/registration'
import { notFound } from 'next/navigation'
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
                        'name', s.name, 
                        'gender', s.gender, 
                        'rank', s.rank, 
                        'weight', s.weight, 
                        'date_of_birth', s.date_of_birth, 
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

    const page = Math.max(1, Number(p.page) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    const q = p.q?.trim()
    const status = p.status
    const coach = p.coach
    const day = p.day

    // Parallel fetch: entries, count, coaches filter, days filter
    const [rawEntries, countResult, coaches, formattedDays] = await Promise.all([
        sql<
            {
                id: string
                event_id: string
                status: string
                participation_type: string | null
                chest_no: number | null
                student_name: string
                student_rank: string | null
                student_weight: number | null
                student_registration_no: string | null
                student_photo: string | null
                dojo_name: string | null
                category_name: string | null
                event_day_name: string | null
                coach_name: string | null
                coach_email: string
            }[]
        >`
            SELECT 
                e.id,
                e.event_id,
                e.status,
                e.participation_type,
                e.chest_no,
                s.name AS student_name,
                s.rank AS student_rank,
                s.weight AS student_weight,
                s.registration_no AS student_registration_no,
                s.photo_url AS student_photo,
                d.name AS dojo_name,
                c.name AS category_name,
                ed.name AS event_day_name,
                p.full_name AS coach_name,
                p.email AS coach_email
            FROM entries e
            JOIN events ev ON e.event_id = ev.id
            JOIN students s ON e.student_id = s.id
            LEFT JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN event_days ed ON e.event_day_id = ed.id
            JOIN users p ON e.coach_id = p.id
            WHERE e.event_id = ${id}
              AND e.status != 'draft'
              ${q ? sql`AND s.name ILIKE ${'%' + q + '%'}` : sql``}
              ${status && status !== 'all' ? sql`AND e.status = ${status}` : sql``}
              ${coach && coach !== 'all' ? sql`AND e.coach_id = ${coach}` : sql``}
              ${day && day !== 'all' ? sql`AND e.event_day_id = ${day}` : sql``}
            ORDER BY e.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count
            FROM entries e
            JOIN students s ON e.student_id = s.id
            WHERE e.event_id = ${id}
              AND e.status != 'draft'
              ${q ? sql`AND s.name ILIKE ${'%' + q + '%'}` : sql``}
              ${status && status !== 'all' ? sql`AND e.status = ${status}` : sql``}
              ${coach && coach !== 'all' ? sql`AND e.coach_id = ${coach}` : sql``}
              ${day && day !== 'all' ? sql`AND e.event_day_id = ${day}` : sql``}
        `,
        sql<{ id: string; name: string }[]>`
            SELECT DISTINCT e.coach_id AS id, COALESCE(p.full_name, p.email) AS name
            FROM entries e
            JOIN users p ON e.coach_id = p.id
            WHERE e.event_id = ${id} AND e.status != 'draft'
            ORDER BY name ASC
        `,
        sql<{ id: string; name: string }[]>`
            SELECT id, name
            FROM event_days
            WHERE event_id = ${id}
            ORDER BY date ASC
        `,
    ])

    const totalCount = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    // Map to nested structure expected by EntriesTable component
    const entries = rawEntries.map((e) => ({
        id: e.id,
        event_id: e.event_id,
        status: e.status,
        participation_type: e.participation_type,
        chest_no: e.chest_no,
        students: {
            name: e.student_name,
            rank: e.student_rank,
            weight: e.student_weight,
            registration_no: e.student_registration_no,
            photo_url: e.student_photo,
            dojos: e.dojo_name ? { name: e.dojo_name } : null,
        },
        categories: e.category_name ? { name: e.category_name } : null,
        event_days: e.event_day_name ? { name: e.event_day_name } : null,
        profiles: {
            full_name: e.coach_name,
            email: e.coach_email,
        },
    }))

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle>Entries</CardTitle>
                            <p className="text-sm text-muted-foreground">{totalCount} records</p>
                        </div>
                        <ExportEntries eventId={id} searchParams={p} />
                    </div>
                    <EntryFilters 
                        coaches={coaches} 
                        eventDays={formattedDays.map((d) => ({ id: d.id, name: d.name || 'Day' }))} 
                    />
                </CardHeader>
                <CardContent className="p-0">
                    <EntriesTable entries={entries} />
                </CardContent>
            </Card>

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
