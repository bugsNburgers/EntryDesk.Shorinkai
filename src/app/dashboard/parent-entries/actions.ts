'use server'

// ============================================================================
// EntryDesk — Coach Parent Entries Review Actions
// Server actions for coaches reviewing parent-submitted tournament entries.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { audit, AUDIT_ACTIONS } from '@/lib/audit'
import { isRegistrationClosed } from '@/lib/events/registration'

async function getClientIp(): Promise<string> {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Coach forwards a single parent entry to the organiser.
 * Sets status from 'pending_coach' (or 'correction_needed') -> 'submitted'.
 */
export async function coachForwardEntry(
    entryId: string
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const ip = await getClientIp()

    if (!uuidRe.test(entryId)) {
        return { error: 'Invalid entry ID.' }
    }

    // Verify coach owns this entry (either coach_id matches or coach of the dojo)
    const rows = await sql<{ id: string; student_id: string; event_id: string; status: string }[]>`
        SELECT e.id, e.student_id, e.event_id, e.status
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        WHERE e.id = ${entryId}
          AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
        LIMIT 1
    `

    if (!rows.length) {
        return { error: 'Entry not found or unauthorized.' }
    }

    const entry = rows[0]

    await sql`
        UPDATE entries
        SET status = 'submitted',
            coach_notes = NULL,
            updated_at = NOW()
        WHERE id = ${entryId}
    `

    audit({
        actorType: 'coach',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_COACH_FORWARDED,
        entityType: 'entry',
        entityId: entryId,
        details: {
            previous_status: entry.status,
            event_id: entry.event_id,
            student_id: entry.student_id,
        },
        ipAddress: ip,
    }).catch(console.error)

    revalidatePath('/dashboard/parent-entries')
    revalidatePath(`/dashboard/entries/${entry.event_id}`)
    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${entry.student_id}`)
    revalidatePath(`/parent/children/${entry.student_id}`)
    revalidatePath(`/athlete/entries/${entryId}`)
    revalidatePath(`/parent/entries/${entryId}`)

    return { success: true }
}

/**
 * Coach forwards multiple parent entries to the organiser in bulk.
 */
export async function coachBulkForwardEntries(
    entryIds: string[]
): Promise<{ success?: boolean; count?: number; error?: string }> {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const ip = await getClientIp()

    const validIds = entryIds.filter((id) => uuidRe.test(id))
    if (!validIds.length) {
        return { error: 'No valid entries selected.' }
    }

    // Update verified entries belonging to this coach
    const updated = await sql<{ id: string; student_id: string; event_id: string }[]>`
        UPDATE entries e
        SET status = 'submitted',
            coach_notes = NULL,
            updated_at = NOW()
        FROM students s, dojos d
        WHERE e.student_id = s.id
          AND s.dojo_id = d.id
          AND e.id = ANY(${validIds})
          AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
          AND e.status IN ('pending_coach', 'correction_needed')
        RETURNING e.id, e.student_id, e.event_id
    `

    for (const item of updated) {
        audit({
            actorType: 'coach',
            actorId: user.id,
            action: AUDIT_ACTIONS.ENTRY_COACH_FORWARDED,
            entityType: 'entry',
            entityId: item.id,
            details: {
                bulk: true,
                event_id: item.event_id,
                student_id: item.student_id,
            },
            ipAddress: ip,
        }).catch(console.error)
    }

    revalidatePath('/dashboard/parent-entries')
    revalidatePath('/dashboard/entries')
    revalidatePath('/athlete')
    revalidatePath('/parent')

    return { success: true, count: updated.length }
}

/**
 * Coach sends an entry back to the parent for corrections.
 * Sets status = 'correction_needed' and attaches coach_notes.
 */
export async function coachRequestCorrection(
    entryId: string,
    notes: string
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const ip = await getClientIp()

    if (!uuidRe.test(entryId)) {
        return { error: 'Invalid entry ID.' }
    }

    if (!notes || notes.trim().length < 3) {
        return { error: 'Please provide a clear reason for the requested correction.' }
    }

    const rows = await sql<{ id: string; student_id: string; event_id: string }[]>`
        SELECT e.id, e.student_id, e.event_id
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        WHERE e.id = ${entryId}
          AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
        LIMIT 1
    `

    if (!rows.length) {
        return { error: 'Entry not found or unauthorized.' }
    }

    const entry = rows[0]

    await sql`
        UPDATE entries
        SET status = 'correction_needed',
            qr_token = NULL,
            coach_notes = ${notes.trim()},
            updated_at = NOW()
        WHERE id = ${entryId}
    `

    audit({
        actorType: 'coach',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_COACH_SENT_BACK,
        entityType: 'entry',
        entityId: entryId,
        details: {
            reason: notes.trim(),
            event_id: entry.event_id,
            student_id: entry.student_id,
        },
        ipAddress: ip,
    }).catch(console.error)

    revalidatePath('/dashboard/parent-entries')
    revalidatePath(`/dashboard/entries/${entry.event_id}`)
    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${entry.student_id}`)
    revalidatePath(`/parent/children/${entry.student_id}`)
    revalidatePath(`/athlete/entries/${entryId}`)
    revalidatePath(`/parent/entries/${entryId}`)

    return { success: true }
}

