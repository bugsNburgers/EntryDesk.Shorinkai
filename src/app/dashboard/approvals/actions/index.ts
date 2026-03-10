'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { assertUserRateLimit } from '@/lib/security/action-rate-limit'
import { type RateLimitPolicy } from '@/lib/security/rate-limit'

const APPROVAL_STATUS_POLICY: RateLimitPolicy = {
  name: 'action-approval-status',
  limit: 40,
  window: '1 m',
}

export async function updateApplicationStatus(applicationId: string, status: 'approved' | 'rejected') {
  const { supabase, user } = await requireRole(['organizer', 'admin'])
  await assertUserRateLimit(APPROVAL_STATUS_POLICY, user.id, ['application', applicationId])

  // Security: Ensure the event belongs to this organizer
  // We can do this with a complex RLS policy (already have "Organizers manage applications")
  // or by doing an explicit join check if RLS is too loose.
  // Our RLS: "exists (select 1 from events where events.id = event_applications.event_id and events.organizer_id = auth.uid())"
  // This protects UPDATES too.

  // Fetch event_id to revalidate the correct page
  const { data: updated, error } = await supabase
    .from('event_applications')
    .update({ status })
    .eq('id', applicationId)
    .select('event_id')
    .single()

  if (error) {
    console.error(error)
    throw new Error('Failed to update application')
  }

  revalidatePath('/dashboard/approvals')
  if (updated) {
    revalidatePath(`/dashboard/events/${updated.event_id}/approvals`)
  }
  return { success: true }
}
