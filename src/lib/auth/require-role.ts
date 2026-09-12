import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getCurrentSession } from '@/lib/auth/session'
import type { UserRole, Profile } from '@/types/database'

export type { UserRole }

export const getUserProfile = cache(async () => {
    const sessionData = await getCurrentSession()

    if (!sessionData) {
        redirect('/login')
    }

    const { user } = sessionData
    const profile: Profile = {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: new Date().toISOString(),
    }

    return {
        user: {
            id: user.id,
            email: user.email,
            user_metadata: {
                full_name: user.full_name,
                avatar_url: user.avatar_url,
            },
        },
        profile,
        role: user.role,
    }
})

export async function requireRole(
    allowed: UserRole | UserRole[],
    options?: { redirectTo?: string }
) {
    const { user, profile, role } = await getUserProfile()
    const allowedRoles = Array.isArray(allowed) ? allowed : [allowed]

    if (!allowedRoles.includes(role)) {
        if (options?.redirectTo) {
            redirect(options.redirectTo)
        }
        throw new Error('Unauthorized: Insufficient permissions for this action')
    }

    return { user, profile, role }
}
