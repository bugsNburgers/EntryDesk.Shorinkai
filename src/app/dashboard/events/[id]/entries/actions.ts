'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function updateEntryStatus(entryId: string, status: 'approved' | 'rejected') {
    const { user, role } = await requireRole(['organizer', 'admin'])

    // Strictly enforce that entry's event is managed by this organizer
    const updated = await sql<{ event_id: string }[]>`
        UPDATE entries e
        SET status = ${status}, updated_at = NOW()
        FROM events ev
        WHERE e.id = ${entryId}
          AND e.event_id = ev.id
          ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
        RETURNING e.event_id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized or entry not found')
    }

    const eventId = updated[0].event_id
    revalidatePath(`/dashboard/events/${eventId}/entries`)
    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true }
}

export async function bulkUpdateEntryStatus(entryIds: string[], status: 'approved' | 'rejected') {
    const { user, role } = await requireRole(['organizer', 'admin'])
    if (!entryIds || entryIds.length === 0) return { success: true }

    // Atomic bulk update strictly scoped to events managed by this organizer
    const updated = await sql<{ event_id: string }[]>`
        UPDATE entries e
        SET status = ${status}, updated_at = NOW()
        FROM events ev
        WHERE e.id = ANY(${entryIds}::uuid[])
          AND e.event_id = ev.id
          AND e.status != 'draft'
          ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
        RETURNING DISTINCT e.event_id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized or no eligible entries to update')
    }

    updated.forEach((r) => {
        revalidatePath(`/dashboard/events/${r.event_id}/entries`)
        revalidatePath(`/dashboard/events/${r.event_id}`)
    })

    return { success: true }
}

export async function exportEventEntries(
    eventId: string,
    searchParams: { q?: string; status?: string; coach?: string; day?: string }
) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    const q = searchParams.q?.trim()
    const status = searchParams.status
    const coach = searchParams.coach
    const day = searchParams.day

    const data = await sql<
        {
            student_name: string
            student_rank: string | null
            student_weight: number | null
            dojo_name: string | null
            category_name: string | null
            event_day_name: string | null
            participation_type: string | null
            status: string
            coach_name: string | null
            coach_email: string
            created_at: string
        }[]
    >`
        SELECT 
            s.name AS student_name,
            s.rank AS student_rank,
            s.weight AS student_weight,
            d.name AS dojo_name,
            c.name AS category_name,
            ed.name AS event_day_name,
            e.participation_type,
            e.status,
            p.full_name AS coach_name,
            p.email AS coach_email,
            e.created_at
        FROM entries e
        JOIN events ev ON e.event_id = ev.id
        JOIN students s ON e.student_id = s.id
        LEFT JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN event_days ed ON e.event_day_id = ed.id
        JOIN users p ON e.coach_id = p.id
        WHERE e.event_id = ${eventId}
          AND e.status != 'draft'
          ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
          ${q ? sql`AND s.name ILIKE ${'%' + q + '%'}` : sql``}
          ${status && status !== 'all' ? sql`AND e.status = ${status}` : sql``}
          ${coach && coach !== 'all' ? sql`AND e.coach_id = ${coach}` : sql``}
          ${day && day !== 'all' ? sql`AND e.event_day_id = ${day}` : sql``}
        ORDER BY e.created_at DESC
    `

    return data.map((e) => ({
        'Student Name': e.student_name,
        'Rank/Belt': e.student_rank || '-',
        'Weight': e.student_weight ? `${e.student_weight} kg` : '-',
        'Dojo': e.dojo_name || '-',
        'Category': e.category_name || '-',
        'Event Day': e.event_day_name || '-',
        'Participation Type': e.participation_type || '-',
        'Status': e.status,
        'Coach Name': e.coach_name || '-',
        'Coach Email': e.coach_email,
        'Date Applied': new Date(e.created_at).toLocaleDateString(),
    }))
}
