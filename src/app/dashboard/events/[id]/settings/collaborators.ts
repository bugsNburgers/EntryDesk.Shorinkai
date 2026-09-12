'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'

export async function addEventCollaborator(eventId: string, email: string, permission: 'read' | 'write') {
  const { user } = await requireRole('organizer')

  // Verify the current user is the owner of the event
  const events = await sql<{ id: string }[]>`
    SELECT id FROM events
    WHERE id = ${eventId} AND organizer_id = ${user.id}
    LIMIT 1
  `

  if (events.length === 0) {
    throw new Error('You do not have permission to share this event.')
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
    INSERT INTO event_collaborators (event_id, user_id, permission)
    VALUES (${eventId}, ${targetUserId}, ${permission})
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET permission = EXCLUDED.permission
  `

  revalidatePath(`/dashboard/events/${eventId}/settings`)
  revalidatePath('/dashboard/events')
  return { success: true }
}

export async function removeEventCollaborator(eventId: string, collaboratorUserId: string) {
  const { user } = await requireRole('organizer')

  // Verify owner
  const events = await sql<{ id: string }[]>`
    SELECT id FROM events
    WHERE id = ${eventId} AND organizer_id = ${user.id}
    LIMIT 1
  `

  if (events.length === 0) {
    throw new Error('You do not have permission to manage this event.')
  }

  await sql`
    DELETE FROM event_collaborators
    WHERE event_id = ${eventId} AND user_id = ${collaboratorUserId}
  `

  revalidatePath(`/dashboard/events/${eventId}/settings`)
  revalidatePath('/dashboard/events')
  return { success: true }
}

export async function updateEventCollaborator(eventId: string, collaboratorUserId: string, permission: 'read' | 'write') {
  const { user } = await requireRole('organizer')

  // Verify owner
  const events = await sql<{ id: string }[]>`
    SELECT id FROM events
    WHERE id = ${eventId} AND organizer_id = ${user.id}
    LIMIT 1
  `

  if (events.length === 0) {
    throw new Error('You do not have permission to manage this event.')
  }

  await sql`
    UPDATE event_collaborators
    SET permission = ${permission}
    WHERE event_id = ${eventId} AND user_id = ${collaboratorUserId}
  `

  revalidatePath(`/dashboard/events/${eventId}/settings`)
  revalidatePath('/dashboard/events')
  return { success: true }
}
