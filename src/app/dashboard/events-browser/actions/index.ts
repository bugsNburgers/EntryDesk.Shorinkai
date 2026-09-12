'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function applyToEvent(eventId: string) {
    const { user } = await requireRole('coach')

    // Verify the event exists
    const eventRows = await sql<{ id: string }[]>`
        SELECT id FROM events WHERE id = ${eventId} LIMIT 1
    `

    if (eventRows.length === 0) {
        return { success: false, message: 'Event not found' }
    }

    // Insert application with atomic conflict handling
    const result = await sql`
        INSERT INTO event_applications (event_id, coach_id, status)
        VALUES (${eventId}, ${user.id}, 'pending')
        ON CONFLICT (event_id, coach_id) DO NOTHING
        RETURNING id
    `

    if (result.length === 0) {
        return { success: false, message: 'Already applied' }
    }

    revalidatePath('/dashboard/events-browser')
    return { success: true }
}
