// ============================================================================
// EntryDesk — Profile Photo Upload API Route
// POST /api/upload/profile-photo
// Compulsory profile photo upload for coaches & organizers
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { uploadPhoto, removePhoto } from '@/lib/storage/photo-storage'
import { getCurrentSession } from '@/lib/auth/session'
import sql from '@/lib/db'

const MAX_UPLOAD_BYTES = 500 * 1024 // 500KB max
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: NextRequest) {
    try {
        const session = await getCurrentSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user } = session
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { error: 'Please select an image file to upload.' },
                { status: 400 }
            )
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file format. Please upload a JPG, PNG, or WebP photo.' },
                { status: 400 }
            )
        }

        // Validate size
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: `File is too large (${Math.round(file.size / 1024)}KB). Maximum allowed size is 500KB.` },
                { status: 400 }
            )
        }

        // Check for existing photo
        const existing = await sql<{ avatar_url: string | null }[]>`
            SELECT avatar_url FROM users WHERE id = ${user.id} LIMIT 1
        `
        const existingAvatar = existing[0]?.avatar_url

        const avatarUrl = await uploadPhoto(file, 'avatars')
        const updated = await sql`
            UPDATE users
            SET avatar_url = ${avatarUrl},
                updated_at = NOW()
            WHERE id = ${user.id}
              AND avatar_url IS NOT DISTINCT FROM ${existingAvatar ?? null}
            RETURNING id
        `
        if (!updated.length) {
            await removePhoto(avatarUrl)
            return NextResponse.json({ error: 'Photo changed. Refresh and try again.' }, { status: 409 })
        }
        await removePhoto(existingAvatar ?? null)

        revalidatePath('/dashboard', 'layout')

        return NextResponse.json({
            success: true,
            avatar_url: avatarUrl,
        })
    } catch (err: any) {
        console.error('Profile photo upload error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to upload profile photo. Please try again.' },
            { status: 500 }
        )
    }
}
