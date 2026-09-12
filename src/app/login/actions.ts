'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import sql from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { verifyGoogleIdToken } from '@/lib/auth/google'
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit'

/**
 * Extracts client IP address from headers for rate limiting.
 */
async function getClientIp(): Promise<string> {
    const headerList = await headers()
    return (
        headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
        headerList.get('x-real-ip') ||
        'unknown-ip'
    )
}

/**
 * Standard email + password login for authorized users.
 */
export async function login(formData: FormData) {
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const password = formData.get('password') as string
    const clientIp = await getClientIp()

    if (!email || !password) {
        return redirect('/login?error=invalid_credentials')
    }

    // Rate limiting: 5 attempts per 15 minutes per IP + email
    const rateLimitKey = `${clientIp}:${email}`
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)

    if (!rateCheck.allowed) {
        console.warn(`[SECURITY] Rate limit exceeded for login attempt: ${email} from ${clientIp}`)
        return redirect(`/login?error=rate_limited&retry=${rateCheck.retryAfterSeconds}`)
    }

    try {
        const users = await sql<
            {
                id: string
                email: string
                password_hash: string | null
                role: string
                is_active: boolean
            }[]
        >`
            SELECT id, email, password_hash, role, is_active
            FROM users
            WHERE lower(email) = ${email}
            LIMIT 1
        `

        if (users.length === 0) {
            // Note: Keep message generic or informative as per user specification:
            // Only whitelisted users can access.
            return redirect('/login?error=invalid_credentials')
        }

        const user = users[0]

        if (!user.is_active) {
            return redirect('/login?error=account_disabled')
        }

        if (!user.password_hash) {
            // User registered via Google only without a password
            return redirect('/login?error=use_google')
        }

        const isValid = await verifyPassword(password, user.password_hash)
        if (!isValid) {
            return redirect('/login?error=invalid_credentials')
        }

        // Login successful: reset rate limit & issue session
        resetRateLimit(rateLimitKey)
        await createSession(user.id)
    } catch (err) {
        console.error('[AUTH_ERROR] Login exception:', err)
        return redirect('/login?error=auth_failed')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

/**
 * Google Sign-In verification via Google Identity Services ID Token.
 */
export async function verifyGoogleLogin(idToken: string): Promise<{ success: boolean; error?: string }> {
    const clientIp = await getClientIp()
    const rateCheck = checkRateLimit(`google:${clientIp}`, 10, 15 * 60 * 1000)

    if (!rateCheck.allowed) {
        return {
            success: false,
            error: `Too many login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        }
    }

    try {
        const result = await verifyGoogleIdToken(idToken)

        if (!result.success) {
            if (result.error === 'ACCESS_DENIED') {
                return {
                    success: false,
                    error: 'Access requested: Your account has been recorded and is awaiting administrator approval.',
                }
            }
            if (result.error === 'ACCOUNT_DISABLED') {
                return {
                    success: false,
                    error: 'Your account is pending administrator approval or has been deactivated.',
                }
            }
            return {
                success: false,
                error: 'Google authentication failed. Please try again.',
            }
        }

        resetRateLimit(`google:${clientIp}`)
        await createSession(result.user.id)
        return { success: true }
    } catch (err) {
        console.error('[AUTH_ERROR] Google verification exception:', err)
        return { success: false, error: 'Authentication service encountered an unexpected error.' }
    }
}
