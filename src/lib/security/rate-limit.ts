import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type TimeWindow = `${number} s` | `${number} m` | `${number} h` | `${number} d`

export type RateLimitPolicy = {
    name: string
    limit: number
    window: TimeWindow
}

export class RateLimitExceededError extends Error {
    readonly retryAfterSeconds?: number

    constructor(message: string, retryAfterSeconds?: number) {
        super(message)
        this.name = 'RateLimitExceededError'
        this.retryAfterSeconds = retryAfterSeconds
    }
}

let warnedMissingRedisEnv = false
let redisClient: Redis | null = null

const limiterByPolicy = new Map<string, Ratelimit>()

function getRedisClient() {
    if (redisClient) return redisClient

    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        if (!warnedMissingRedisEnv) {
            warnedMissingRedisEnv = true
            console.warn('[rate-limit] Upstash Redis env vars are missing. Limiting is currently fail-open.')
        }
        return null
    }

    redisClient = new Redis({ url, token })
    return redisClient
}

function getLimiter(policy: RateLimitPolicy) {
    const key = `${policy.name}:${policy.limit}:${policy.window}`
    const cached = limiterByPolicy.get(key)
    if (cached) return cached

    const redis = getRedisClient()
    if (!redis) return null

    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
        prefix: `entrydesk:rl:${policy.name}`,
        analytics: true,
    })

    limiterByPolicy.set(key, limiter)
    return limiter
}

export type RateLimitResult = {
    success: boolean
    remaining: number
    reset: number
    retryAfterSeconds?: number
}

export async function checkRateLimit(policy: RateLimitPolicy, identifier: string): Promise<RateLimitResult> {
    const limiter = getLimiter(policy)

    if (!limiter) {
        return {
            success: true,
            remaining: policy.limit,
            reset: Date.now() + 60_000,
        }
    }

    const result = await limiter.limit(identifier)
    const retryAfterSeconds = result.success
        ? undefined
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))

    return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        retryAfterSeconds,
    }
}

export async function assertRateLimit(policy: RateLimitPolicy, identifier: string, message?: string) {
    const result = await checkRateLimit(policy, identifier)

    if (!result.success) {
        throw new RateLimitExceededError(
            message ?? 'Too many requests. Please try again later.',
            result.retryAfterSeconds
        )
    }

    return result
}
