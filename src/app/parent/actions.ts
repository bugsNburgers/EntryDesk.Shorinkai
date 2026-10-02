'use server'

// ============================================================================
// EntryDesk — Parent Server Actions
// src/app/parent/actions.ts
// ============================================================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { ParentCreateStudentSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { AUDIT_ACTIONS } from '@/lib/audit'

import { normalizeDobToIso } from '@/lib/date'

async function getClientIp(): Promise<string> {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function createChildAsParent(formData: FormData): Promise<{ error?: string }> {
    const { user } = await requireRole('parent', { redirectTo: '/login' })
    const ip = await getClientIp()

    // Parse raw form data
    const raw = {
        dojo_id: formData.get('dojo_id'),
        name: formData.get('name'),
        gender: formData.get('gender'),
        date_of_birth: formData.get('date_of_birth') || undefined,
        rank: formData.get('rank') || undefined,
        weight: formData.get('weight') ? Number(formData.get('weight')) : undefined,
        school_or_city: formData.get('school_or_city') || undefined,
        phone: formData.get('phone') || undefined,
        photo_url: formData.get('photo_url') || undefined,
        consent: formData.get('consent') === 'on' ? (true as const) : (false as unknown as true),
        consent_version: 'v1.0',
    }

    // Validate with Zod
    const parsed = ParentCreateStudentSchema.safeParse(raw)
    if (!parsed.success) {
        const firstError = parsed.error.issues?.[0]?.message ?? 'Please check your inputs.'
        return { error: firstError }
    }

    const data = parsed.data

    // Verify the dojo exists and has join_link_enabled
    const dojos = await sql<{ id: string; join_link_enabled: boolean }[]>`
        SELECT id, join_link_enabled FROM dojos WHERE id = ${data.dojo_id} LIMIT 1
    `
    if (!dojos.length) {
        return { error: 'Invalid dojo selected.' }
    }
    if (!dojos[0].join_link_enabled) {
        return { error: 'This dojo is no longer accepting new registrations via this link.' }
    }

    // Check for existing athlete with same name in same dojo (soft duplicate detection)
    const existing = await sql<{ id: string }[]>`
        SELECT id FROM students
        WHERE parent_id = ${user.id}
          AND lower(name) = lower(${data.name})
          AND dojo_id = ${data.dojo_id}
        LIMIT 1
    `
    if (existing.length > 0) {
        return { error: `You've already added an athlete named "${data.name}" to this dojo.` }
    }

    const now = new Date()

    const [newStudent] = await sql<{ id: string }[]>`
        INSERT INTO students (
            dojo_id,
            parent_id,
            name,
            gender,
            date_of_birth,
            rank,
            weight,
            school_or_city,
            phone,
            photo_url,
            consent_given_at,
            consent_version,
            consent_given_by,
            membership_status
        ) VALUES (
            ${data.dojo_id},
            ${user.id},
            ${data.name},
            ${data.gender},
            ${data.date_of_birth ?? null},
            ${data.rank ?? null},
            ${data.weight ?? null},
            ${data.school_or_city ?? null},
            ${data.phone ?? null},
            ${data.photo_url},
            ${now},
            ${data.consent_version},
            ${user.id},
            'active'
        )
        RETURNING id
    `

    if (!newStudent?.id) {
        return { error: 'Failed to add athlete. Please try again.' }
    }

    // DPDP audit log for consent — this must be reliable, so we use sync audit()
    await audit({
        actorType: 'parent',
        actorId: user.id,
        action: AUDIT_ACTIONS.STUDENT_CONSENT_GIVEN,
        entityType: 'student',
        entityId: newStudent.id,
        details: {
            consent_version: data.consent_version,
            dojo_id: data.dojo_id,
        },
        ipAddress: ip,
    })

    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath('/dashboard/students')
    redirect(`/athlete/${newStudent.id}`)
}

export async function updateChildAsParent(
    studentId: string,
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireRole('parent', { redirectTo: '/login' })

    const section = (formData.get('section') as string)?.trim() || 'all'

    if (section === 'basic') {
        const name = (formData.get('name') as string)?.trim()
        const gender = (formData.get('gender') as string)?.trim()?.toLowerCase()

        if (!name) {
            return { error: 'Athlete name is required.' }
        }

        const updated = await sql<{ id: string }[]>`
            UPDATE students
            SET
                name = ${name},
                gender = COALESCE(${gender}, gender)
            WHERE id = ${studentId}
              AND parent_id = ${user.id}
              AND membership_status = 'active'
            RETURNING id
        `

        if (updated.length === 0) {
            return { error: 'Could not update athlete profile. Unauthorized or profile not found.' }
        }
    } else if (section === 'personal') {
        const rank = (formData.get('rank') as string)?.trim() || null
        const weightRaw = (formData.get('weight') as string)?.trim()
        const weight = weightRaw ? Number(weightRaw) : null
        const dobRaw = formData.get('date_of_birth') as string | null
        const dob = dobRaw ? normalizeDobToIso(dobRaw) : null
        const schoolOrCity = (formData.get('school_or_city') as string)?.trim() || null

        if (dobRaw && !dob) {
            return { error: 'Invalid date of birth format. Please use YYYY-MM-DD.' }
        }

        if (weight !== null && (isNaN(weight) || weight < 5 || weight > 250)) {
            return { error: 'Please enter a valid weight in kg (5–250 kg).' }
        }

        const updated = await sql<{ id: string }[]>`
            UPDATE students
            SET
                rank = ${rank},
                weight = ${weight},
                date_of_birth = ${dob},
                school_or_city = ${schoolOrCity}
            WHERE id = ${studentId}
              AND parent_id = ${user.id}
              AND membership_status = 'active'
            RETURNING id
        `

        if (updated.length === 0) {
            return { error: 'Could not update personal details. Unauthorized or profile not found.' }
        }
    } else if (section === 'contact') {
        const phone = (formData.get('phone') as string)?.trim() || null

        const updated = await sql<{ id: string }[]>`
            UPDATE students
            SET
                phone = ${phone}
            WHERE id = ${studentId}
              AND parent_id = ${user.id}
              AND membership_status = 'active'
            RETURNING id
        `

        if (updated.length === 0) {
            return { error: 'Could not update contact details. Unauthorized or profile not found.' }
        }
    } else {
        const name = (formData.get('name') as string)?.trim()
        const gender = (formData.get('gender') as string)?.trim()?.toLowerCase()
        const rank = (formData.get('rank') as string)?.trim() || null
        const weightRaw = (formData.get('weight') as string)?.trim()
        const weight = weightRaw ? Number(weightRaw) : null
        const dobRaw = formData.get('date_of_birth') as string | null
        const dob = dobRaw ? normalizeDobToIso(dobRaw) : null
        const schoolOrCity = (formData.get('school_or_city') as string)?.trim() || null
        const phone = (formData.get('phone') as string)?.trim() || null

        if (!name) {
            return { error: 'Athlete name is required.' }
        }

        if (dobRaw && !dob) {
            return { error: 'Invalid date of birth format. Please use YYYY-MM-DD.' }
        }

        if (weight !== null && (isNaN(weight) || weight < 5 || weight > 250)) {
            return { error: 'Please enter a valid weight in kg (5–250 kg).' }
        }

        const updated = await sql<{ id: string }[]>`
            UPDATE students
            SET
                name = ${name},
                gender = COALESCE(${gender}, gender),
                rank = ${rank},
                weight = ${weight},
                date_of_birth = ${dob},
                school_or_city = ${schoolOrCity},
                phone = ${phone}
            WHERE id = ${studentId}
              AND parent_id = ${user.id}
              AND membership_status = 'active'
            RETURNING id
        `

        if (updated.length === 0) {
            return { error: 'Could not update athlete profile. Unauthorized or profile not found.' }
        }
    }

    revalidatePath('/athlete')
    revalidatePath('/parent')
    revalidatePath(`/athlete/${studentId}`)
    revalidatePath(`/parent/children/${studentId}`)
    return { success: true }
}
