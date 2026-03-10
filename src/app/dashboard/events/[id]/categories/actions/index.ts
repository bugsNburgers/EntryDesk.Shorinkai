'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { assertUserRateLimit } from '@/lib/security/action-rate-limit'
import { type RateLimitPolicy } from '@/lib/security/rate-limit'

const CATEGORY_MUTATION_POLICY: RateLimitPolicy = {
  name: 'action-category-mutation',
  limit: 20,
  window: '1 m',
}

export async function createCategory(eventId: string, formData: FormData) {
  const { supabase, user } = await requireRole(['organizer', 'admin'])
  await assertUserRateLimit(CATEGORY_MUTATION_POLICY, user.id, ['create', eventId])

  const name = formData.get('name') as string
  const gender = formData.get('gender') as string
  const min_age = formData.get('min_age') ? Number(formData.get('min_age')) : null
  const max_age = formData.get('max_age') ? Number(formData.get('max_age')) : null
  const min_weight = formData.get('min_weight') ? Number(formData.get('min_weight')) : null
  const max_weight = formData.get('max_weight') ? Number(formData.get('max_weight')) : null
  const min_rank = formData.get('min_rank') as string
  const max_rank = formData.get('max_rank') as string

  const { error } = await supabase
    .from('categories')
    .insert({
      event_id: eventId,
      name,
      gender,
      min_age,
      max_age,
      min_weight,
      max_weight,
      min_rank,
      max_rank
    })

  if (error) {
    console.error(error)
    throw new Error('Failed to create category')
  }

  revalidatePath(`/dashboard/events/${eventId}/categories`)
  return { success: true }
}

export async function updateCategory(categoryId: string, eventId: string, formData: FormData) {
  const { supabase, user } = await requireRole(['organizer', 'admin'])
  await assertUserRateLimit(CATEGORY_MUTATION_POLICY, user.id, ['update', categoryId])

  const name = formData.get('name') as string
  const gender = formData.get('gender') as string
  const min_age = formData.get('min_age') ? Number(formData.get('min_age')) : null
  const max_age = formData.get('max_age') ? Number(formData.get('max_age')) : null
  const min_weight = formData.get('min_weight') ? Number(formData.get('min_weight')) : null
  const max_weight = formData.get('max_weight') ? Number(formData.get('max_weight')) : null
  const min_rank = formData.get('min_rank') as string
  const max_rank = formData.get('max_rank') as string

  const { error } = await supabase
    .from('categories')
    .update({
      name,
      gender,
      min_age,
      max_age,
      min_weight,
      max_weight,
      min_rank,
      max_rank
    })
    .eq('id', categoryId)
  // Implicitly secure via RLS, but if we wanted to be explicit verify ownership.
  // RLS policy "Organizers manage categories" checks event ownership.

  if (error) {
    console.error(error)
    throw new Error('Failed to update category')
  }

  revalidatePath(`/dashboard/events/${eventId}/categories`)
  return { success: true }
}

export async function deleteCategory(categoryId: string, eventId: string) {
  const { supabase, user } = await requireRole(['organizer', 'admin'])
  await assertUserRateLimit(CATEGORY_MUTATION_POLICY, user.id, ['delete', categoryId])

  // RLS handles security
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)

  if (error) {
    throw new Error('Failed to delete category')
  }

  revalidatePath(`/dashboard/events/${eventId}/categories`)
  return { success: true }
}
