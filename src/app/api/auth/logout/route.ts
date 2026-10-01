// ============================================================================
// EntryDesk — API: Logout
// POST /api/auth/logout
// Destroys session and clears cookie
// ============================================================================

import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth/session'

export async function POST() {
    try {
        await destroySession()
        return NextResponse.json({ success: true })
    } catch {
        // Always succeed on logout
        return NextResponse.json({ success: true })
    }
}
