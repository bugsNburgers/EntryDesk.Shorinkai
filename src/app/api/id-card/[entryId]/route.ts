// ============================================================================
// EntryDesk — ID Card data API
// GET /api/id-card/[entryId]
// Returns JSON used by the client-side ID card renderer and download trigger.
// Authentication: session cookie (parent sees own child's entries; coach/organiser/admin see all).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth/session'
import sql from '@/lib/db'
import { generateQrToken, qrToDataUrl } from '@/lib/qr'
import { audit, AUDIT_ACTIONS } from '@/lib/audit'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://entrydesk.in'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ entryId: string }> }
) {
    const { entryId } = await params
    const session = await getCurrentSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = session
    const role = user.role

    // Fetch entry — scope to role
    const rows = await sql<{
        id: string
        status: string
        participation_type: string | null
        declared_weight_kg: number | null
        category_name: string | null
        chest_no: number | null
        qr_token: string | null
        student_id: string
        student_name: string
        student_gender: string
        student_dob: string | null
        student_rank: string | null
        student_photo: string | null
        parent_id: string | null
        dojo_name: string
        coach_name: string | null
        event_id: string
        event_title: string
        event_location: string | null
        start_date: string
        end_date: string
        entry_created_at: string
        registration_no: string | null
        student_phone: string | null
        school_or_city: string | null
        dojo_city: string | null
        parent_email: string | null
        parent_name: string | null
        category_snapshot: any
    }[]>`
        SELECT
            e.id,
            e.status,
            e.participation_type,
            e.created_at AS entry_created_at,
            e.category_snapshot,
            COALESCE(e.declared_weight_kg, s.weight) AS declared_weight_kg,
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
            e.chest_no,
            e.qr_token,
            s.id AS student_id,
            s.name AS student_name,
            s.gender AS student_gender,
            s.date_of_birth AS student_dob,
            s.rank AS student_rank,
            s.photo_url AS student_photo,
            s.registration_no,
            s.phone AS student_phone,
            s.school_or_city,
            s.parent_id,
            d.name AS dojo_name,
            d.city AS dojo_city,
            u.full_name AS coach_name,
            p.email AS parent_email,
            p.full_name AS parent_name,
            ev.id AS event_id,
            ev.title AS event_title,
            ev.location AS event_location,
            ev.start_date,
            ev.end_date
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN users u ON d.coach_id = u.id
        LEFT JOIN users p ON (s.parent_id = p.id OR e.submitted_by = p.id)
        JOIN events ev ON e.event_id = ev.id
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = ${entryId}
        LIMIT 1
    `

    if (!rows.length) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const entry = rows[0]

    // Authorization check
    if (role === 'parent' && entry.parent_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (role === 'coach') {
        // Coach must own or be assigned to this entry
        const check = await sql<{ id: string }[]>`
            SELECT e.id FROM entries e
            JOIN students s ON e.student_id = s.id
            JOIN dojos d ON s.dojo_id = d.id
            WHERE e.id = ${entryId}
              AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
            LIMIT 1
        `
        if (!check.length) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    // Only approved entries get an ID card
    if (entry.status !== 'approved') {
        return NextResponse.json({ error: 'Entry is not approved yet' }, { status: 400 })
    }

    // Ensure qr_token exists — generate if missing
    let qrToken = entry.qr_token
    if (!qrToken) {
        qrToken = generateQrToken()
        await sql`
            UPDATE entries SET qr_token = ${qrToken}, updated_at = NOW()
            WHERE id = ${entryId}
        `
        audit({
            actorType: role as any,
            actorId: user.id,
            action: AUDIT_ACTIONS.ENTRY_QR_TOKEN_GENERATED,
            entityType: 'entry',
            entityId: entryId,
        }).catch(console.error)
    }

    const verifyUrl = `${BASE_URL}/v/${qrToken}`
    const qrDataUrl = await qrToDataUrl(verifyUrl)

    return NextResponse.json({
        id: entry.id,
        status: entry.status,
        chest_no: entry.chest_no,
        registration_no: entry.registration_no,
        created_at: entry.entry_created_at,
        participation_type: entry.participation_type,
        category_name: entry.category_name,
        category_snapshot: entry.category_snapshot,
        declared_weight_kg: entry.declared_weight_kg,
        student: {
            name: entry.student_name,
            gender: entry.student_gender,
            dob: entry.student_dob,
            rank: entry.student_rank,
            photo_url: entry.student_photo,
            phone: entry.student_phone,
            school_or_city: entry.school_or_city,
            weight: entry.declared_weight_kg,
        },
        dojo: {
            name: entry.dojo_name,
            coach_name: entry.coach_name,
            city: entry.dojo_city,
        },
        event: {
            id: entry.event_id,
            title: entry.event_title,
            location: entry.event_location,
            start_date: entry.start_date,
            end_date: entry.end_date,
        },
        emergency_contact: {
            name: entry.parent_name || entry.coach_name || 'Emergency Contact',
            phone: entry.student_phone || '+91 00000 00000',
        },
        registration: {
            email: entry.parent_email || 'parent@email.com',
            phone: entry.student_phone || '+91 00000 00000',
        },
        qr: {
            token: qrToken,
            verify_url: verifyUrl,
            data_url: qrDataUrl,
        },
    })
}
