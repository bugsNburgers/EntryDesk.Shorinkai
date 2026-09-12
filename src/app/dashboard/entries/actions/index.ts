'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

/**
 * Checks if an event is currently open for registration.
 * Accounts for manual toggle, registration close date, and temporary short burst openings.
 */
async function assertRegistrationOpen(eventId: string) {
    const events = await sql<
        {
            is_registration_open: boolean
            registration_close_date: string | null
            temporary_registration_closes_at: string | null
            end_date: string
        }[]
    >`
        SELECT 
            is_registration_open,
            registration_close_date,
            temporary_registration_closes_at,
            end_date
        FROM events 
        WHERE id = ${eventId} 
        LIMIT 1
    `
    if (events.length === 0) {
        throw new Error('Event not found')
    }
    const ev = events[0]
    const now = new Date()

    // Temporary burst overrides closed state
    if (ev.temporary_registration_closes_at && new Date(ev.temporary_registration_closes_at) > now) {
        return
    }

    const todayIso = now.toISOString().slice(0, 10)
    if (ev.end_date < todayIso) {
        throw new Error('This event has already concluded. Registrations are closed.')
    }

    if (!ev.is_registration_open) {
        throw new Error('Registration is closed for this event. No additions or modifications are allowed.')
    }

    if (ev.registration_close_date && ev.registration_close_date < todayIso) {
        throw new Error('Registration deadline has passed for this event.')
    }
}

export async function upsertEntry(formData: FormData) {
    const { user } = await requireRole('coach')

    const event_id = formData.get('event_id') as string
    const student_id = formData.get('student_id') as string
    const category_id = (formData.get('category_id') as string) || null
    const event_day_id = (formData.get('event_day_id') as string) || null
    const participation_type = (formData.get('participation_type') as string) || null

    if (!event_id || !student_id) {
        throw new Error('Event and Student are required')
    }

    // 1. Strict Security: Verify registration is open
    await assertRegistrationOpen(event_id)

    // 2. Strict Security: Ensure student belongs to a dojo owned by this coach
    const studentCheck = await sql<{ id: string }[]>`
        SELECT s.id 
        FROM students s
        JOIN dojos d ON s.dojo_id = d.id
        WHERE s.id = ${student_id} AND d.coach_id = ${user.id}
        LIMIT 1
    `

    if (studentCheck.length === 0) {
        throw new Error('Unauthorized: Student not found or does not belong to your dojos')
    }

    // Check if entry exists for (event_id, student_id)
    const existing = await sql<{ id: string }[]>`
        SELECT id FROM entries 
        WHERE event_id = ${event_id} AND student_id = ${student_id} AND coach_id = ${user.id}
        LIMIT 1
    `

    if (existing.length > 0) {
        await sql`
            UPDATE entries
            SET 
                category_id = ${category_id},
                event_day_id = ${event_day_id},
                participation_type = ${participation_type},
                status = 'draft',
                updated_at = NOW()
            WHERE id = ${existing[0].id} AND coach_id = ${user.id}
        `
    } else {
        await sql`
            INSERT INTO entries (
                event_id,
                coach_id,
                student_id,
                category_id,
                event_day_id,
                participation_type,
                status
            )
            VALUES (
                ${event_id},
                ${user.id},
                ${student_id},
                ${category_id},
                ${event_day_id},
                ${participation_type},
                'draft'
            )
        `
    }

    revalidatePath('/dashboard/entries')
    revalidatePath(`/dashboard/entries/${event_id}`)
    return { success: true }
}

export async function submitEntries(eventId: string) {
    const { user } = await requireRole('coach')

    // Strict Security: Registration must be open
    await assertRegistrationOpen(eventId)

    await sql`
        UPDATE entries
        SET status = 'submitted', updated_at = NOW()
        WHERE event_id = ${eventId}
          AND coach_id = ${user.id}
          AND status = 'draft'
    `

    revalidatePath('/dashboard/entries')
    revalidatePath(`/dashboard/entries/${eventId}`)
    return { success: true }
}

export async function bulkCreateEntries(
    eventId: string,
    entries: { student_id: string; participation_type?: string | null; event_day_id?: string | null }[]
) {
    const { user } = await requireRole('coach')
    if (entries.length === 0) return { success: true }

    // Strict Security: Registration must be open
    await assertRegistrationOpen(eventId)

    // Security check: verify all students belong to this coach
    const studentIds = entries.map((e) => e.student_id)
    const validStudents = await sql<{ id: string }[]>`
        SELECT s.id
        FROM students s
        JOIN dojos d ON s.dojo_id = d.id
        WHERE s.id = ANY(${studentIds}::uuid[]) AND d.coach_id = ${user.id}
    `
    const validStudentSet = new Set(validStudents.map((s) => s.id))

    const validEntries = entries.filter((e) => validStudentSet.has(e.student_id))

    if (validEntries.length === 0) {
        throw new Error('Unauthorized: None of the selected students belong to your dojos')
    }

    for (const entry of validEntries) {
        await sql`
            INSERT INTO entries (
                event_id,
                coach_id,
                student_id,
                participation_type,
                event_day_id,
                status
            )
            VALUES (
                ${eventId},
                ${user.id},
                ${entry.student_id},
                ${entry.participation_type || null},
                ${entry.event_day_id || null},
                'draft'
            )
        `
    }

    revalidatePath(`/dashboard/entries/${eventId}`)
    return { success: true }
}

