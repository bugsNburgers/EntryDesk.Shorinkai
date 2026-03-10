'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertRateLimit, RateLimitExceededError, type RateLimitPolicy } from '@/lib/security/rate-limit'
import { getActionIp, key, normalizeEmail } from '@/lib/security/request-identity'
import { createClient } from '@/lib/supabase/server'

const LOGIN_ATTEMPT_POLICY: RateLimitPolicy = {
  name: 'auth-login',
  limit: 5,
  window: '10 m',
}

const SIGNUP_ATTEMPT_POLICY: RateLimitPolicy = {
  name: 'auth-signup',
  limit: 3,
  window: '30 m',
}

const GOOGLE_AUTH_POLICY: RateLimitPolicy = {
  name: 'auth-google-oauth',
  limit: 10,
  window: '10 m',
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const ip = await getActionIp()
    await assertRateLimit(
      LOGIN_ATTEMPT_POLICY,
      key(['login', 'ip', ip, 'email', normalizeEmail(email)]),
      'Too many login attempts. Please try again later.'
    )
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return redirect('/login?error=rate_limited&tab=login')
    }
    throw error
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return redirect('/login?error=invalid_credentials&tab=login')
    }
    return redirect('/login?error=auth_failed&tab=login')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string

  try {
    const ip = await getActionIp()
    await assertRateLimit(
      SIGNUP_ATTEMPT_POLICY,
      key(['signup', 'ip', ip, 'email', normalizeEmail(email)]),
      'Too many signup attempts. Please try again later.'
    )
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return redirect('/login?error=rate_limited&tab=register')
    }
    throw error
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${first_name} ${last_name}`,
      }
    }
  })

  if (error) {
    return redirect('/login?error=signup_failed&tab=register')
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=check_email&tab=login')
}

export async function loginWithGoogle() {
  try {
    const ip = await getActionIp()
    await assertRateLimit(
      GOOGLE_AUTH_POLICY,
      key(['google_oauth', 'ip', ip]),
      'Too many Google login attempts. Please try again later.'
    )
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return redirect('/login?error=rate_limited&tab=login')
    }
    throw error
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }

  if (error) {
    return redirect('/login?error=google_auth_failed&tab=login')
  }
}
