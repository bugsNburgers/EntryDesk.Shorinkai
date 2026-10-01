import { cookies } from 'next/headers'
import crypto from 'crypto'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import sql from '@/lib/db'
import type { User, UserRole } from '@/types/database'

export const SESSION_COOKIE_NAME = 'entrydesk_session'

/**
 * Session durations by role.
 * Parents are on mobile, rarely technical — long sessions avoid confusing re-login prompts.
 * Coaches/organisers/admins have shorter sessions for security.
 */
const SESSION_DURATION_BY_ROLE: Record<UserRole, number> = {
    parent: 90 * 24 * 60 * 60,    // 90 days
    coach: 7 * 24 * 60 * 60,       // 7 days
    organizer: 7 * 24 * 60 * 60,   // 7 days
    admin: 7 * 24 * 60 * 60,       // 7 days
}

const DEFAULT_SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days fallback

export interface AuthenticatedUser {
    id: string
    email: string
    role: UserRole
    full_name: string | null
    avatar_url: string | null
}

export interface SessionData {
    sessionId: string
    expiresAt: Date
    user: AuthenticatedUser
}

/**
 * Hashes a session token with SHA-256 before storing or querying the database.
 * This prevents session theft even in the unlikely event of database read access.
 */
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Creates a new session in Postgres and sets an HttpOnly cookie.
 * Also piggybacks cleanup of expired sessions and stale rate limits to prevent
 * unbounded table growth without needing a cron job.
 */
export async function createSession(
    userId: string,
    role: UserRole = 'coach',
    userAgent?: string,
    ipAddress?: string
): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)
    const durationSeconds = SESSION_DURATION_BY_ROLE[role] ?? DEFAULT_SESSION_DURATION
    const expiresAt = new Date(Date.now() + durationSeconds * 1000)

    await sql`
        INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ip_address)
        VALUES (${userId}, ${tokenHash}, ${expiresAt}, ${userAgent ?? null}, ${ipAddress ?? null})
    `

    // Piggyback cleanup — fire-and-forget, never block session creation
    sql`DELETE FROM sessions WHERE expires_at < NOW()`.catch(() => {})

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: durationSeconds,
    })

    return rawToken
}

/**
 * Destroys the current session from the database and removes the cookie.
 */
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
        const tokenHash = hashToken(token)
        try {
            await sql`DELETE FROM sessions WHERE session_token = ${tokenHash}`
        } catch {
            // Silently ignore DB errors during logout
        }
        cookieStore.delete(SESSION_COOKIE_NAME)
    }
}

/**
 * Retrieves and validates the current active session.
 * Uses React cache() so multiple components/actions in a single request share the result.
 */
export const getCurrentSession = cache(async (): Promise<SessionData | null> => {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!token) {
            return null
        }

        const tokenHash = hashToken(token)

        const rows = await sql<
            {
                session_id: string
                expires_at: Date
                user_id: string
                email: string
                role: UserRole
                full_name: string | null
                avatar_url: string | null
                is_active: boolean
            }[]
        >`
            SELECT 
                s.id AS session_id,
                s.expires_at,
                u.id AS user_id,
                u.email,
                u.role,
                u.full_name,
                u.avatar_url,
                u.is_active
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ${tokenHash}
              AND s.expires_at > NOW()
              AND u.is_active = TRUE
            LIMIT 1
        `

        if (rows.length === 0) {
            // Stale or invalid session - clean up cookie
            try {
                cookieStore.delete(SESSION_COOKIE_NAME)
            } catch {
                // Ignore cookie mutation error if in Server Component render
            }
            return null
        }

        const row = rows[0]

        return {
            sessionId: row.session_id,
            expiresAt: row.expires_at,
            user: {
                id: row.user_id,
                email: row.email,
                role: row.role,
                full_name: row.full_name,
                avatar_url: row.avatar_url,
            },
        }
    } catch {
        return null
    }
})

/**
 * Backward compatibility alias — returns { user, profile, role }.
 * All existing code importing getUserProfile from session.ts continues to work.
 * When unauthenticated, redirects to /login?callbackUrl=<current-path> so users
 * return to where they were after re-authenticating (session expiry handling).
 */
export const getUserProfile = cache(async () => {
    const sessionData = await getCurrentSession()
    if (!sessionData) {
        // Attempt to grab the current pathname from request headers so we can
        // redirect back here after login. This works in both Server Components
        // and Server Actions (Next.js sets x-invoke-path or x-pathname).
        let callbackPath = '/dashboard'
        try {
            const { headers } = await import('next/headers')
            const headersList = await headers()
            const invokePath =
                headersList.get('x-pathname') ||
                headersList.get('x-invoke-path') ||
                headersList.get('x-forwarded-uri')
            if (invokePath && invokePath.startsWith('/') && !invokePath.startsWith('//')) {
                callbackPath = invokePath
            }
        } catch {
            // headers() may throw in some contexts (e.g., edge); fall back to /dashboard
        }
        redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`)
    }

    const { user } = sessionData
    return {
        user,
        profile: user,
        role: user.role,
    }
})

/**
 * Strict role-based guard for Server Components and Server Actions.
 * Throws redirect if unauthenticated; throws Error if role is insufficient.
 */
export async function requireRole(
    allowed: UserRole | UserRole[],
    options?: { redirectTo?: string }
) {
    const { user, profile, role } = await getUserProfile()
    const allowedRoles = Array.isArray(allowed) ? allowed : [allowed]

    if (!allowedRoles.includes(role)) {
        if (options?.redirectTo) {
            redirect(options.redirectTo)
        }
        throw new Error('Unauthorized: Insufficient permissions for this action')
    }

    return { user, profile, role }
}
