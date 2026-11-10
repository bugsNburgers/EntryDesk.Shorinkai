'use server'

import { formatStepDate } from '@/lib/date'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { generateQrToken } from '@/lib/qr'
import { audit, AUDIT_ACTIONS } from '@/lib/audit'
import { toRingFlowRows, type RingFlowRow, type RingFlowSourceEntry } from '@/lib/export/ringflow'

export async function updateEntryStatus(
    entryId: string,
    status: 'approved' | 'rejected',
    reason?: string
) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    if (status !== 'approved' && status !== 'rejected') throw new Error('Invalid decision')

    // Strictly enforce that entry's event is managed by this organizer or write collaborator
    const updated = await sql<{ event_id: string; student_id: string }[]>`
        UPDATE entries e
        SET status = ${status},
            updated_at = NOW(),
            rejection_reason = CASE
                WHEN ${status} = 'rejected' THEN COALESCE(${reason?.trim() ?? null}, e.rejection_reason)
                WHEN ${status} = 'approved' THEN NULL
                ELSE e.rejection_reason
            END,
            qr_token = CASE
                WHEN ${status} = 'approved' THEN COALESCE(e.qr_token, ${generateQrToken()})
                WHEN ${status} = 'rejected' THEN NULL
                ELSE e.qr_token
            END
        FROM events ev
        WHERE e.id = ${entryId}
          AND e.event_id = ev.id
          AND (e.status = 'submitted'
               OR (${status} = 'approved' AND e.status = 'rejected' AND e.generic_checked)
               OR (${status} = 'rejected' AND e.status = 'approved'))
          ${role !== 'admin' ? sql`AND (ev.organizer_id = ${user.id} OR EXISTS (SELECT 1 FROM event_collaborators ec WHERE ec.event_id = ev.id AND ec.user_id = ${user.id} AND ec.permission = 'write'))` : sql``}
        RETURNING e.event_id, e.student_id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized or entry not found')
    }

    const { event_id: eventId, student_id: studentId } = updated[0]

    // Audit log
    audit({
        actorType: role === 'admin' ? 'admin' : 'organizer',
        actorId: user.id,
        action: status === 'approved' ? AUDIT_ACTIONS.ENTRY_APPROVED : AUDIT_ACTIONS.ENTRY_REJECTED,
        entityType: 'entry',
        entityId: entryId,
        details: {
            event_id: eventId,
            student_id: studentId,
            reason: reason?.trim() || null,
        },
    }).catch(console.error)

    // Revalidate parent-facing pages so they reflect the new status immediately
    revalidatePath(`/dashboard/events/${eventId}/entries`)
    revalidatePath(`/dashboard/events/${eventId}`)
    revalidatePath('/athlete')
    revalidatePath(`/athlete/${studentId}`)
    revalidatePath(`/athlete/entries/${entryId}`)
    return { success: true }
}

export async function bulkUpdateEntryStatus(entryIds: string[], status: 'approved' | 'rejected') {
    const { user, role } = await requireRole(['organizer', 'admin'])
    if (status !== 'approved' && status !== 'rejected') throw new Error('Invalid decision')
    if (!entryIds || entryIds.length === 0) return { success: true }

    const updated = await sql<{ event_id: string }[]>`
        WITH changed AS (
            UPDATE entries e
            SET status = ${status},
                updated_at = NOW(),
                rejection_reason = CASE
                    WHEN ${status} = 'approved' THEN NULL
                    ELSE e.rejection_reason
                END,
                qr_token = CASE
                    WHEN ${status} = 'approved' THEN COALESCE(e.qr_token, replace(gen_random_uuid()::text, '-', ''))
                    WHEN ${status} = 'rejected' THEN NULL
                    ELSE e.qr_token
                END
            FROM events ev
            WHERE e.id = ANY(${entryIds}::uuid[])
              AND e.event_id = ev.id
              AND (e.status = 'submitted'
                   OR (${status} = 'approved' AND e.status = 'rejected' AND e.generic_checked)
                   OR (${status} = 'rejected' AND e.status = 'approved'))
              ${role !== 'admin' ? sql`AND (ev.organizer_id = ${user.id} OR EXISTS (SELECT 1 FROM event_collaborators ec WHERE ec.event_id = ev.id AND ec.user_id = ${user.id} AND ec.permission = 'write'))` : sql``}
            RETURNING e.id, e.event_id
        ), logged AS (
            INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, details)
            SELECT ${role}, ${user.id},
                ${status === 'approved' ? AUDIT_ACTIONS.ENTRY_APPROVED : AUDIT_ACTIONS.ENTRY_REJECTED},
                'entry', id, jsonb_build_object('bulk', true, 'event_id', event_id)
            FROM changed
        )
        SELECT DISTINCT event_id FROM changed
    `

    if (!updated.length) throw new Error('Unauthorized or no eligible entries to update')

    updated.forEach((r) => {
        revalidatePath(`/dashboard/events/${r.event_id}/entries`)
        revalidatePath(`/dashboard/events/${r.event_id}`)
    })

    return { success: true }
}

/** Postgres unique_violation on the per-event chest number index (migration 004). */
function isChestNoConflict(err: unknown): boolean {
    const e = err as { code?: string; constraint_name?: string; message?: string }
    return e?.code === '23505' && (e.constraint_name === 'idx_entries_event_chest' || /idx_entries_event_chest/.test(e.message ?? ''))
}

export async function updateEntryChestNo(
    entryId: string,
    chestNo: number | null
): Promise<{ success?: boolean; error?: string }> {
    const { user, role } = await requireRole(['organizer', 'admin'])
    if (chestNo !== null && (!Number.isInteger(chestNo) || chestNo < 1 || chestNo > 999999)) {
        return { error: 'Chest number must be a whole number from 1 to 999999.' }
    }
    let updated: { event_id: string; previous: number | null }[]
    try {
        updated = await sql<{ event_id: string; previous: number | null }[]>`
            UPDATE entries e
            SET chest_no = ${chestNo},
                updated_at = NOW()
            FROM events ev, (SELECT chest_no AS previous FROM entries WHERE id = ${entryId}) old
            WHERE e.id = ${entryId}
              AND e.event_id = ev.id
              ${role !== 'admin' ? sql`AND (ev.organizer_id = ${user.id} OR EXISTS (SELECT 1 FROM event_collaborators ec WHERE ec.event_id = ev.id AND ec.user_id = ${user.id} AND ec.permission = 'write'))` : sql``}
            RETURNING e.event_id, old.previous
        `
    } catch (err) {
        if (isChestNoConflict(err)) {
            return { error: `Chest number ${chestNo} is already used by another athlete in this event.` }
        }
        throw err
    }
    if (updated.length === 0) return { error: 'Unauthorized or entry not found' }

    audit({
        actorType: role === 'admin' ? 'admin' : 'organizer',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_CHEST_NO_CHANGED,
        entityType: 'entry',
        entityId: entryId,
        details: { event_id: updated[0].event_id, from: updated[0].previous, to: chestNo },
    }).catch(console.error)

    revalidatePath(`/dashboard/events/${updated[0].event_id}`)
    revalidatePath(`/dashboard/events/${updated[0].event_id}/entries`)
    return { success: true }
}

export async function exportEventEntries(
    eventId: string,
    searchParams: { q?: string; status?: string; coach?: string; day?: string }
) {
    const { user, role } = await requireRole(['organizer', 'admin'])

    const q = searchParams.q?.trim()
    const status = searchParams.status
    const coach = searchParams.coach
    const day = searchParams.day

    const data = await sql<
        {
            student_name: string
            student_rank: string | null
            student_weight: number | null
            dojo_name: string | null
            category_name: string | null
            event_day_name: string | null
            participation_type: string | null
            status: string
            coach_name: string | null
            coach_email: string
            created_at: string
        }[]
    >`
        SELECT 
            COALESCE(e.snap_name, s.name) AS student_name,
            COALESCE(e.snap_rank, s.rank) AS student_rank,
            COALESCE(e.declared_weight_kg, s.weight) AS student_weight,
            d.name AS dojo_name,
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
            ed.name AS event_day_name,
            e.participation_type,
            e.status,
            p.full_name AS coach_name,
            p.email AS coach_email,
            e.created_at
        FROM entries e
        JOIN events ev ON e.event_id = ev.id
        JOIN students s ON e.student_id = s.id
        LEFT JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN event_days ed ON e.event_day_id = ed.id
        JOIN users p ON e.coach_id = p.id
        WHERE e.event_id = ${eventId}
          AND e.status IN ('submitted', 'approved', 'rejected')
          ${role !== 'admin' ? sql`AND (ev.organizer_id = ${user.id} OR EXISTS (SELECT 1 FROM event_collaborators ec WHERE ec.event_id = ev.id AND ec.user_id = ${user.id}))` : sql``}
          ${q ? sql`AND COALESCE(e.snap_name, s.name) ILIKE ${'%' + q + '%'}` : sql``}
          ${status && status !== 'all' ? sql`AND e.status = ${status}` : sql``}
          ${coach && coach !== 'all' ? sql`AND e.coach_id = ${coach}` : sql``}
          ${day && day !== 'all' ? sql`AND e.event_day_id = ${day}` : sql``}
        ORDER BY e.created_at DESC
    `

    return data.map((e) => ({
        'Student Name': e.student_name,
        'Rank/Belt': e.student_rank || '-',
        'Weight': e.student_weight ? `${e.student_weight} kg` : '-',
        'Dojo': e.dojo_name || '-',
        'Category': e.category_name || '-',
        'Event Day': e.event_day_name || '-',
        'Participation Type': e.participation_type || '-',
        'Status': e.status,
        'Coach Name': e.coach_name || '-',
        'Coach Email': e.coach_email,
        'Date Applied': formatStepDate(e.created_at),
    }))
}

export async function exportEventForRingFlow(eventId: string, dayId?: string): Promise<{ rows?: RingFlowRow[]; title?: string; error?: string }> {
    const { user } = await requireRole('admin')

    const events = await sql<{ id: string; title: string; start_date: string | Date; age_cutoff_rule: string | null }[]>`
        SELECT ev.id, ev.title, ev.start_date, ev.age_cutoff_rule
        FROM events ev
        WHERE ev.id = ${eventId}
        LIMIT 1
    `
    if (!events.length) return { error: 'Event not found or unauthorized' }
    const event = events[0]

    const entries = await sql<RingFlowSourceEntry[]>`
        SELECT
            e.chest_no,
            d.name AS dojo_name,
            d.join_code AS dojo_join_code,
            s.registration_no,
            COALESCE(e.snap_name, s.name) AS name,
            COALESCE(e.snap_gender, s.gender) AS gender,
            COALESCE(e.snap_dob, s.date_of_birth)::text AS dob,
            COALESCE(e.snap_rank, s.rank) AS rank,
            COALESCE(e.declared_weight_kg, s.weight)::text AS weight_kg,
            ed.name AS day_name,
            e.participation_type,
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_label
        FROM entries e
        JOIN students s ON s.id = e.student_id
        LEFT JOIN dojos d ON d.id = s.dojo_id
        LEFT JOIN event_days ed ON ed.id = e.event_day_id
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.event_id = ${eventId}
          AND e.status = 'approved'
          AND (${dayId ?? null}::uuid IS NULL OR e.event_day_id = ${dayId ?? null}::uuid)
          AND e.chest_no IS NOT NULL
        ORDER BY e.chest_no ASC
    `
    await audit({ actorType: 'admin', actorId: user.id, action: 'event.ringflow_roster_accessed',
        entityType: 'event', entityId: eventId, details: { count: entries.length, dayId } })
    return { rows: toRingFlowRows(entries, event), title: event.title }
}
