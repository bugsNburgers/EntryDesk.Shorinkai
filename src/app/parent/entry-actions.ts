'use server'

// ============================================================================
// EntryDesk — Parent Entry Actions
// Server actions for the parent tournament registration flow.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { z } from 'zod'
import { UpsertEntrySchema } from '@/lib/validation'
import { audit, AUDIT_ACTIONS } from '@/lib/audit'
import { calculateCategory } from '@/lib/category'

async function getClientIp(): Promise<string> {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/** Validates a UUID format */
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Submit Parent Entry ──────────────────────────────────────────────────────

export interface SubmitParentEntryInput {
    student_id: string
    event_id: string
    participation_type?: 'kata' | 'kumite' | 'both' | null
    declared_weight_kg?: number | null
}

export async function submitParentEntry(
    input: SubmitParentEntryInput
): Promise<{ success?: boolean; entry_id?: string; error?: string }> {
    const { user } = await requireRole('parent', { redirectTo: '/login' })
    const ip = await getClientIp()

    // Validate input with Zod
    const parsed = UpsertEntrySchema.safeParse({
        student_id: input.student_id,
        event_id: input.event_id,
        participation_type: input.participation_type ?? null,
        declared_weight_kg: input.declared_weight_kg ?? null,
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
    }
    const data = parsed.data

    // ── 1. Verify student belongs to this parent ─────────────────────────────
    const studentRows = await sql<{
        id: string
        name: string
        gender: string
        date_of_birth: string | null
        rank: string | null
        weight: number | null
        dojo_id: string
        photo_url: string | null
    }[]>`
        SELECT id, name, gender, date_of_birth, rank, weight, dojo_id, photo_url
        FROM students
        WHERE id = ${data.student_id}
          AND parent_id = ${user.id}
          AND membership_status = 'active'
        LIMIT 1
    `
    if (!studentRows.length) {
        return { error: 'Student not found or not linked to your account.' }
    }
    const student = studentRows[0]

    // ── 2. Verify event is open and dojo is approved ─────────────────────────
    const eventRows = await sql<{
        id: string
        title: string
        is_registration_open: boolean
        registration_close_date: string | null
        end_date: string
        photo_required: boolean
        coach_checks_each_entry: boolean
        max_events_per_athlete: number | null
    }[]>`
        SELECT
            ev.id,
            ev.title,
            ev.is_registration_open,
            ev.registration_close_date,
            ev.end_date,
            COALESCE(ev.photo_required, FALSE) AS photo_required,
            COALESCE(ev.coach_checks_each_entry, TRUE) AS coach_checks_each_entry,
            ev.max_events_per_athlete
        FROM events ev
        JOIN event_applications ea ON ea.event_id = ev.id
        JOIN dojos d ON ea.coach_id = d.coach_id
        WHERE ev.id = ${data.event_id}
          AND d.id = ${student.dojo_id}
          AND ea.status = 'approved'
        LIMIT 1
    `
    if (!eventRows.length) {
        return { error: 'This tournament is not available for your dojo. Registration may not be open, or your dojo has not been approved for this event.' }
    }
    const event = eventRows[0]
    const today = new Date().toISOString().slice(0, 10)

    if (!event.is_registration_open) {
        return { error: 'Registration for this tournament is currently closed.' }
    }
    if (event.registration_close_date && event.registration_close_date < today) {
        return { error: 'The registration deadline for this tournament has passed.' }
    }
    if (event.end_date < today) {
        return { error: 'This tournament has already concluded.' }
    }

    // ── 3. Photo required check ──────────────────────────────────────────────
    if (event.photo_required && !student.photo_url) {
        return { error: "This tournament requires a photo. Please upload a photo in the athlete's profile first." }
    }

    // ── 4. Duplicate prevention (UNIQUE constraint backup) ───────────────────
    const existing = await sql<{ id: string; status: string }[]>`
        SELECT id, status FROM entries
        WHERE student_id = ${data.student_id}
          AND event_id = ${data.event_id}
        LIMIT 1
    `
    if (existing.length > 0) {
        const existingStatus = existing[0].status
        if (existingStatus === 'withdrawn' || existingStatus === 'coach_declined') {
            // Allow re-registration if previously withdrawn
        } else {
            return { error: `${student.name} is already registered for this tournament (status: ${existingStatus.replace(/_/g, ' ')}).` }
        }
    }

    // ── 5. Get the coach_id for this dojo (required for entries table) ────────
    const dojoRow = await sql<{ coach_id: string }[]>`
        SELECT coach_id FROM dojos WHERE id = ${student.dojo_id} LIMIT 1
    `
    const coachId = dojoRow[0]?.coach_id
    if (!coachId) {
        return { error: 'Could not find the coach for this dojo.' }
    }

    // ── 6. Auto-calculate category display name ───────────────────────────────
    const category = calculateCategory({
        date_of_birth: student.date_of_birth,
        gender: student.gender,
        rank: student.rank,
        weight: data.declared_weight_kg ?? student.weight,
    })

    // ── 7. Determine initial status based on coach_checks_each_entry ──────────
    const initialStatus = event.coach_checks_each_entry ? 'pending_coach' : 'submitted'

    // ── 8. Upsert entry (handles re-registration after withdrawal) ────────────
    let entryId: string

    if (existing.length > 0) {
        // Update withdrawn/declined entry to re-register
        const updated = await sql<{ id: string }[]>`
            UPDATE entries
            SET status = ${initialStatus},
                participation_type = ${data.participation_type ?? null},
                declared_weight_kg = ${data.declared_weight_kg ?? null},
                category_snapshot = ${JSON.stringify(category)},
                submitted_by = ${user.id},
                coach_notes = NULL,
                rejection_reason = NULL,
                updated_at = NOW()
            WHERE id = ${existing[0].id}
              AND student_id = ${data.student_id}
              AND event_id = ${data.event_id}
            RETURNING id
        `
        entryId = updated[0].id
    } else {
        // Insert new entry
        const inserted = await sql<{ id: string }[]>`
            INSERT INTO entries (
                event_id,
                student_id,
                coach_id,
                participation_type,
                declared_weight_kg,
                category_snapshot,
                status,
                submitted_by
            ) VALUES (
                ${data.event_id},
                ${data.student_id},
                ${coachId},
                ${data.participation_type ?? null},
                ${data.declared_weight_kg ?? null},
                ${JSON.stringify(category)},
                ${initialStatus},
                ${user.id}
            )
            RETURNING id
        `
        entryId = inserted[0].id
    }

    // ── 9. Audit log ─────────────────────────────────────────────────────────
    audit({
        actorType: 'parent',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_SUBMITTED,
        entityType: 'entry',
        entityId: entryId,
        details: {
            event_id: data.event_id,
            student_id: data.student_id,
            initial_status: initialStatus,
            category: category.displayName,
        },
        ipAddress: ip,
    }).catch(console.error)

    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${data.student_id}`)
    revalidatePath(`/parent/children/${data.student_id}`)
    revalidatePath(`/dashboard/entries/${data.event_id}`)
    revalidatePath('/dashboard/parent-entries')

    return { success: true, entry_id: entryId }
}

// ─── Withdraw Parent Entry ────────────────────────────────────────────────────

export async function withdrawParentEntry(
    entryId: string,
    reason?: string
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireRole('parent', { redirectTo: '/login' })

    if (!uuidRe.test(entryId)) {
        return { error: 'Invalid entry ID.' }
    }

    // Verify the entry belongs to one of this parent's children, and can be withdrawn
    const entryRows = await sql<{
        id: string
        status: string
        student_id: string
        event_id: string
    }[]>`
        SELECT e.id, e.status, e.student_id, e.event_id
        FROM entries e
        JOIN students s ON e.student_id = s.id
        WHERE e.id = ${entryId}
          AND s.parent_id = ${user.id}
        LIMIT 1
    `
    if (!entryRows.length) {
        return { error: 'Entry not found.' }
    }
    const entry = entryRows[0]

    // Cannot withdraw if already approved (show message to contact coach)
    if (entry.status === 'approved') {
        return { error: 'This entry has already been accepted. Please contact your coach to withdraw.' }
    }
    if (entry.status === 'withdrawn') {
        return { error: 'This entry is already withdrawn.' }
    }

    await sql`
        UPDATE entries
        SET status = 'withdrawn',
            qr_token = NULL,
            rejection_reason = ${reason ?? null},
            updated_at = NOW()
        WHERE id = ${entryId}
    `

    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${entry.student_id}`)
    revalidatePath(`/parent/children/${entry.student_id}`)
    revalidatePath(`/dashboard/entries/${entry.event_id}`)
    revalidatePath('/dashboard/parent-entries')

    return { success: true }
}
