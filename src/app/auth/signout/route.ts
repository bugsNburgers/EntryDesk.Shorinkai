import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkRateLimit, type RateLimitPolicy } from '@/lib/security/rate-limit'
import { getIpFromHeaders, key } from '@/lib/security/request-identity'

const SIGNOUT_POLICY: RateLimitPolicy = {
  name: 'auth-signout-route',
  limit: 20,
  window: '10 m',
}

export async function POST(request: Request) {
  const ip = getIpFromHeaders(request.headers)
  const rateLimitResult = await checkRateLimit(SIGNOUT_POLICY, key(['signout', 'ip', ip]))
  if (!rateLimitResult.success) {
    const url = new URL('/dashboard?error=rate_limited', request.url)
    return NextResponse.redirect(url, {
      status: 303,
      headers: {
        'Retry-After': String(rateLimitResult.retryAfterSeconds ?? 60),
      },
    })
  }

  const supabase = await createClient()

  // Check if we have a session
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
