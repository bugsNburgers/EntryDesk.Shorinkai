'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function createCategory(eventId: string, formData: FormData) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    const name = (formData.get('name') as string)?.trim()
    const gender = formData.get('gender') as string
    const min_age = formData.get('min_age') ? Number(formData.get('min_age')) : null
    const max_age = formData.get('max_age') ? Number(formData.get('max_age')) : null
    const min_weight = formData.get('min_weight') ? Number(formData.get('min_weight')) : null
    const max_weight = formData.get('max_weight') ? Number(formData.get('max_weight')) : null
    const min_rank = formData.get('min_rank') as string
    const max_rank = formData.get('max_rank') as string

    if (!name) {
        throw new Error('Category name is required')
    }

    // Security check: verify this organizer owns the event
    const events = await sql<{ id: string }[]>`
        SELECT id FROM events
        WHERE id = ${eventId}
          ${role !== 'admin' ? sql`AND organizer_id = ${user.id}` : sql``}
        LIMIT 1
    `

    if (events.length === 0) {
        throw new Error('Unauthorized: Event not found or not managed by you')
    }

    await sql`
        INSERT INTO categories (
            event_id,
            name,
            gender,
            min_age,
            max_age,
            min_weight,
            max_weight,
            min_rank,
            max_rank
        )
        VALUES (
            ${eventId},
            ${name},
            ${gender || null},
            ${min_age},
            ${max_age},
            ${min_weight},
            ${max_weight},
            ${min_rank || null},
            ${max_rank || null}
        )
    `

    revalidatePath(`/dashboard/events/${eventId}/categories`)
    return { success: true }
}

export async function updateCategory(categoryId: string, eventId: string, formData: FormData) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    const name = (formData.get('name') as string)?.trim()
    const gender = formData.get('gender') as string
    const min_age = formData.get('min_age') ? Number(formData.get('min_age')) : null
    const max_age = formData.get('max_age') ? Number(formData.get('max_age')) : null
    const min_weight = formData.get('min_weight') ? Number(formData.get('min_weight')) : null
    const max_weight = formData.get('max_weight') ? Number(formData.get('max_weight')) : null
    const min_rank = formData.get('min_rank') as string
    const max_rank = formData.get('max_rank') as string

    if (!name) {
        throw new Error('Category name is required')
    }

    // Security check: strictly enforce that category belongs to an event owned by this organizer
    const updated = await sql`
        UPDATE categories c
        SET 
            name = ${name},
            gender = ${gender || null},
            min_age = ${min_age},
            max_age = ${max_age},
            min_weight = ${min_weight},
            max_weight = ${max_weight},
            min_rank = ${min_rank || null},
            max_rank = ${max_rank || null}
        FROM events ev
        WHERE c.id = ${categoryId}
          AND c.event_id = ev.id
          ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
        RETURNING c.id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized or category not found')
    }

    revalidatePath(`/dashboard/events/${eventId}/categories`)
    return { success: true }
}

export async function deleteCategory(categoryId: string, eventId: string) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    // Security check: strictly enforce event ownership
    const deleted = await sql`
        DELETE FROM categories c
        USING events ev
        WHERE c.id = ${categoryId}
          AND c.event_id = ev.id
          ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
        RETURNING c.id
    `

    if (deleted.length === 0) {
        throw new Error('Unauthorized or category not found')
    }

    revalidatePath(`/dashboard/events/${eventId}/categories`)
    return { success: true }
}
