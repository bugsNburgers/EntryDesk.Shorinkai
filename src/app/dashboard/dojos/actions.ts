'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import crypto from 'crypto'

function generateSlug(name: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'dojo'
    const suffix = crypto.randomBytes(2).toString('hex')
    return `${base}-${suffix}`
}

function generateJoinCode(): string {
    return crypto.randomBytes(3).toString('hex')
}

export async function createDojo(formData: FormData) {
    const { user } = await requireRole('coach')

    const nameValue = formData.get('name')
    const name = typeof nameValue === 'string' ? nameValue.trim() : ''

    if (!name) {
        throw new Error('Dojo name is required')
    }

    const cityValue = formData.get('city')
    const city = typeof cityValue === 'string' && cityValue.trim() ? cityValue.trim() : null

    const slug = generateSlug(name)
    const joinCode = generateJoinCode()

    await sql`
        INSERT INTO dojos (name, coach_id, city, slug, join_code, join_link_enabled)
        VALUES (${name}, ${user.id}, ${city}, ${slug}, ${joinCode}, TRUE)
    `

    revalidatePath('/dashboard/dojos')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateDojo(dojoId: string, formData: FormData) {
    const { user } = await requireRole('coach')

    const nameValue = formData.get('name')
    const name = typeof nameValue === 'string' ? nameValue.trim() : ''

    if (!name) {
        throw new Error('Dojo name is required')
    }

    const cityValue = formData.get('city')
    const city = typeof cityValue === 'string' && cityValue.trim() ? cityValue.trim() : null

    // Security check: coach_id = user.id strictly enforced in SQL
    await sql`
        UPDATE dojos
        SET name = ${name}, city = ${city}
        WHERE id = ${dojoId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/dojos')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function toggleDojoJoinLink(dojoId: string, enabled: boolean) {
    const { user } = await requireRole('coach')

    await sql`
        UPDATE dojos
        SET join_link_enabled = ${enabled}
        WHERE id = ${dojoId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/dojos')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function regenerateDojoJoinCode(dojoId: string) {
    const { user } = await requireRole('coach')

    const rows = await sql<{ name: string }[]>`
        SELECT name FROM dojos WHERE id = ${dojoId} AND coach_id = ${user.id} LIMIT 1
    `
    if (rows.length === 0) {
        throw new Error('Dojo not found or permission denied')
    }

    const newCode = generateJoinCode()
    const newSlug = generateSlug(rows[0].name)

    await sql`
        UPDATE dojos
        SET join_code = ${newCode}, slug = ${newSlug}
        WHERE id = ${dojoId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/dojos')
    revalidatePath('/dashboard')
    return { success: true, slug: newSlug, joinCode: newCode }
}

export async function deleteDojo(dojoId: string) {
    const { user } = await requireRole('coach')

    // Safe deletion check: prevent deleting dojo if students exist
    const studentCheck = await sql<{ count: string }[]>`
        SELECT count(*) AS count FROM students WHERE dojo_id = ${dojoId}
    `
    const studentCount = parseInt(studentCheck[0]?.count || '0', 10)
    if (studentCount > 0) {
        throw new Error(`Cannot delete dojo: it contains ${studentCount} registered student(s). Reassign or remove students first.`)
    }

    // Security check: coach_id = user.id strictly enforced in SQL
    await sql`
        DELETE FROM dojos
        WHERE id = ${dojoId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/dojos')
    return { success: true }
}

