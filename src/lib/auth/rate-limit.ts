/**
 * Simple in-memory sliding window rate limiter for login & auth attempts.
 * Prevents automated brute-force attacks.
 */
interface RateLimitEntry {
    count: number
    resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up stale entries every 10 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(key)
        }
    }
}, 10 * 60 * 1000)

/**
 * Checks if an identifier (IP address or email) is within allowed rate limits.
 * Default: 5 attempts per 15 minutes.
 */
export function checkRateLimit(
    identifier: string,
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
    const now = Date.now()
    const entry = rateLimitMap.get(identifier)

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(identifier, {
            count: 1,
            resetTime: now + windowMs,
        })
        return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 }
    }

    if (entry.count >= maxAttempts) {
        const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000)
        return { allowed: false, remainingAttempts: 0, retryAfterSeconds }
    }

    entry.count += 1
    return {
        allowed: true,
        remainingAttempts: maxAttempts - entry.count,
        retryAfterSeconds: 0,
    }
}

/**
 * Resets the rate limit for a successful login.
 */
export function resetRateLimit(identifier: string): void {
    rateLimitMap.delete(identifier)
}
