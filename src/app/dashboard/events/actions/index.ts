'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function createEvent(formData: FormData) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    const requestedOrganizer = role === 'admin' ? formData.get('organizer_id') : null
    let organizerId = user.id
    if (requestedOrganizer) {
        const [organizer] = await sql<{ id: string }[]>`
            SELECT id FROM users WHERE id = ${String(requestedOrganizer)} AND role = 'organizer' AND is_active
        `
        if (!organizer) throw new Error('Choose an active organiser.')
        organizerId = organizer.id
    }

    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || null
    const event_type = formData.get('event_type') as 'tournament' | 'seminar' | 'test'
    const location = (formData.get('location') as string)?.trim() || null
    const start_date = formData.get('start_date') as string // YYYY-MM-DD
    const end_date = formData.get('end_date') as string // YYYY-MM-DD
    const registration_close_date = (formData.get('registration_close_date') as string) || null
    const level = (formData.get('event_level') as string) || 'district'
    const is_public = !requestedOrganizer && formData.get('is_public') === 'on'

    if (!title || !start_date || !end_date || !event_type) {
        throw new Error('Title, dates, and event type are required')
    }

    const duration = Date.parse(end_date) - Date.parse(start_date)
    if (!Number.isFinite(duration) || duration < 0 || duration > 30 * 86400000 ||
        !['tournament', 'seminar', 'test'].includes(event_type)) {
        throw new Error('Choose a valid event type and date range of up to 31 days.')
    }

    const result = await sql.begin(async (tx) => {
        if (role === 'organizer') {
            const [allowed] = await tx`
                SELECT id FROM users
                WHERE id = ${user.id} AND role = 'organizer' AND is_active AND can_create_events
                FOR UPDATE
            `
            if (!allowed) throw new Error('Event creation is disabled. Contact your administrator.')
        }

        const existing = await tx<{ id: string }[]>`
            SELECT id FROM events
            WHERE organizer_id = ${organizerId}
              AND lower(title) = lower(${title})
              AND event_type = ${event_type}
              AND start_date = ${start_date}
              AND end_date = ${end_date}
              AND lower(COALESCE(location, '')) = lower(COALESCE(${location}, ''))
            LIMIT 1
        `

        if (existing.length) return { eventId: existing[0].id, duplicatePrevented: true }

        const [newEvent] = await tx<{ id: string }[]>`
            INSERT INTO events (
                title, 
                description, 
                event_type,
                level,
                location, 
                start_date, 
                end_date,
                registration_close_date,
                is_public, 
                organizer_id,
                is_registration_open
            )
            VALUES (
                ${title}, 
                ${description}, 
                ${event_type},
                ${level},
                ${location}, 
                ${start_date}, 
                ${end_date}, 
                ${registration_close_date},
                ${is_public}, 
                ${organizerId},
                ${!requestedOrganizer}
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

        if (requestedOrganizer) {
            await tx`
                INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id)
                VALUES ('admin', ${user.id}, 'event.created', 'event', ${newEvent.id})
            `
        }

        return { eventId: newEvent.id, duplicatePrevented: false }
    })

    revalidatePath('/dashboard/events')
    revalidatePath('/dashboard', 'layout')
    return { success: true, ...result }
}
