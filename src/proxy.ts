import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, type RateLimitPolicy } from '@/lib/security/rate-limit'
import { getIpFromHeaders, key } from '@/lib/security/request-identity'
import { updateSession } from '@/lib/supabase/middleware'

const DASHBOARD_POLICY: RateLimitPolicy = {
    name: 'proxy-dashboard',
    limit: 240,
    window: '1 m',
}

const API_POLICY: RateLimitPolicy = {
    name: 'proxy-api',
    limit: 120,
    window: '1 m',
}

const LOGIN_POLICY: RateLimitPolicy = {
    name: 'proxy-login',
    limit: 40,
    window: '1 m',
}

const SIGNOUT_POLICY: RateLimitPolicy = {
    name: 'proxy-signout',
    limit: 30,
    window: '1 m',
}

function policyForPath(pathname: string): RateLimitPolicy {
    if (pathname.startsWith('/api/')) return API_POLICY
    if (pathname === '/login') return LOGIN_POLICY
    if (pathname.startsWith('/auth/signout')) return SIGNOUT_POLICY
    return DASHBOARD_POLICY
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const policy = policyForPath(pathname)
    const ip = getIpFromHeaders(request.headers)

    const result = await checkRateLimit(policy, key(['ip', ip]))
    if (!result.success) {
        return new NextResponse('Too many requests. Please try again shortly.', {
            status: 429,
            headers: {
                'Retry-After': String(result.retryAfterSeconds ?? 60),
            },
        })
    }

    return await updateSession(request)
}

export const config = {
    matcher: ['/dashboard/:path*', '/api/:path*', '/login', '/auth/signout'],
}
