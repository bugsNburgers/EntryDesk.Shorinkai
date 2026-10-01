// ============================================================================
// EntryDesk — API: Send OTP Email
// POST /api/auth/otp
// Rate-limited: 5 OTPs per email per 15 min, 10 OTPs per IP per 15 min
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { generateAndStoreOtp, sendOtpEmail, suggestEmailCorrection } from '@/lib/auth/otp'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { isEmailConfigured } from '@/lib/email'
import sql from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const email = (body?.email as string)?.trim().toLowerCase()
        const turnstileToken = (body?.turnstileToken as string | undefined)?.trim()

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address.' },
                { status: 400 }
            )
        }

        const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

        // Turnstile CAPTCHA verification (protects 100 emails/day quota against bots)
        if (process.env.TURNSTILE_SECRET_KEY) {
            if (turnstileToken) {
                try {
                    const turnstileResponse = await fetch(
                        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                secret: process.env.TURNSTILE_SECRET_KEY,
                                response: turnstileToken,
                            }),
                        }
                    )
                    const turnstileResult = await turnstileResponse.json()
                    if (!turnstileResult.success) {
                        return NextResponse.json(
                            { error: 'CAPTCHA verification failed. Please try again.' },
                            { status: 400 }
                        )
                    }
                } catch (captchaErr) {
                    console.warn('Turnstile verification error:', captchaErr)
                }
            } else {
                // If no token is provided, verify whether this is an active resend for an unexpired, unverified OTP
                const hasActiveOtp = await sql<{ id: string }[]>`
                    SELECT id FROM otp_codes 
                    WHERE email = ${email} AND used = FALSE AND expires_at > NOW()
                    LIMIT 1
                `
                if (!hasActiveOtp.length) {
                    return NextResponse.json(
                        { error: 'Please complete the CAPTCHA verification.' },
                        { status: 400 }
                    )
                }
            }
        }

        // Rate limit: per email (5 per 15 min)
        const emailLimit = await checkRateLimit(`otp:email:${email}`, 5, 15)
        if (!emailLimit.allowed) {
            return NextResponse.json(
                {
                    error: `Too many code requests for this email. Please wait ${emailLimit.retryAfterSeconds} seconds.`,
                },
                { status: 429 }
            )
        }

        // Rate limit: per IP (10 per 15 min)
        const ipLimit = await checkRateLimit(`otp:ip:${clientIp}`, 10, 15)
        if (!ipLimit.allowed) {
            return NextResponse.json(
                {
                    error: `Too many requests from your network. Please wait ${ipLimit.retryAfterSeconds} seconds.`,
                },
                { status: 429 }
            )
        }

        // Generate OTP (enforces 30s cooldown inside)
        const { code, cooldownError } = await generateAndStoreOtp(email, clientIp)
        if (cooldownError) {
            return NextResponse.json({ error: cooldownError }, { status: 429 })
        }

        // Send email
        const { sent, error: emailError } = await sendOtpEmail(email, code)
        if (!sent) {
            return NextResponse.json({ error: emailError }, { status: 500 })
        }

        // Return optional typo suggestion and devCode when no email credentials configured
        const suggestion = suggestEmailCorrection(email)
        const hasEmailCreds = isEmailConfigured()

        return NextResponse.json({
            success: true,
            ...(suggestion ? { suggestion } : {}),
            ...(!hasEmailCreds ? { devCode: code } : {}),
        })
    } catch (err) {
        console.error('[API/OTP] Error:', err)
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        )
    }
}