/**
 * Coach declines an entry submitted by a parent.
 * Sets status = 'coach_declined' and attaches reason.
 */
export async function coachDeclineEntry(
    entryId: string,
    reason: string
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const ip = await getClientIp()

    if (!uuidRe.test(entryId)) {
        return { error: 'Invalid entry ID.' }
    }

    if (!reason || reason.trim().length < 3) {
        return { error: 'Please provide a reason for declining this entry.' }
    }

    const rows = await sql<{ id: string; student_id: string; event_id: string }[]>`
        SELECT e.id, e.student_id, e.event_id
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        WHERE e.id = ${entryId}
          AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
        LIMIT 1
    `

    if (!rows.length) {
        return { error: 'Entry not found or unauthorized.' }
    }

    const entry = rows[0]

    await sql`
        UPDATE entries
        SET status = 'coach_declined',
            qr_token = NULL,
            coach_notes = ${reason.trim()},
            rejection_reason = ${reason.trim()},
            updated_at = NOW()
        WHERE id = ${entryId}
    `

    audit({
        actorType: 'coach',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_COACH_DECLINED,
        entityType: 'entry',
        entityId: entryId,
        details: {
            reason: reason.trim(),
            event_id: entry.event_id,
            student_id: entry.student_id,
        },
        ipAddress: ip,
    }).catch(console.error)

    revalidatePath('/dashboard/parent-entries')
    revalidatePath(`/dashboard/entries/${entry.event_id}`)
    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${entry.student_id}`)
    revalidatePath(`/parent/children/${entry.student_id}`)
    revalidatePath(`/athlete/entries/${entryId}`)
    revalidatePath(`/parent/entries/${entryId}`)

    return { success: true }
}

/**
 * Coach withdraws an entry from the organiser before the tournament deadline.
 * Works even after organiser approval, provided tournament registration deadline has not passed.
 */
export async function coachWithdrawEntry(
    entryId: string,
    reason: string
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const ip = await getClientIp()

    if (!uuidRe.test(entryId)) {
        return { error: 'Invalid entry ID.' }
    }

    if (!reason || reason.trim().length < 3) {
        return { error: 'Please provide a reason for withdrawing this entry.' }
    }

    const rows = await sql<{
        id: string
        student_id: string
        event_id: string
        status: string
        is_registration_open: boolean
        registration_close_date: string | Date | null
        end_date: string | Date
    }[]>`
        SELECT e.id, e.student_id, e.event_id, e.status,
               ev.is_registration_open, ev.registration_close_date, ev.end_date
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        JOIN events ev ON e.event_id = ev.id
        WHERE e.id = ${entryId}
          AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
        LIMIT 1
    `

    if (!rows.length) {
        return { error: 'Entry not found or unauthorized.' }
    }

    const entry = rows[0]

    // Coach can withdraw before the deadline
    const todayIso = new Date().toISOString().slice(0, 10)
    if (isRegistrationClosed(entry, todayIso)) {
        return { error: 'Tournament registration deadline has passed. Entries cannot be withdrawn from the organiser.' }
    }

    await sql`
        UPDATE entries
        SET status = 'withdrawn',
            qr_token = NULL,
            coach_notes = ${reason.trim()},
            rejection_reason = ${reason.trim()},
            updated_at = NOW()
        WHERE id = ${entryId}
    `

    audit({
        actorType: 'coach',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_WITHDRAWN,
        entityType: 'entry',
        entityId: entryId,
        details: {
            reason: reason.trim(),
            event_id: entry.event_id,
            student_id: entry.student_id,
            action: 'coach_withdrawn_before_deadline',
        },
        ipAddress: ip,
    }).catch(console.error)

    revalidatePath('/dashboard/parent-entries')
    revalidatePath(`/dashboard/entries/${entry.event_id}`)
    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${entry.student_id}`)
    revalidatePath(`/parent/children/${entry.student_id}`)
    revalidatePath(`/athlete/entries/${entryId}`)
    revalidatePath(`/parent/entries/${entryId}`)

    return { success: true }
}
