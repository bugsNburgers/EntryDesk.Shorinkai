import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { generateQrToken, qrToDataUrl } from '@/lib/qr'
import { TeamCardsPrintClient } from '@/components/id-card/team-cards-print-client'
import type { IdCardData } from '@/components/id-card/id-card-preview'

export const metadata: Metadata = {
    title: 'Print Team Cards — EntryDesk',
    robots: 'noindex, nofollow',
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://entrydesk.in'

interface PrintPageProps {
    params: Promise<{ id: string }>
}

export default async function EventPrintPage({ params }: PrintPageProps) {
    const { id: eventId } = await params
    const { user, role } = await requireRole(['coach', 'organizer', 'admin'], {
        redirectTo: '/dashboard',
    })

    // Fetch event
    const eventRows = await sql<{
        id: string
        title: string
        location: string | null
        start_date: string
        end_date: string
    }[]>`
        SELECT id, title, location, start_date, end_date
        FROM events
        WHERE id = ${eventId}
        LIMIT 1
    `
    if (!eventRows.length) {
        notFound()
    }
    const event = eventRows[0]

    // Fetch approved entries scoped to coach/organizer
    const entryRows = await sql<{
        id: string
        chest_no: number | null
        participation_type: string | null
        category_name: string | null
        qr_token: string | null
        student_id: string
        student_name: string
        student_gender: string
        student_rank: string | null
        student_photo: string | null
        dojo_name: string
        coach_name: string | null
    }[]>`
        SELECT
            e.id,
            e.chest_no,
            e.participation_type,
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
            e.qr_token,
            s.id AS student_id,
            s.name AS student_name,
            s.gender AS student_gender,
            s.rank AS student_rank,
            s.photo_url AS student_photo,
            d.name AS dojo_name,
            u.full_name AS coach_name
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON d.coach_id = u.id
        WHERE e.event_id = ${eventId}
          AND e.status = 'approved'
          ${
              role === 'coach'
                  ? sql`AND (e.coach_id = ${user.id} OR d.coach_id = ${user.id})`
                  : sql``
          }
        ORDER BY e.chest_no ASC NULLS LAST, s.name ASC
    `

    // Generate missing tokens & prepare QR data URLs
    const cards: IdCardData[] = []
    for (const row of entryRows) {
        let token = row.qr_token
        if (!token) {
            token = generateQrToken()
            await sql`
                UPDATE entries
                SET qr_token = ${token}, updated_at = NOW()
                WHERE id = ${row.id}
            `
        }

        const verifyUrl = `${BASE_URL}/v/${token}`
        const qrDataUrl = await qrToDataUrl(verifyUrl)

        cards.push({
            id: row.id,
            chest_no: row.chest_no,
            participation_type: row.participation_type,
            category_name: row.category_name,
            student: {
                name: row.student_name,
                gender: row.student_gender,
                rank: row.student_rank,
                photo_url: row.student_photo,
            },
            dojo: {
                name: row.dojo_name,
                coach_name: row.coach_name,
            },
            event: {
                title: event.title,
                location: event.location,
                start_date: event.start_date,
                end_date: event.end_date,
            },
            qr: {
                verify_url: verifyUrl,
                data_url: qrDataUrl,
            },
        })
    }

    return (
        <TeamCardsPrintClient
            eventTitle={event.title}
            eventId={event.id}
            cards={cards}
        />
    )
}
