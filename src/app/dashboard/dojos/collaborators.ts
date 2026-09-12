'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function addDojoCollaborator(dojoId: string, email: string, permission: 'read' | 'write') {
  const { user } = await requireRole('coach')

  // Verify the current user is the owner of the dojo
  const dojos = await sql<{ id: string }[]>`
    SELECT id FROM dojos
    WHERE id = ${dojoId} AND coach_id = ${user.id}
    LIMIT 1
  `

  if (dojos.length === 0) {
    throw new Error('You do not have permission to share this dojo.')
  }

  // Find the target user by email
  const targetUsers = await sql<{ id: string }[]>`
    SELECT id FROM users
    WHERE lower(email) = ${email.trim().toLowerCase()} AND is_active = TRUE
    LIMIT 1
  `

  if (targetUsers.length === 0) {
    throw new Error('Authorized user not found. Please ensure the user has been added to the system.')
  }

  const targetUserId = targetUsers[0].id

  if (targetUserId === user.id) {
    throw new Error('You cannot add yourself as a collaborator.')
  }

  // Insert or update collaborator
  await sql`
    INSERT INTO dojo_collaborators (dojo_id, user_id, permission)
    VALUES (${dojoId}, ${targetUserId}, ${permission})
    ON CONFLICT (dojo_id, user_id)
    DO UPDATE SET permission = EXCLUDED.permission
  `

  revalidatePath('/dashboard/dojos')
  return { success: true }
}

export async function removeDojoCollaborator(dojoId: string, collaboratorUserId: string) {
  const { user } = await requireRole('coach')

  // Verify owner
  const dojos = await sql<{ id: string }[]>`
    SELECT id FROM dojos
    WHERE id = ${dojoId} AND coach_id = ${user.id}
    LIMIT 1
  `

  if (dojos.length === 0) {
    throw new Error('You do not have permission to manage this dojo.')
  }

  await sql`
    DELETE FROM dojo_collaborators
    WHERE dojo_id = ${dojoId} AND user_id = ${collaboratorUserId}
  `

  revalidatePath('/dashboard/dojos')
  return { success: true }
}

export async function updateDojoCollaborator(dojoId: string, collaboratorUserId: string, permission: 'read' | 'write') {
  const { user } = await requireRole('coach')

  // Verify owner
  const dojos = await sql<{ id: string }[]>`
    SELECT id FROM dojos
    WHERE id = ${dojoId} AND coach_id = ${user.id}
    LIMIT 1
  `

  if (dojos.length === 0) {
    throw new Error('You do not have permission to manage this dojo.')
  }

  await sql`
    UPDATE dojo_collaborators
    SET permission = ${permission}
    WHERE dojo_id = ${dojoId} AND user_id = ${collaboratorUserId}
  `

  revalidatePath('/dashboard/dojos')
  return { success: true }
}
