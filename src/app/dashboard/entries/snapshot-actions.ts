'use server'

// ============================================================================
// Correct an entry's per-event athlete snapshot (typo fixes).
// Coaches (entry/dojo owner or dojo write-collaborator) and organisers (event owner,
// event write-collaborator, admin) may do this; parents may not. Every change is audited
// and the informational category label is recomputed.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import sql from '@/lib/db'
import { requireRole } from '@/lib/auth/require-role'
import { audit, AUDIT_ACTIONS } from '@/lib/audit'
import { normalizeDobToIso } from '@/lib/date'
import { refreshCategorySnapshots } from '@/lib/entries/snapshot'

const CorrectionSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    gender: z.enum(['male', 'female', 'other']),
    date_of_birth: z.string().trim().min(1, 'Date of birth is required'),
    rank: z.string().trim().max(50).nullable().optional(),
    weight_kg: z.number().positive('Weight must be positive').max(200).nullable().optional(),
    school_or_city: z.string().trim().max(100).nullable().optional(),
})

export type EntrySnapshotCorrection = z.input<typeof CorrectionSchema>

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function correctEntrySnapshot(
    entryId: string,
    input: EntrySnapshotCorrection
): Promise<{ success?: boolean; error?: string }> {
    const { user, role } = await requireRole(['coach', 'organizer', 'admin'])
    if (!uuidRe.test(entryId)) return { error: 'Invalid entry ID.' }

    const parsed = CorrectionSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
    const data = parsed.data
    const dob = normalizeDobToIso(data.date_of_birth)
    if (!dob) return { error: 'Date of birth must be a valid date (YYYY-MM-DD).' }

    const rows = await sql<{
        id: string
        event_id: string
        student_id: string
        status: string
        before: Record<string, unknown>
    }[]>`
        SELECT e.id, e.event_id, e.student_id, e.status,
               json_build_object(
                   'name', COALESCE(e.snap_name, s.name),
                   'gender', COALESCE(e.snap_gender, s.gender),
                   'date_of_birth', COALESCE(e.snap_dob, s.date_of_birth),
                   'rank', COALESCE(e.snap_rank, s.rank),
                   'weight_kg', COALESCE(e.declared_weight_kg, s.weight),
                   'school_or_city', COALESCE(e.snap_school_or_city, s.school_or_city)
               ) AS before
        FROM entries e
        JOIN students s ON s.id = e.student_id
        JOIN dojos d ON d.id = s.dojo_id
        JOIN events ev ON ev.id = e.event_id
        WHERE e.id = ${entryId}
          AND (
            ${role === 'admin'}
            OR (${role === 'coach'} AND (
                e.coach_id = ${user.id} OR d.coach_id = ${user.id}
                OR EXISTS (SELECT 1 FROM dojo_collaborators dc
                           WHERE dc.dojo_id = d.id AND dc.user_id = ${user.id} AND dc.permission = 'write')
            ))
            OR (${role === 'organizer'} AND (
                ev.organizer_id = ${user.id}
                OR EXISTS (SELECT 1 FROM event_collaborators ec
                           WHERE ec.event_id = ev.id AND ec.user_id = ${user.id} AND ec.permission = 'write')
            ))
          )
        LIMIT 1
    `
    if (!rows.length) return { error: 'Entry not found or you do not have permission to edit it.' }
    const entry = rows[0]

    await sql`
        UPDATE entries SET
            snap_name = ${data.name},
            snap_gender = ${data.gender},
            snap_dob = ${dob},
            snap_rank = ${data.rank || null},
            declared_weight_kg = ${data.weight_kg ?? null},
            snap_school_or_city = ${data.school_or_city || null},
            snap_taken_at = COALESCE(snap_taken_at, NOW()),
            updated_at = NOW()
        WHERE id = ${entryId}
    `
    await refreshCategorySnapshots([entryId])

    await audit({
        actorType: role === 'admin' ? 'admin' : role === 'organizer' ? 'organizer' : 'coach',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_SNAPSHOT_CORRECTED,
        entityType: 'entry',
        entityId: entryId,
        details: {
            event_id: entry.event_id,
            student_id: entry.student_id,
            before: entry.before,
            after: { ...data, date_of_birth: dob },
        },
    })

    revalidatePath(`/dashboard/events/${entry.event_id}/entries`)
    revalidatePath(`/dashboard/events/${entry.event_id}`)
    revalidatePath(`/dashboard/entries/${entry.event_id}`)
    revalidatePath('/dashboard/parent-entries')
    revalidatePath(`/athlete/entries/${entryId}`)
    return { success: true }
}
