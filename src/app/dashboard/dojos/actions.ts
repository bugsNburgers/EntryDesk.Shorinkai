'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function createDojo(formData: FormData) {
    const { user } = await requireRole('coach')

    const nameValue = formData.get('name')
    const name = typeof nameValue === 'string' ? nameValue.trim() : ''

    if (!name) {
        throw new Error('Dojo name is required')
    }

    await sql`
        INSERT INTO dojos (name, coach_id)
        VALUES (${name}, ${user.id})
    `

    revalidatePath('/dashboard/dojos')
    return { success: true }
}

export async function updateDojo(dojoId: string, formData: FormData) {
    const { user } = await requireRole('coach')

    const nameValue = formData.get('name')
    const name = typeof nameValue === 'string' ? nameValue.trim() : ''

    if (!name) {
        throw new Error('Dojo name is required')
    }

    // Security check: coach_id = user.id strictly enforced in SQL
    await sql`
        UPDATE dojos
        SET name = ${name}
        WHERE id = ${dojoId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/dojos')
    return { success: true }
}

export async function deleteDojo(dojoId: string) {
    const { user } = await requireRole('coach')

    // Security check: coach_id = user.id strictly enforced in SQL
    await sql`
        DELETE FROM dojos
        WHERE id = ${dojoId} AND coach_id = ${user.id}
    `

    revalidatePath('/dashboard/dojos')
    return { success: true }
}
