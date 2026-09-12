'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function updateApplicationStatus(applicationId: string, status: 'approved' | 'rejected') {
    const { user, role } = await requireRole(['organizer', 'admin'])

    // Security check: strictly enforce that application's event belongs to this organizer
    const updated = await sql<{ event_id: string }[]>`
        UPDATE event_applications a
        SET status = ${status}
        FROM events ev
        WHERE a.id = ${applicationId}
          AND a.event_id = ev.id
          ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
        RETURNING a.event_id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized: Application not found or event not managed by you')
    }

    const eventId = updated[0].event_id
    revalidatePath('/dashboard/approvals')
    revalidatePath(`/dashboard/events/${eventId}/approvals`)
    revalidatePath(`/dashboard/events/${eventId}`)

    return { success: true }
}
