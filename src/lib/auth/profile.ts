interface UserLike {
    email?: string | null
    full_name?: string | null
    user_metadata?: {
        full_name?: string
        name?: string
        display_name?: string
    }
}

const ROLE_LIKE_NAMES = new Set(['coach', 'organizer', 'admin'])

export function looksLikeRoleName(value: string | null | undefined) {
    if (!value) return false
    return ROLE_LIKE_NAMES.has(value.trim().toLowerCase())
}

function normalizeCandidate(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (looksLikeRoleName(trimmed)) return null
    return trimmed
}

/**
 * Best-effort human display name.
 */
export function deriveFullName(user: UserLike): string {
    const meta = user?.user_metadata

    const candidates: Array<string | null> = [
        normalizeCandidate(user?.full_name),
        normalizeCandidate(meta?.full_name),
        normalizeCandidate(meta?.name),
        normalizeCandidate(meta?.display_name),
    ]

    for (const candidate of candidates) {
        if (candidate) return candidate
    }

    const email = user?.email
    if (email) {
        return email.split('@')[0]
    }

    return 'User'
}
