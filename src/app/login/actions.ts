'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import sql from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, destroySession } from '@/lib/auth/session'
import { verifyGoogleIdToken } from '@/lib/auth/google'
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit'
import { clearLastLogin, rememberLastLogin } from '@/lib/auth/last-login'

/**
 * Standard logout server action. Destroys session and redirects to /login.
 */
export async function logout() {
    await destroySession()
    revalidatePath('/', 'layout')
    redirect('/login')
}

/**
 * "Not you?" on the login page: forget the remembered sign-in method/email for this browser.
 * Only removes the cosmetic hint cookie; it never touches a session.
 */
export async function forgetLastLogin() {
    await clearLastLogin()
}

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
    const rawCallback = formData.get('callbackUrl') as string | null
    // Strictly validate callbackUrl — only allow same-origin relative paths
    const callbackUrl =
        rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//')
            ? rawCallback
            : '/dashboard'
    const clientIp = await getClientIp()

    if (!email || !password) {
        return redirect('/login?error=invalid_credentials')
    }

    // Rate limiting: 5 attempts per 15 minutes per IP + email
    const rateLimitKey = `${clientIp}:${email}`
    const rateCheck = await checkRateLimit(rateLimitKey, 5, 15)

    if (!rateCheck.allowed) {
        console.warn(`[SECURITY] Rate limit exceeded for login attempt: ${email} from ${clientIp}`)
        return redirect(`/login?error=rate_limited&retry=${rateCheck.retryAfterSeconds}`)
    }

    // redirect() works by throwing, so it must never be called inside this try/catch
    // (the catch would swallow it and show "auth_failed" for every wrong password).
    let failure: string | null = null
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

        const user = users[0]

        // Generic message for unknown email and wrong password alike (no account enumeration).
        if (!user) {
            failure = 'invalid_credentials'
        } else if (!user.is_active) {
            failure = 'account_disabled'
        } else if (!user.password_hash) {
            // User registered via Google only without a password
            failure = 'use_google'
        } else if (!(await verifyPassword(password, user.password_hash))) {
            failure = 'invalid_credentials'
        } else {
            // Login successful: reset rate limit & issue session
            resetRateLimit(rateLimitKey)
            await createSession(user.id, user.role as import('@/types/database').UserRole)
            await rememberLastLogin('password', user.email)
        }
    } catch (err) {
        console.error('[AUTH_ERROR] Login exception:', err)
        failure = 'auth_failed'
    }

    if (failure) return redirect(`/login?error=${failure}`)

    revalidatePath('/', 'layout')
    redirect(callbackUrl)
}

/**
 * Google Sign-In verification via Google Identity Services ID Token.
 */
export async function verifyGoogleLogin(idToken: string): Promise<{ success: boolean; error?: string }> {
    const clientIp = await getClientIp()
    const rateCheck = await checkRateLimit(`google:${clientIp}`, 10, 15)

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
        await createSession(result.user.id, result.user.role)
        await rememberLastLogin('google', result.user.email)
        return { success: true }
    } catch (err) {
        console.error('[AUTH_ERROR] Google verification exception:', err)
        return { success: false, error: 'Authentication service encountered an unexpected error.' }
    }
}
