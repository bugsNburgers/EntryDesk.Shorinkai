'use server'

import { requireRole } from '@/lib/auth/require-role'
import { redirect } from 'next/navigation'
import sql from '@/lib/db'

export async function deleteEvent(formData: FormData) {
    const eventIdValue = formData.get('eventId')
    const eventId = typeof eventIdValue === 'string' ? eventIdValue : ''

    if (!eventId) {
        throw new Error('Missing eventId')
    }

    const { user } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })

    // Strict ownership verification in SQL
    const deleted = await sql`
        DELETE FROM events
        WHERE id = ${eventId} AND organizer_id = ${user.id}
        RETURNING id
    `

    if (deleted.length === 0) {
        throw new Error('Unauthorized or event not found')
    }

    redirect('/dashboard/events')
}

export async function updateEventSettings(
    eventId: string,
    data: { title?: string; location?: string; is_registration_open?: boolean }
) {
    if (!eventId) throw new Error('Missing eventId')

    const { user } = await requireRole(['organizer', 'admin'])

    // Strict ownership check and update in SQL
    const updated = await sql`
        UPDATE events
        SET 
            title = CASE WHEN ${data.title !== undefined} THEN ${data.title ?? null} ELSE title END,
            location = CASE WHEN ${data.location !== undefined} THEN ${data.location ?? null} ELSE location END,
            is_registration_open = CASE WHEN ${data.is_registration_open !== undefined} THEN ${data.is_registration_open ?? null} ELSE is_registration_open END
        WHERE id = ${eventId} AND organizer_id = ${user.id}
        RETURNING id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized or event not found')
    }

    return { success: true }
}
