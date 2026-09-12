import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth/session'

export async function GET() {
    const session = await getCurrentSession()
    if (!session) {
        return NextResponse.json({ authenticated: false, user: null })
    }

    return NextResponse.json({
        authenticated: true,
        user: {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            full_name: session.user.full_name,
        },
    })
}
