import { assertRateLimit, type RateLimitPolicy } from '@/lib/security/rate-limit'
import { key } from '@/lib/security/request-identity'

export async function assertUserRateLimit(
    policy: RateLimitPolicy,
    userId: string,
    extraScope: string[] = [],
    message?: string
) {
    return assertRateLimit(policy, key(['user', userId, ...extraScope]), message)
}
