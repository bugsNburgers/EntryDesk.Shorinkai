'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function createEvent(formData: FormData) {
    const { user } = await requireRole(['organizer', 'admin'])

    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || null
    const event_type = formData.get('event_type') as 'tournament' | 'seminar' | 'test'
    const location = (formData.get('location') as string)?.trim() || null
    const start_date = formData.get('start_date') as string // YYYY-MM-DD
    const end_date = formData.get('end_date') as string // YYYY-MM-DD
    const is_public = formData.get('is_public') === 'on'

    if (!title || !start_date || !end_date || !event_type) {
        throw new Error('Title, dates, and event type are required')
    }

    // Check for existing duplicate event within 2 minutes
    const existing = await sql<{ id: string }[]>`
        SELECT id FROM events
        WHERE organizer_id = ${user.id}
          AND lower(title) = lower(${title})
          AND event_type = ${event_type}
          AND start_date = ${start_date}
          AND end_date = ${end_date}
          AND lower(COALESCE(location, '')) = lower(COALESCE(${location}, ''))
        LIMIT 1
    `

    if (existing.length > 0) {
        revalidatePath('/dashboard/events')
        return { success: true, eventId: existing[0].id, duplicatePrevented: true }
    }

    // Insert Event in a transaction and generate event days automatically
    const [event] = await sql.begin(async (tx) => {
        const [newEvent] = await tx<{ id: string }[]>`
            INSERT INTO events (
                title, 
                description, 
                event_type, 
                location, 
                start_date, 
                end_date, 
                is_public, 
                organizer_id
            )
            VALUES (
                ${title}, 
                ${description}, 
                ${event_type}, 
                ${location}, 
                ${start_date}, 
                ${end_date}, 
                ${is_public}, 
                ${user.id}
            )
            RETURNING id
        `

        // Bulk insert all event days using PostgreSQL generate_series
        await tx`
            INSERT INTO event_days (event_id, date, name)
            SELECT 
                ${newEvent.id},
                d::date,
                'Day ' || ROW_NUMBER() OVER (ORDER BY d)
            FROM generate_series(${start_date}::date, ${end_date}::date, '1 day'::interval) AS d
        `

        return [newEvent]
    })

    revalidatePath('/dashboard/events')
    revalidatePath('/dashboard', 'layout')
    return { success: true, eventId: event.id }
}
