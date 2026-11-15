// Server-side read/write of the "last used" sign-in hint cookie. See last-login-core.ts.
// HttpOnly on purpose: the server renders the hint into the page, so client JS never needs to read it
// (no flash of the wrong state, and nothing for an XSS to steal).

import { cookies } from 'next/headers'
import {
    LAST_LOGIN_COOKIE_NAME,
    LAST_LOGIN_MAX_AGE_SECONDS,
    parseLastLogin,
    serializeLastLogin,
    type LastLogin,
    type LastLoginMethod,
} from './last-login-core'

/** Call after a sign-in has actually succeeded (never on failure). Never throws: this is cosmetic. */
export async function rememberLastLogin(method: LastLoginMethod, email: string): Promise<void> {
    try {
        const value = serializeLastLogin(method, email)
        if (!value) return
        const cookieStore = await cookies()
        cookieStore.set(LAST_LOGIN_COOKIE_NAME, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: LAST_LOGIN_MAX_AGE_SECONDS,
        })
    } catch (err) {
        console.warn('[AUTH] Could not remember last sign-in method:', err)
    }
}

export async function readLastLogin(): Promise<LastLogin | null> {
    try {
        const cookieStore = await cookies()
        return parseLastLogin(cookieStore.get(LAST_LOGIN_COOKIE_NAME)?.value)
    } catch {
        return null
    }
}

export async function clearLastLogin(): Promise<void> {
    try {
        const cookieStore = await cookies()
        cookieStore.delete(LAST_LOGIN_COOKIE_NAME)
    } catch {
        // Ignore: cookie mutation is not possible in every render context.
    }
}
