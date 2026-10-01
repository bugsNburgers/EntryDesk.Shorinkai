// ============================================================================
// EntryDesk — Athlete Photo Upload API Route
// POST /api/upload/photo  -> Uploads & compresses photo, stores in Vercel Blob
// DELETE /api/upload/photo -> Removes athlete photo
// Authentication: Parent (owns child) or Coach (owns dojo) or Admin.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { put, del } from '@vercel/blob'
import { getCurrentSession } from '@/lib/auth/session'
import sql from '@/lib/db'
import { audit, AUDIT_ACTIONS } from '@/lib/audit'

const MAX_UPLOAD_BYTES = 200 * 1024 // 200KB max after compression
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Verify user has permission to edit this student's photo.
 */
async function verifyStudentAccess(
    userId: string,
    role: string,
    studentId: string
): Promise<{ allowed: boolean; studentName?: string; existingPhotoUrl?: string | null }> {
    if (role === 'admin') {
        const rows = await sql<{ name: string; photo_url: string | null }[]>`
            SELECT name, photo_url FROM students WHERE id = ${studentId} LIMIT 1
        `
        return {
            allowed: rows.length > 0,
            studentName: rows[0]?.name,
            existingPhotoUrl: rows[0]?.photo_url,
        }
    }

    if (role === 'parent') {
        const rows = await sql<{ name: string; photo_url: string | null }[]>`
            SELECT name, photo_url FROM students
            WHERE id = ${studentId} AND parent_id = ${userId}
            LIMIT 1
        `
        return {
            allowed: rows.length > 0,
            studentName: rows[0]?.name,
            existingPhotoUrl: rows[0]?.photo_url,
        }
    }

    if (role === 'coach') {
        const rows = await sql<{ name: string; photo_url: string | null }[]>`
            SELECT s.name, s.photo_url FROM students s
            JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN dojo_collaborators dc ON d.id = dc.dojo_id AND dc.user_id = ${userId}
            WHERE s.id = ${studentId}
              AND (d.coach_id = ${userId} OR (dc.user_id = ${userId} AND dc.permission = 'write'))
            LIMIT 1
        `
        return {
            allowed: rows.length > 0,
            studentName: rows[0]?.name,
            existingPhotoUrl: rows[0]?.photo_url,
        }
    }

    return { allowed: false }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getCurrentSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user } = session
        const role = user.role

        if (!['parent', 'coach', 'admin'].includes(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const formData = await req.formData()
        const studentId = formData.get('studentId') as string
        const file = formData.get('file') as File | null

        if (!studentId || !file) {
            return NextResponse.json(
                { error: 'Missing studentId or file' },
                { status: 400 }
            )
        }

        // Verify access to student
        const { allowed, existingPhotoUrl } = await verifyStudentAccess(user.id, role, studentId)
        if (!allowed) {
            return NextResponse.json(
                { error: 'Student not found or access denied' },
                { status: 403 }
            )
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: JPG, PNG, WebP.' },
                { status: 400 }
            )
        }

        // Validate size (must be <= 200KB)
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: `File too large (${Math.round(file.size / 1024)}KB). Maximum allowed is 200KB.` },
                { status: 400 }
            )
        }

        let photoUrl: string

        const blobToken = process.env.BLOB_READ_WRITE_TOKEN
        if (blobToken) {
            // Upload to Vercel Blob
            const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
            const filename = `athletes/${studentId}-${Date.now()}.${ext}`

            const blob = await put(filename, file, {
                access: 'public',
                contentType: file.type,
                token: blobToken,
            })
            photoUrl = blob.url

            // Delete old blob if it was stored in Vercel Blob
            if (existingPhotoUrl && existingPhotoUrl.includes('public.blob.vercel-storage.com')) {
                del(existingPhotoUrl, { token: blobToken }).catch(() => {})
            }
        } else {
            // Fallback for local testing without Vercel Blob credentials:
            // Store as base64 data URI so local dev never breaks
            const arrayBuffer = await file.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            photoUrl = `data:${file.type};base64,${base64}`
        }

        // Update student record in PostgreSQL
        await sql`
            UPDATE students
            SET photo_url = ${photoUrl}
            WHERE id = ${studentId}
        `

        // Audit log
        audit({
            actorType: role as any,
            actorId: user.id,
            action: AUDIT_ACTIONS.STUDENT_PHOTO_UPLOADED,
            entityType: 'student',
            entityId: studentId,
            details: {
                file_size: file.size,
                mime_type: file.type,
            },
        }).catch(console.error)

        // Revalidate relevant pages
        revalidatePath('/athlete')
        revalidatePath('/parent')
        revalidatePath(`/athlete/${studentId}`)
        revalidatePath(`/parent/children/${studentId}`)
        revalidatePath('/dashboard/students')
        revalidatePath('/dashboard/entries')

        return NextResponse.json({
            success: true,
            photo_url: photoUrl,
        })
    } catch (err: any) {
        console.error('Photo upload error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal server error during upload' },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getCurrentSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user } = session
        const role = user.role

        const body = await req.json().catch(() => ({}))
        const studentId = body.studentId || req.nextUrl.searchParams.get('studentId')

        if (!studentId) {
            return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
        }

        const { allowed, existingPhotoUrl } = await verifyStudentAccess(user.id, role, studentId)
        if (!allowed) {
            return NextResponse.json({ error: 'Student not found or access denied' }, { status: 403 })
        }

        // Remove from Vercel Blob if applicable
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN
        if (blobToken && existingPhotoUrl && existingPhotoUrl.includes('public.blob.vercel-storage.com')) {
            del(existingPhotoUrl, { token: blobToken }).catch(() => {})
        }

        // Clear in database
        await sql`
            UPDATE students
            SET photo_url = NULL
            WHERE id = ${studentId}
        `

        // Audit log
        audit({
            actorType: role as any,
            actorId: user.id,
            action: AUDIT_ACTIONS.STUDENT_PHOTO_DELETED,
            entityType: 'student',
            entityId: studentId,
        }).catch(console.error)

        revalidatePath('/athlete')
        revalidatePath('/parent')
        revalidatePath(`/athlete/${studentId}`)
        revalidatePath(`/parent/children/${studentId}`)
        revalidatePath('/dashboard/students')
        revalidatePath('/dashboard/entries')

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Photo delete error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
