// ============================================================================
// EntryDesk — API: Verify OTP + Create Parent Session (or link to join slug)
// POST /api/auth/otp/verify
// Body: { email, code, dojoSlug? }
//   dojoSlug - when present, auto-creates parent account and links to dojo
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { verifyOtp } from '@/lib/auth/otp'
import { createSession } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import sql from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const email = (body?.email as string)?.trim().toLowerCase()
        const code = (body?.code as string)?.trim()
        const dojoSlug = (body?.dojoSlug as string)?.trim() || null

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email and code are required.' },
                { status: 400 }
            )
        }

        if (!/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { error: 'Code must be 6 digits.' },
                { status: 400 }
            )
        }

        const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

        // Light rate limit on verify endpoint to prevent brute force
        const limit = await checkRateLimit(`otp:verify:${clientIp}`, 20, 15)
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please try again later.' },
                { status: 429 }
            )
        }

        const result = await verifyOtp(email, code)

        if (!result.success) {
            const messages: Record<string, string> = {
                expired: 'This code has expired. Please request a new one.',
                invalid: 'Incorrect code. Please check and try again.',
                max_attempts: 'Too many wrong attempts. Please request a new code.',
                not_found: 'No active code found for this email. Please request a new one.',
            }
            return NextResponse.json(
                { error: messages[result.error] ?? 'Invalid code.' },
                { status: 400 }
            )
        }

        // OTP valid — upsert parent user
        const name = email.split('@')[0]

        const rows = await sql<{ id: string; role: string; is_active: boolean }[]>`
            INSERT INTO users (email, full_name, role, is_active)
            VALUES (${email}, ${name}, 'parent', TRUE)
            ON CONFLICT (email) DO UPDATE
                SET is_active = TRUE
            RETURNING id, role, is_active
        `

        const user = rows[0]

        if (!user) {
            return NextResponse.json(
                { error: 'Failed to create account. Please try again.' },
                { status: 500 }
            )
        }

        // If joining via a dojo link, verify slug and link dojo to user
        let redirectTo = '/athlete'
        if (dojoSlug) {
            const dojos = await sql<{ id: string; join_link_enabled: boolean }[]>`
                SELECT id, join_link_enabled
                FROM dojos
                WHERE slug = ${dojoSlug}
                LIMIT 1
            `
            if (dojos.length > 0 && dojos[0].join_link_enabled) {
                // Store pending dojo link in session — actual child-to-dojo link happens when parent adds child
                redirectTo = `/athlete?joinedDojo=${dojoSlug}`
            }
        }

        await createSession(user.id, 'parent')

        const response = NextResponse.json({
            success: true,
            redirectTo,
        })
        if (dojoSlug) {
            response.cookies.set('parent_dojo_slug', dojoSlug, {
                path: '/',
                maxAge: 30 * 24 * 60 * 60,
                sameSite: 'lax',
            })
        }
        return response
    } catch (err) {
        console.error('[API/OTP/VERIFY] Error:', err)
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        )
    }
}

// Suppress unused import warning - crypto used for potential future token needs
void crypto
