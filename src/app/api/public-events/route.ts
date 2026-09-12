import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
    try {
        const events = await sql`
            SELECT 
                id, 
                title, 
                event_type, 
                level AS event_level, 
                start_date, 
                end_date, 
                location, 
                description, 
                registration_close_date, 
                is_registration_open, 
                temporary_registration_closes_at
            FROM events
            WHERE is_public = true
            ORDER BY start_date ASC
        `

        return NextResponse.json(
            { events: events ?? [] },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                },
            }
        )
    } catch (err) {
        console.error('public-events query failed', err)
        return NextResponse.json({ events: [] }, { status: 500 })
    }
}
