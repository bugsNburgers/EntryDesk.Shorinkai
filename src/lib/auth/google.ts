import { OAuth2Client } from 'google-auth-library'
import sql from '@/lib/db'
import type { UserRole } from '@/types/database'

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const oauthClient = new OAuth2Client(googleClientId)

export interface VerifiedGoogleUser {
    id: string
    email: string
    fullName: string
    avatarUrl: string | null
    role: UserRole
}

export type GoogleAuthResult =
    | { success: true; user: VerifiedGoogleUser }
    | { success: false; error: 'INVALID_TOKEN' | 'ACCESS_DENIED' | 'CONFIGURATION_ERROR' | 'ACCOUNT_DISABLED' }

/**
 * Sanitizes input string to remove harmful characters and control codes.
 */
function sanitizeString(input?: string | null): string {
    if (!input) return ''
    return input.trim().replace(/[\x00-\x1F\x7F]/g, '')
}

/**
 * Validates and verifies a Google ID Token directly with Google's public certificates.
 * Checks signature, audience (aud), issuer (iss), and expiry (exp).
 * Strictly enforces that only pre-authorized users can log in (No public signup).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleAuthResult> {
    if (!googleClientId) {
        console.error('[AUTH_SECURITY] GOOGLE_CLIENT_ID is not configured in environment variables.')
        return { success: false, error: 'CONFIGURATION_ERROR' }
    }

    let payload
    try {
        const ticket = await oauthClient.verifyIdToken({
            idToken,
            audience: googleClientId,
        })
        payload = ticket.getPayload()
    } catch (err) {
        // Security: Log failure without leaking token or sensitive info
        console.warn('[AUTH_SECURITY] Google ID token verification failed:', (err as Error).message)
        return { success: false, error: 'INVALID_TOKEN' }
    }

    if (!payload || !payload.email) {
        console.warn('[AUTH_SECURITY] Google ID token payload missing email')
        return { success: false, error: 'INVALID_TOKEN' }
    }

    // Verify issuer is Google
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com']
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
        console.warn('[AUTH_SECURITY] Invalid Google token issuer:', payload.iss)
        return { success: false, error: 'INVALID_TOKEN' }
    }

    const email = sanitizeString(payload.email).toLowerCase()
    const googleId = sanitizeString(payload.sub)
    const name = sanitizeString(payload.name) || email.split('@')[0]
    const picture = payload.picture ? sanitizeString(payload.picture) : null

    // STRICT CHECK: The user must already exist in the database (Pre-approved / whitelisted).
    // No public registration. Only individuals given access can log in.
    const users = await sql<
        {
            id: string
            email: string
            role: UserRole
            full_name: string | null
            avatar_url: string | null
            is_active: boolean
        }[]
    >`
        SELECT id, email, role, full_name, avatar_url, is_active
        FROM users
        WHERE lower(email) = ${email}
        LIMIT 1
    `

    if (users.length === 0) {
        // Record user as inactive (pending approval) so admin sees them in Neon DB
        await sql`
            INSERT INTO users (email, full_name, avatar_url, google_id, role, is_active)
            VALUES (${email}, ${name}, ${picture}, ${googleId}, 'coach', FALSE)
            ON CONFLICT (email) DO NOTHING
        `
        console.warn(`[AUTH_SECURITY] New Google user registered (pending approval): ${email}`)
        return { success: false, error: 'ACCESS_DENIED' }
    }

    const existingUser = users[0]

    if (!existingUser.is_active) {
        console.warn(`[AUTH_SECURITY] Pending/Inactive user attempted Google login: ${email}`)
        return { success: false, error: 'ACCOUNT_DISABLED' }
    }

    // Update google_id and avatar_url if needed
    await sql`
        UPDATE users
        SET 
            google_id = COALESCE(google_id, ${googleId}),
            avatar_url = COALESCE(avatar_url, ${picture}),
            full_name = COALESCE(full_name, ${name}),
            updated_at = NOW()
        WHERE id = ${existingUser.id}
    `

    return {
        success: true,
        user: {
            id: existingUser.id,
            email: existingUser.email,
            fullName: existingUser.full_name || name,
            avatarUrl: existingUser.avatar_url || picture,
            role: existingUser.role,
        },
    }
}
