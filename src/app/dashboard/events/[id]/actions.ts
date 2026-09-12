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

    // Safe deletion check: prevent deletion if active entries exist
    const entryCheck = await sql<{ count: string }[]>`
        SELECT count(*) AS count FROM entries WHERE event_id = ${eventId}
    `
    const entryCount = parseInt(entryCheck[0]?.count || '0', 10)
    if (entryCount > 0) {
        throw new Error(`Cannot delete event: this event has ${entryCount} registered entry/entries. Remove entries before deleting.`)
    }

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
    data: { 
        title?: string
        location?: string
        is_registration_open?: boolean
        is_public?: boolean
        registration_close_date?: string | null
        level?: string
        event_level?: string | null
        temporary_registration_closes_at?: string | null
    }
) {
    if (!eventId) throw new Error('Missing eventId')

    const { user } = await requireRole(['organizer', 'admin'])

    const targetLevel = data.event_level !== undefined ? data.event_level : data.level

    // Strict ownership check and update in SQL (owner or editor collaborator)
    const updated = await sql`
        UPDATE events
        SET 
            title = CASE WHEN ${data.title !== undefined} THEN ${data.title ?? null} ELSE title END,
            location = CASE WHEN ${data.location !== undefined} THEN ${data.location ?? null} ELSE location END,
            is_registration_open = CASE WHEN ${data.is_registration_open !== undefined} THEN ${data.is_registration_open ?? null} ELSE is_registration_open END,
            is_public = CASE WHEN ${data.is_public !== undefined} THEN ${data.is_public ?? null} ELSE is_public END,
            registration_close_date = CASE WHEN ${data.registration_close_date !== undefined} THEN ${data.registration_close_date ?? null} ELSE registration_close_date END,
            level = CASE WHEN ${targetLevel !== undefined} THEN ${targetLevel ?? null} ELSE level END,
            temporary_registration_closes_at = CASE WHEN ${data.temporary_registration_closes_at !== undefined} THEN ${data.temporary_registration_closes_at ?? null} ELSE temporary_registration_closes_at END
        WHERE id = ${eventId} 
          AND (
              organizer_id = ${user.id} 
              OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_id = ${eventId} AND user_id = ${user.id} AND permission = 'write')
          )
        RETURNING id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized or event not found')
    }

    return { success: true }
}
