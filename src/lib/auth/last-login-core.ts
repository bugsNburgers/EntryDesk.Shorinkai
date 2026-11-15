// "Last used" sign-in hint — pure helpers (no next/headers, safe in client components and unit tests).
// The hint is NOT a session and grants nothing. It only remembers HOW this browser last signed in
// (Google / email code / password) and a masked email, so the login page can say "Last used".
// See .agents/modules/auth.md.

export type LastLoginMethod = 'google' | 'email_code' | 'password'

export interface LastLogin {
    method: LastLoginMethod
    /** Masked on purpose, e.g. "p***@gmail.com". The full address is never stored in the cookie. */
    maskedEmail: string
}

export const LAST_LOGIN_COOKIE_NAME = 'entrydesk_last_login'
/** The hint is harmless, so it outlives the session (parents: 90 d, staff: 7 d). */
export const LAST_LOGIN_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

const METHODS: readonly LastLoginMethod[] = ['google', 'email_code', 'password']

export const LAST_LOGIN_METHOD_LABEL: Record<LastLoginMethod, string> = {
    google: 'Google',
    email_code: 'an email code',
    password: 'a password',
}

/** Keeps only characters that are safe in a cookie value and in an email, and caps the length. */
function safe(value: string, max: number): string {
    return value.replace(/[^A-Za-z0-9._+\-@*]/g, '').slice(0, max)
}

/** "pratik.y@gmail.com" -> "p***@gmail.com". Returns '' when the input is not an email. */
export function maskEmail(email: string): string {
    const at = email.trim().lastIndexOf('@')
    if (at < 1 || at === email.trim().length - 1) return ''
    const trimmed = email.trim()
    const local = trimmed.slice(0, at)
    const domain = trimmed.slice(at + 1)
    const first = safe(local.charAt(0), 1)
    const safeDomain = safe(domain, 120).replace(/@/g, '')
    if (!first || !safeDomain) return ''
    return `${first}***@${safeDomain}`
}

export function serializeLastLogin(method: LastLoginMethod, email: string): string | null {
    const maskedEmail = maskEmail(email)
    if (!maskedEmail || !METHODS.includes(method)) return null
    return `${method}|${maskedEmail}`
}

/** Tolerant parser: anything unexpected (tampered, truncated, old format) returns null, never throws. */
export function parseLastLogin(raw: string | undefined | null): LastLogin | null {
    if (!raw || raw.length > 200) return null
    const sep = raw.indexOf('|')
    if (sep < 1) return null
    const method = raw.slice(0, sep) as LastLoginMethod
    if (!METHODS.includes(method)) return null
    const maskedEmail = raw.slice(sep + 1)
    if (!/^[A-Za-z0-9._+\-]\*\*\*@[A-Za-z0-9.\-]{1,120}$/.test(maskedEmail)) return null
    return { method, maskedEmail }
}
