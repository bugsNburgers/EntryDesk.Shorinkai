'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { calculateCategory } from '@/lib/category'
import { auditAsync, AUDIT_ACTIONS } from '@/lib/audit'
import { randomUUID } from 'crypto'
import { normalizeDobToIso } from '@/lib/date'

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

export interface CoachAddManualStudentInput {
    eventId: string
    dojoId: string
    existingStudentId?: string | null
    name?: string | null
    gender?: 'male' | 'female' | 'other' | null
    dateOfBirth?: string | null
    rank?: string | null
    weight?: number | null
    parentPhone?: string | null
    parentName?: string | null
    schoolOrCity?: string | null
    participationType?: 'kata' | 'kumite' | 'both' | null
    eventDayId?: string | null
    status?: 'draft' | 'submitted'
}

export async function coachAddManualStudentAndEntry(input: CoachAddManualStudentInput) {
    const { user } = await requireRole('coach')

    if (!input.eventId) {
        throw new Error('Event ID is required')
    }

    if (!input.dojoId) {
        throw new Error('Dojo ID is required')
    }

    // 1. Strict Security: Verify registration is open
    await assertRegistrationOpen(input.eventId)

    // 2. Strict Security: Verify dojo belongs to coach or coach is collaborator
    const dojoCheck = await sql<{ id: string }[]>`
        SELECT d.id FROM dojos d
        LEFT JOIN dojo_collaborators dc ON d.id = dc.dojo_id AND dc.user_id = ${user.id}
        WHERE d.id = ${input.dojoId} AND (d.coach_id = ${user.id} OR dc.user_id = ${user.id})
        LIMIT 1
    `
    if (dojoCheck.length === 0) {
        throw new Error('Unauthorized: Selected dojo does not belong to you')
    }

    let studentId: string
    let finalName: string
    let finalGender: string
    let finalDob: string | null = null
    let finalRank: string | null = null
    let finalWeight: number | null = input.weight ?? null

    if (input.existingStudentId) {
        // Use existing student from roster
        const existingStudent = await sql<{
            id: string
            name: string
            gender: string
            date_of_birth: string | null
            rank: string | null
            weight: number | null
            phone: string | null
        }[]>`
            SELECT id, name, gender, date_of_birth, rank, weight, phone
            FROM students
            WHERE id = ${input.existingStudentId} AND dojo_id = ${input.dojoId}
            LIMIT 1
        `
        if (existingStudent.length === 0) {
            throw new Error('Student not found in your dojo')
        }
        const s = existingStudent[0]
        studentId = s.id
        finalName = s.name
        finalGender = s.gender
        finalDob = s.date_of_birth
        finalRank = input.rank || s.rank
        finalWeight = input.weight ?? s.weight

        // Update phone/weight/rank if new values provided
        if (input.parentPhone || input.weight || input.rank) {
            await sql`
                UPDATE students
                SET phone = COALESCE(${input.parentPhone?.trim() || null}, phone),
                    weight = COALESCE(${input.weight ?? null}, weight),
                    rank = COALESCE(${input.rank || null}, rank)
                WHERE id = ${studentId}
            `
        }
    } else {
        // Edge Case 10.2: Coach adds a kid manually (name, DOB, parent phone). The kid has no guardian account.
        const name = input.name?.trim()
        if (!name) {
            throw new Error('Student name is required')
        }
        if (!input.gender) {
            throw new Error('Gender is required')
        }

        finalName = name
        finalGender = input.gender
        finalDob = normalizeDobToIso(input.dateOfBirth) || null
        finalRank = input.rank || null

        const [newStudent] = await sql<{ id: string }[]>`
            INSERT INTO students (
                dojo_id,
                parent_id,
                name,
                gender,
                date_of_birth,
                rank,
                weight,
                phone,
                school_or_city,
                membership_status,
                consent_given_at,
                consent_version,
                consent_given_by
            ) VALUES (
                ${input.dojoId},
                NULL,
                ${name},
                ${input.gender},
                ${finalDob},
                ${finalRank},
                ${finalWeight},
                ${input.parentPhone?.trim() || null},
                ${input.schoolOrCity?.trim() || null},
                'active',
                NOW(),
                'coach_manual_edge_case_v1',
                ${user.id}
            )
            RETURNING id
        `
        studentId = newStudent.id

        auditAsync({
            actorType: 'coach',
            actorId: user.id,
            action: AUDIT_ACTIONS.STUDENT_CREATED,
            entityType: 'student',
            entityId: studentId,
            details: {
                name,
                dojo_id: input.dojoId,
                source: 'coach_manual_edge_case_10_2',
            },
        })
    }

    // 3. Check for existing entry for this event
    const existingEntry = await sql<{ id: string; status: string; qr_token: string | null }[]>`
        SELECT id, status, qr_token FROM entries
        WHERE event_id = ${input.eventId} AND student_id = ${studentId}
        LIMIT 1
    `

    if (existingEntry.length > 0 && !['withdrawn', 'coach_declined', 'rejected'].includes(existingEntry[0].status)) {
        throw new Error(`This student already has an active entry (${existingEntry[0].status}) for this event.`)
    }

    // 4. Calculate category
    const category = calculateCategory({
        date_of_birth: finalDob,
        gender: finalGender,
        rank: finalRank,
        weight: finalWeight,
    })

    // Try finding matching category record in categories table if it exists
    const matchingCategories = await sql<{ id: string }[]>`
        SELECT id FROM categories
        WHERE event_id = ${input.eventId}
          AND lower(name) = lower(${category.displayName})
        LIMIT 1
    `
    const categoryId = matchingCategories[0]?.id || null

    // 5. Generate secure random qr_token for the public credential link (Plan 10.2)
    const qrToken = randomUUID().replace(/-/g, '')
    const targetStatus = input.status === 'draft' ? 'draft' : 'submitted'
    let entryId: string

    if (existingEntry.length > 0) {
        const [updated] = await sql<{ id: string }[]>`
            UPDATE entries
            SET coach_id = ${user.id},
                category_id = ${categoryId},
                event_day_id = ${input.eventDayId || null},
                participation_type = ${input.participationType || null},
                declared_weight_kg = ${finalWeight},
                category_snapshot = ${JSON.stringify(category)},
                status = ${targetStatus},
                qr_token = COALESCE(qr_token, ${qrToken}),
                updated_at = NOW()
            WHERE id = ${existingEntry[0].id}
            RETURNING id
        `
        entryId = updated.id
    } else {
        const [inserted] = await sql<{ id: string }[]>`
            INSERT INTO entries (
                event_id,
                coach_id,
                student_id,
                category_id,
                event_day_id,
                participation_type,
                declared_weight_kg,
                category_snapshot,
                status,
                submitted_by,
                qr_token
            ) VALUES (
                ${input.eventId},
                ${user.id},
                ${studentId},
                ${categoryId},
                ${input.eventDayId || null},
                ${input.participationType || null},
                ${finalWeight},
                ${JSON.stringify(category)},
                ${targetStatus},
                ${user.id},
                ${qrToken}
            )
            RETURNING id
        `
        entryId = inserted.id
    }

    auditAsync({
        actorType: 'coach',
        actorId: user.id,
        action: AUDIT_ACTIONS.ENTRY_CREATED,
        entityType: 'entry',
        entityId: entryId,
        details: {
            student_id: studentId,
            event_id: input.eventId,
            status: targetStatus,
            source: 'coach_manual_add_student',
        },
    })

    revalidatePath(`/dashboard/entries/${input.eventId}`)
    revalidatePath('/dashboard/entries')
    revalidatePath('/dashboard/students')

    return {
        success: true,
        studentId,
        entryId,
        qrToken,
        studentName: finalName,
        categoryName: category.displayName,
        status: targetStatus,
    }
}

