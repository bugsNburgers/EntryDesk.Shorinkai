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

let warnedMissingSupabaseEnv = false

function parseWindowSeconds(window: TimeWindow) {
    const [rawCount, rawUnit] = window.split(' ')
    const count = Number(rawCount)
    const unit = rawUnit as 's' | 'm' | 'h' | 'd'

    const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86_400,
    }

    return Math.max(1, Math.floor(count * multipliers[unit]))
}

async function invokeRateLimitRpc(policy: RateLimitPolicy, identifier: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        if (!warnedMissingSupabaseEnv) {
            warnedMissingSupabaseEnv = true
            console.warn('[rate-limit] Supabase env vars are missing. Limiting is currently fail-open.')
        }
        return null
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/rate_limit_check`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
            p_scope: policy.name,
            p_identifier: identifier,
            p_limit: policy.limit,
            p_window_seconds: parseWindowSeconds(policy.window),
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        const responseBody = await response.text()
        throw new Error(`rate_limit_check RPC failed: ${response.status} ${responseBody}`)
    }

    return response.json() as Promise<{
        allowed: boolean
        request_count: number
        retry_after_seconds: number
    }>
}

export type RateLimitResult = {
    success: boolean
    remaining: number
    reset: number
    retryAfterSeconds?: number
}

export async function checkRateLimit(policy: RateLimitPolicy, identifier: string): Promise<RateLimitResult> {
    try {
        const rpcResult = await invokeRateLimitRpc(policy, identifier)
        if (!rpcResult) {
            return {
                success: true,
                remaining: policy.limit,
                reset: Date.now() + 60_000,
            }
        }

        const retryAfterSeconds = rpcResult.allowed ? undefined : Math.max(1, rpcResult.retry_after_seconds)
        return {
            success: rpcResult.allowed,
            remaining: Math.max(0, policy.limit - rpcResult.request_count),
            reset: Date.now() + (rpcResult.retry_after_seconds * 1000),
            retryAfterSeconds,
        }
    } catch (error) {
        console.error('[rate-limit] RPC check failed, allowing request:', error)
        return {
            success: true,
            remaining: policy.limit,
            reset: Date.now() + 60_000,
        }
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
