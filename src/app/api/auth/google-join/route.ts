// ============================================================================
// EntryDesk — API: Google Join (Parent Sign-up via Dojo Link)
// POST /api/auth/google-join
// Allows parents to sign up with Google via a /join/[slug] link.
// Unlike the main login (which is whitelist-only), this auto-creates the account.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { verifyGoogleIdToken } from '@/lib/auth/google'
import { createSession } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import sql from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const idToken = body?.idToken as string
        const dojoSlug = (body?.dojoSlug as string)?.trim() || null

        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required.' }, { status: 400 })
        }

        const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

        // Rate limit: 10 per IP per 15 min
        const limit = await checkRateLimit(`google-join:${clientIp}`, 10, 15)
        if (!limit.allowed) {
            return NextResponse.json(
                { error: `Too many attempts. Please try again in ${limit.retryAfterSeconds} seconds.` },
                { status: 429 }
            )
        }

        // Verify the token with Google
        const verifyResult = await verifyGoogleIdToken(idToken, { allowNewParent: true })

        if (!verifyResult.success) {
            const errorMessages: Record<string, string> = {
                INVALID_TOKEN: 'Google verification failed. Please try again.',
                CONFIGURATION_ERROR: 'Authentication service is not configured.',
                ACCOUNT_DISABLED: 'This account has been deactivated. Please contact your coach.',
            }
            return NextResponse.json(
                { error: errorMessages[verifyResult.error] ?? 'Sign-in failed. Please try again.' },
                { status: 401 }
            )
        }

        const { user } = verifyResult

        // Validate dojo slug if provided
        let redirectTo = '/athlete'
        if (dojoSlug) {
            const dojos = await sql<{ id: string; join_link_enabled: boolean }[]>`
                SELECT id, join_link_enabled
                FROM dojos
                WHERE slug = ${dojoSlug}
                LIMIT 1
            `
            if (dojos.length > 0 && dojos[0].join_link_enabled) {
                redirectTo = `/athlete?joinedDojo=${dojoSlug}`
            }
        }

        await createSession(user.id, user.role)

        const response = NextResponse.json({ success: true, redirectTo })
        if (dojoSlug) {
            response.cookies.set('parent_dojo_slug', dojoSlug, {
                path: '/',
                maxAge: 30 * 24 * 60 * 60,
                sameSite: 'lax',
            })
        }
        return response
    } catch (err) {
        console.error('[API/GOOGLE-JOIN] Error:', err)
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        )
    }
}