export async function bulkSubmitEntries(entryIds: string[]) {
    const { user } = await requireRole('coach')
    if (entryIds.length === 0) return { success: true }

    // 1. Fetch entries with student details to validate complete profiles
    const entriesToValidate = await sql<
        {
            entry_id: string
            event_id: string
            student_name: string | null
            student_gender: string | null
            student_dob: string | null
            student_rank: string | null
            student_weight: number | null
            is_registration_open: boolean
        }[]
    >`
        SELECT 
            e.id AS entry_id,
            e.event_id,
            s.name AS student_name,
            s.gender AS student_gender,
            s.date_of_birth AS student_dob,
            s.rank AS student_rank,
            s.weight AS student_weight,
            ev.is_registration_open
        FROM entries e
        JOIN events ev ON e.event_id = ev.id
        JOIN students s ON e.student_id = s.id
        WHERE e.id = ANY(${entryIds}::uuid[])
          AND e.coach_id = ${user.id}
          AND e.status = 'draft'
    `

    if (entriesToValidate.length === 0) {
        return { success: false, message: 'No draft entries found to submit' }
    }

    // Check that registration is open for these entries' events
    const closedEvent = entriesToValidate.find((e) => !e.is_registration_open)
    if (closedEvent) {
        throw new Error('Registration is closed for one or more of the selected events.')
    }

    const validEntryIds: string[] = []
    const invalidEntries: any[] = []

    entriesToValidate.forEach((e) => {
        if (e.student_name && e.student_gender && e.student_dob && e.student_rank && e.student_weight) {
            validEntryIds.push(e.entry_id)
        } else {
            invalidEntries.push(e)
        }
    })

    if (validEntryIds.length === 0) {
        return {
            success: false,
            message: 'All selected entries are missing required profile details (Weight, Rank, DOB, etc).',
        }
    }

    await sql`
        UPDATE entries
        SET status = 'submitted', updated_at = NOW()
        WHERE id = ANY(${validEntryIds}::uuid[])
          AND coach_id = ${user.id}
          AND status = 'draft'
    `

    revalidatePath('/dashboard/entries')
    return { success: true, submitted: validEntryIds.length, ignored: invalidEntries.length }
}

export async function deleteEntry(entryId: string) {
    const { user } = await requireRole('coach')

    // Strict Security: Check if event registration is open
    const entry = await sql<{ event_id: string; is_registration_open: boolean }[]>`
        SELECT e.event_id, ev.is_registration_open
        FROM entries e
        JOIN events ev ON e.event_id = ev.id
        WHERE e.id = ${entryId} AND e.coach_id = ${user.id}
        LIMIT 1
    `

    if (entry.length === 0) {
        throw new Error('Entry not found or unauthorized')
    }

    if (!entry[0].is_registration_open) {
        throw new Error('Registration is closed for this event. Entries cannot be removed.')
    }

    await sql`
        DELETE FROM entries
        WHERE id = ${entryId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/entries')
    revalidatePath(`/dashboard/entries/${entry[0].event_id}`)
    return { success: true }
}

export async function bulkDeleteEntries(entryIds: string[]) {
    const { user } = await requireRole('coach')
    if (entryIds.length === 0) return { success: true }

    // Strict Security: Check that all entries' events have open registration
    const entries = await sql<{ event_id: string; is_registration_open: boolean }[]>`
        SELECT e.event_id, ev.is_registration_open
        FROM entries e
        JOIN events ev ON e.event_id = ev.id
        WHERE e.id = ANY(${entryIds}::uuid[]) AND e.coach_id = ${user.id}
    `

    if (entries.some((e) => !e.is_registration_open)) {
        throw new Error('Registration is closed for one or more selected events. Entries cannot be deleted.')
    }

    await sql`
        DELETE FROM entries
        WHERE id = ANY(${entryIds}::uuid[]) AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/entries')
    return { success: true }
}

export async function updateEntryGenericChecked(entryId: string, checked: boolean, eventId?: string) {
    const { user } = await requireRole('coach')

    await sql`
        UPDATE entries
        SET generic_checked = ${checked}
        WHERE id = ${entryId} 
          AND (
              coach_id = ${user.id}
              OR EXISTS (
                  SELECT 1 FROM students s
                  JOIN dojos d ON s.dojo_id = d.id
                  JOIN dojo_collaborators dc ON d.id = dc.dojo_id
                  WHERE s.id = entries.student_id AND dc.user_id = ${user.id} AND dc.permission = 'write'
              )
          )
    `

    if (eventId) {
        revalidatePath(`/dashboard/entries/${eventId}`)
    }
    return { success: true }
}
