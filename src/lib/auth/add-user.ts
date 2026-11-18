import sql from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import type { UserRole } from '@/types/database'

export interface CreateUserInput {
    email: string
    password?: string
    fullName: string
    role: UserRole
}

/**
 * Programmatically provisions an authorized user with email, role, and optional password.
 * Can be run via admin script or server console.
 */
export async function provisionUser({ email, password, fullName, role }: CreateUserInput) {
    const cleanEmail = email.trim().toLowerCase()
    const passwordHash = password ? await hashPassword(password) : null

    const canCreateEvents = role === 'organizer' || role === 'admin'
    const result = await sql`
        INSERT INTO users (email, password_hash, full_name, role, is_active, can_create_events)
        VALUES (${cleanEmail}, ${passwordHash}, ${fullName.trim()}, ${role}, TRUE, ${canCreateEvents})
        ON CONFLICT (email) DO UPDATE 
        SET 
            password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = TRUE,
            can_create_events = CASE WHEN EXCLUDED.role IN ('organizer', 'admin') THEN TRUE ELSE users.can_create_events END,
            updated_at = NOW()
        RETURNING id, email, full_name, role, created_at
    `

    return result[0]
}
