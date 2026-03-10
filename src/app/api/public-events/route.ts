import { NextResponse } from 'next/server'
import { checkRateLimit, type RateLimitPolicy } from '@/lib/security/rate-limit'
import { getIpFromHeaders, key } from '@/lib/security/request-identity'
import { createClient } from '@/lib/supabase/server'

const PUBLIC_EVENTS_POLICY: RateLimitPolicy = {
    name: 'api-public-events',
    limit: 60,
    window: '1 m',
}

export async function GET(request: Request) {
    try {
        const ip = getIpFromHeaders(request.headers)
        const rateLimitResult = await checkRateLimit(PUBLIC_EVENTS_POLICY, key(['public_events', 'ip', ip]))
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { events: [], error: 'rate_limited' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimitResult.retryAfterSeconds ?? 60),
                    },
                }
            )
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('events')
            .select('id,title,event_type,start_date,end_date,location,description,registration_close_date,is_registration_open')
            .eq('is_public', true)
            .order('start_date', { ascending: true })

        if (error) {
            console.error('public-events query failed', error)
            return NextResponse.json({ events: [] }, { status: 500 })
        }

        return NextResponse.json(
            { events: data ?? [] },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                },
            }
        )
    } catch {
        return NextResponse.json({ events: [] }, { status: 500 })
    }
}
