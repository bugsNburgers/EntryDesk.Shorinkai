'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { assertUserRateLimit } from '@/lib/security/action-rate-limit'
import { type RateLimitPolicy } from '@/lib/security/rate-limit'

const DOJO_MUTATION_POLICY: RateLimitPolicy = {
  name: 'action-dojo-mutation',
  limit: 20,
  window: '1 m',
}

export async function createDojo(formData: FormData) {
  const { supabase, user } = await requireRole('coach')
  await assertUserRateLimit(DOJO_MUTATION_POLICY, user.id, ['create'])

  const nameValue = formData.get('name')
  const name = typeof nameValue === 'string' ? nameValue.trim() : ''

  if (!name) {
    throw new Error('Dojo name is required')
  }

  const { error } = await supabase
    .from('dojos')
    .insert({
      name,
      coach_id: user.id
    })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/dojos')
  return { success: true }
}

export async function updateDojo(dojoId: string, formData: FormData) {
  const { supabase, user } = await requireRole('coach')
  await assertUserRateLimit(DOJO_MUTATION_POLICY, user.id, ['update', dojoId])

  const nameValue = formData.get('name')
  const name = typeof nameValue === 'string' ? nameValue.trim() : ''

  if (!name) {
    throw new Error('Dojo name is required')
  }

  const { error } = await supabase
    .from('dojos')
    .update({ name })
    .eq('id', dojoId)
    .eq('coach_id', user.id) // Security check

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/dojos')
  return { success: true }
}

export async function deleteDojo(dojoId: string) {
  const { supabase, user } = await requireRole('coach')
  await assertUserRateLimit(DOJO_MUTATION_POLICY, user.id, ['delete', dojoId])

  const { error } = await supabase
    .from('dojos')
    .delete()
    .eq('id', dojoId)
    .eq('coach_id', user.id) // Security check

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/dojos')
  return { success: true }
}
