import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportEntries } from '@/components/events/export-entries'
import { EntriesTable } from '@/components/events/entries-table'
import { EntryFilters } from '@/components/events/entry-filters'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { notFound } from 'next/navigation'
import sql from '@/lib/db'

export default async function EventEntriesPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ q?: string; status?: string; coach?: string; day?: string; page?: string }>
}) {
    const { id } = await params
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })
    const p = await searchParams

    // Security check: Verify event ownership
    const events = await sql<{ id: string }[]>`
        SELECT id FROM events
        WHERE id = ${id}
          ${role !== 'admin' ? sql`AND organizer_id = ${user.id}` : sql``}
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
