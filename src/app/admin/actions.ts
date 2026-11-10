'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { createEvent } from '@/app/dashboard/events/actions'

export async function createStaff(form: FormData) {
    const { user } = await requireRole('admin')
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const name = String(form.get('name') ?? '').trim()
    const role = form.get('role')
    if (!/^[^\s@]+@gmail\.com$/.test(email) || email.length > 254 || !name || name.length > 150 ||
        (role !== 'coach' && role !== 'organizer')) {
        redirect('/admin?notice=invalid-staff')
    }

    const created = await sql`
        WITH added AS (
            INSERT INTO users (email, full_name, role, is_active)
            SELECT ${email}, ${name}, ${role}, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = ${email})
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        )
        INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id)
        SELECT 'admin', ${user.id}, 'user.created', 'user', id FROM added
        RETURNING entity_id
    `
    redirect(created.length ? '/admin?notice=staff-created' : '/admin?notice=email-exists')
}

export async function setStaffAccess(form: FormData) {
    const { user } = await requireRole('admin')
    const id = String(form.get('id') ?? '')
    const active = form.get('active') === 'true'
    const reason = String(form.get('reason') ?? '').trim()
    if (!reason || reason.length > 500) redirect('/admin?notice=reason-required')

    await sql.begin(async (tx) => {
        const changed = await tx`
            UPDATE users SET is_active = ${active}, updated_at = NOW()
            WHERE id = ${id} AND role = 'coach' AND is_active <> ${active}
            RETURNING id
        `
        if (!changed.length) return
        await tx`DELETE FROM sessions WHERE user_id = ${id}`
        await tx`
            INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, details)
            VALUES ('admin', ${user.id}, ${active ? 'user.activated' : 'user.deactivated'}, 'user',
                    ${id}, jsonb_build_object('reason', ${reason}::text))
        `
    })
    revalidatePath('/admin')
}

export async function createOrganizerEvent(form: FormData) {
    await requireRole('admin')
    if (!form.get('organizer_id')) redirect('/admin?notice=invalid-event')
    try {
        await createEvent(form)
    } catch {
        redirect('/admin?notice=invalid-event')
    }
    redirect('/admin?notice=event-created')
}

export async function returnEntryToCoach(form: FormData) {
    const { user } = await requireRole('admin')
    const id = String(form.get('entry_id') ?? '')
    const reason = String(form.get('reason') ?? '').trim()
    if (!reason || reason.length > 500) throw new Error('Enter a reason of up to 500 characters.')

    const changed = await sql`
        WITH returned AS (
            UPDATE entries SET status = 'pending_coach', coach_notes = ${reason}, updated_at = NOW()
            WHERE id = ${id} AND status = 'submitted'
            RETURNING id, event_id
        )
        INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, details)
        SELECT 'admin', ${user.id}, 'entry.returned_to_coach', 'entry', id,
            jsonb_build_object('reason', ${reason}::text, 'event_id', event_id,
                'previous_status', 'submitted', 'status', 'pending_coach')
        FROM returned RETURNING entity_id
    `
    if (!changed.length) throw new Error('Only entries with the organiser can be returned.')
    revalidatePath('/admin')
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/athlete', 'layout')
}

export async function setOrganizerEventCreation(form: FormData) {
    const { user } = await requireRole('admin')
    const id = String(form.get('id') ?? '')
    const enabled = form.get('enabled') === 'true'
    const reason = String(form.get('reason') ?? '').trim()
    if (!reason || reason.length > 500) redirect('/admin?notice=reason-required')

    await sql`
        WITH changed AS (
            UPDATE users SET can_create_events = ${enabled}, updated_at = NOW()
            WHERE id = ${id} AND role = 'organizer' AND can_create_events <> ${enabled}
            RETURNING id
        )
        INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, details)
        SELECT 'admin', ${user.id}, 'user.event_creation_changed', 'user', id,
            jsonb_build_object('enabled', ${enabled}::boolean, 'reason', ${reason}::text)
        FROM changed
    `
    revalidatePath('/admin')
    revalidatePath('/dashboard/events')
}
