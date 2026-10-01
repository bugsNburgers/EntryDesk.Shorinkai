// ============================================================================
// EntryDesk — PostgreSQL-backed Rate Limiter
// Replaces the broken in-memory Map (rate-limit.ts) which had no effect across
// Vercel serverless containers. This implementation is atomic across all
// containers because it uses a single Postgres table as the state store.
// ============================================================================

import sql from '@/lib/db'

export interface RateLimitResult {
    allowed: boolean
    remainingAttempts: number
    retryAfterSeconds: number
}

/**
 * Atomically checks and increments the rate limit counter for a given key.
 *
 * @param key           - The rate limit key, e.g. "ip:1.2.3.4", "email:user@example.com"
 * @param maxAttempts   - Max allowed attempts within the window (default: 5)
 * @param windowMinutes - Window duration in minutes (default: 15)
 *
 * The INSERT ON CONFLICT is a single atomic DB round-trip — safe under concurrent load.
 * If the window has expired, it resets the counter to 1 (fresh window).
 */
export async function checkRateLimit(
    key: string,
    maxAttempts = 5,
    windowMinutes = 15
): Promise<RateLimitResult> {
    try {
        // Piggyback cleanup of stale entries to prevent unbounded table growth.
        // This is a lightweight query — expired rows have no locks held.
        // Run fire-and-forget, don't block the rate-limit check.
        sql`DELETE FROM auth_rate_limits WHERE reset_at < NOW()`.catch(() => {})

        const rows = await sql<{ count: number; reset_at: Date }[]>`
            INSERT INTO auth_rate_limits (key, count, reset_at)
            VALUES (${key}, 1, NOW() + INTERVAL '1 minute' * ${windowMinutes})
            ON CONFLICT (key)
            DO UPDATE SET
                count = CASE
                    WHEN auth_rate_limits.reset_at < NOW()
                        THEN 1
                    ELSE auth_rate_limits.count + 1
                END,
                reset_at = CASE
                    WHEN auth_rate_limits.reset_at < NOW()
                        THEN NOW() + INTERVAL '1 minute' * ${windowMinutes}
                    ELSE auth_rate_limits.reset_at
                END
            RETURNING count, reset_at
        `

        const { count, reset_at } = rows[0]
        const now = new Date()
        const retryAfterSeconds =
            count > maxAttempts
                ? Math.max(0, Math.ceil((reset_at.getTime() - now.getTime()) / 1000))
                : 0

        return {
            allowed: count <= maxAttempts,
            remainingAttempts: Math.max(0, maxAttempts - count),
            retryAfterSeconds,
        }
    } catch (err) {
        // If the DB is down, fail open (allow) to avoid locking out all users.
        // Log the error so it gets alerted on.
        console.error('[RATE_LIMIT_ERROR] Failed to check rate limit:', err)
        return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 }
    }
}

/**
 * Resets the rate limit counter for a key after a successful authentication.
 * Call this after a successful login so legitimate users are never throttled.
 */
export async function resetRateLimit(key: string): Promise<void> {
    try {
        await sql`DELETE FROM auth_rate_limits WHERE key = ${key}`
    } catch (err) {
        // Non-critical: if reset fails, the window will expire naturally
        console.error('[RATE_LIMIT_ERROR] Failed to reset rate limit:', err)
    }
}
