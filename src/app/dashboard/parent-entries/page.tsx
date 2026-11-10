// ============================================================================
// EntryDesk — old coach review queue URL.
// Since 09/11/2026 coaches check entries in ONE place: the event's entries page
// (/dashboard/events/<id>/entries), which has phone cards and labelled buttons.
// This URL stays because the coach digest email links to it: it sends the coach to
// the first event that has entries waiting, or to the coach home.
// The server actions in ./actions.ts are still used by the event entries page.
// ============================================================================

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export default async function CoachParentEntriesPage({
    searchParams,
}: {
    searchParams: Promise<{ event_id?: string; status?: string }>
}) {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const { event_id: eventId, status } = await searchParams
    const target = status ?? 'pending_coach'
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (eventId && uuidRe.test(eventId)) {
        redirect(`/dashboard/events/${eventId}/entries?status=${encodeURIComponent(target)}`)
    }

    const rows = await sql<{ event_id: string }[]>`
        SELECT e.event_id
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        JOIN events ev ON ev.id = e.event_id
        WHERE d.coach_id = ${user.id} AND e.status = 'pending_coach'
        ORDER BY ev.start_date ASC
        LIMIT 1
    `
    if (rows[0]) redirect(`/dashboard/events/${rows[0].event_id}/entries?status=pending_coach`)
    redirect('/dashboard')
}
