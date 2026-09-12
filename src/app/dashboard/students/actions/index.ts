'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { normalizeDobToIso } from '@/lib/date'
import sql from '@/lib/db'

export async function createStudent(formData: FormData) {
    const { user } = await requireRole('coach')

    const name = (formData.get('name') as string)?.trim()
    const gender = formData.get('gender') as string
    const dojo_id = formData.get('dojo_id') as string // UUID
    const rank = formData.get('rank') as string
    const weight = formData.get('weight') ? Number(formData.get('weight')) : null
    const dobRaw = formData.get('dob')
    const dob = normalizeDobToIso(dobRaw)

    if (!name) {
        throw new Error('Student name is required')
    }

    if (dobRaw && !dob) {
        throw new Error('Invalid DOB. Use YYYY-MM-DD.')
    }

    // Security check: Ensure dojo strictly belongs to this coach
    const dojos = await sql<{ id: string }[]>`
        SELECT id FROM dojos WHERE id = ${dojo_id} AND coach_id = ${user.id} LIMIT 1
    `

    if (dojos.length === 0) {
        throw new Error('Unauthorized: Invalid Dojo selected')
    }

    await sql`
        INSERT INTO students (name, gender, dojo_id, rank, weight, date_of_birth)
        VALUES (${name}, ${gender}, ${dojo_id}, ${rank || null}, ${weight}, ${dob || null})
    `

    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/dojos')
    return { success: true }
}

export async function updateStudent(studentId: string, formData: FormData) {
    const { user } = await requireRole('coach')

    const name = (formData.get('name') as string)?.trim()
    const gender = formData.get('gender') as string
    const rank = formData.get('rank') as string
    const weight = formData.get('weight') ? Number(formData.get('weight')) : null
    const dobRaw = formData.get('dob')
    const dob = normalizeDobToIso(dobRaw)

    if (!name) {
        throw new Error('Student name is required')
    }

    if (dobRaw && !dob) {
        throw new Error('Invalid DOB. Use YYYY-MM-DD.')
    }

    // Security check: strictly enforce that student belongs to a dojo owned by this coach
    const updated = await sql`
        UPDATE students
        SET 
            name = ${name},
            gender = ${gender},
            rank = ${rank || null},
            weight = ${weight},
            date_of_birth = ${dob || null}
        WHERE id = ${studentId}
          AND dojo_id IN (SELECT id FROM dojos WHERE coach_id = ${user.id})
        RETURNING id
    `

    if (updated.length === 0) {
        throw new Error('Unauthorized: Student not found or does not belong to your dojo')
    }

    // Revert submitted/approved entries to draft on profile edit so details are re-verified
    try {
        await sql`
            UPDATE entries
            SET status = 'draft', updated_at = NOW()
            WHERE student_id = ${studentId}
              AND coach_id = ${user.id}
              AND status IN ('submitted', 'approved')
        `
    } catch (revertError) {
        console.error('Failed to revert entries to draft:', revertError)
    }

    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/entries')
    return { success: true }
}

export async function deleteStudent(studentId: string) {
    const { user } = await requireRole('coach')

    // Security check: coach can only delete students in their own dojos
    const deleted = await sql`
        DELETE FROM students
        WHERE id = ${studentId}
          AND dojo_id IN (SELECT id FROM dojos WHERE coach_id = ${user.id})
        RETURNING id
    `

    if (deleted.length === 0) {
        throw new Error('Unauthorized: Student not found or does not belong to your dojo')
    }

    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/dojos')
    return { success: true }
}

export async function updateStudentGenericChecked(studentId: string, checked: boolean, eventId?: string) {
    const { user } = await requireRole('coach')

    // Security check: coach can only update their own students
    await sql`
        UPDATE students
        SET generic_checked = ${checked}
        WHERE id = ${studentId}
          AND dojo_id IN (SELECT id FROM dojos WHERE coach_id = ${user.id})
    `

    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/entries')
    if (eventId) {
        revalidatePath(`/dashboard/entries/${eventId}`)
    }

    return { success: true }
}
