'use server'

import { requireRole } from '@/lib/auth/require-role'
import { redirect } from 'next/navigation'
import { assertUserRateLimit } from '@/lib/security/action-rate-limit'
import { type RateLimitPolicy } from '@/lib/security/rate-limit'

const EVENT_DELETE_POLICY: RateLimitPolicy = {
    name: 'action-event-delete',
    limit: 5,
    window: '10 m',
}

const EVENT_UPDATE_POLICY: RateLimitPolicy = {
    name: 'action-event-update',
    limit: 20,
    window: '1 m',
}

export async function deleteEvent(formData: FormData) {
    const eventIdValue = formData.get('eventId')
    const eventId = typeof eventIdValue === 'string' ? eventIdValue : ''

    if (!eventId) {
        throw new Error('Missing eventId')
    }

    const { supabase, user } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })
    await assertUserRateLimit(EVENT_DELETE_POLICY, user.id, ['delete', eventId])

    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, organizer_id')
        .eq('id', eventId)
        .single()

    if (eventError || !event) {
        throw new Error('Event not found')
    }

    if (event.organizer_id !== user.id) {
        throw new Error('Not authorized to delete this event')
    }

    const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId)

    if (deleteError) {
        throw new Error(deleteError.message)
    }

    redirect('/dashboard/events')
}

export async function updateEventSettings(eventId: string, data: { title?: string; location?: string; is_registration_open?: boolean; is_public?: boolean }) {
    if (!eventId) throw new Error('Missing eventId')

    const { supabase, user } = await requireRole(['organizer', 'admin'])
    await assertUserRateLimit(EVENT_UPDATE_POLICY, user.id, ['update', eventId])

    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, organizer_id')
        .eq('id', eventId)
        .single()

    if (eventError || !event) throw new Error('Event not found')

    if (event.organizer_id !== user.id) {
        throw new Error('Not authorized to edit this event')
    }

    const { error: updateError } = await supabase
        .from('events')
        .update(data)
        .eq('id', eventId)

    if (updateError) throw new Error(updateError.message)

    return { success: true }
}
