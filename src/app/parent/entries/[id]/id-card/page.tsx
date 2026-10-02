// ============================================================================
// EntryDesk — Full-Screen Athlete ID Card (Official Digital Pass)
// Route: /parent/entries/[id]/id-card
// ============================================================================

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '@/lib/auth/session'
import sql from '@/lib/db'
import { Button } from '@/components/ui/button'
import { ChevronLeft, X, QrCode } from 'lucide-react'
import { IdCardPhonePass, type IdCardData } from '@/components/id-card/id-card-preview'
import { IdCardDownload } from '@/components/id-card/id-card-download'
import { generateQrToken, qrToDataUrl } from '@/lib/qr'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://entrydesk.in'

interface PageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const rows = await sql<{ student_name: string; event_title: string }[]>`
        SELECT s.name AS student_name, ev.title AS event_title
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN events ev ON e.event_id = ev.id
        WHERE e.id = ${id}
        LIMIT 1
    `
    if (!rows.length) return { title: 'Athlete ID Card — EntryDesk' }
    return { title: `Athlete ID: ${rows[0].student_name} (${rows[0].event_title})` }
}

export default async function AthleteIdCardFullPage({ params }: PageProps) {
    const { id } = await params
    const session = await getCurrentSession()
    if (!session) {
        redirect(`/login?next=/parent/entries/${id}/id-card`)
    }

    const { user } = session

    const rows = await sql<{
        id: string
        status: string
        participation_type: string | null
        declared_weight_kg: number | null
        category_name: string | null
        chest_no: number | null
        qr_token: string | null
        entry_created_at: string
        category_snapshot: any
        student_id: string
        student_name: string
        student_gender: string
        student_dob: string | null
        student_rank: string | null
        student_photo: string | null
        registration_no: string | null
        student_phone: string | null
        school_or_city: string | null
        parent_id: string | null
        dojo_name: string
        dojo_city: string | null
        coach_name: string | null
        parent_email: string | null
        parent_name: string | null
        event_id: string
        event_title: string
        event_location: string | null
        start_date: string
        end_date: string
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
        WHERE e.id = ${id}
        LIMIT 1
    `

    if (!rows.length) {
        notFound()
    }

    const entry = rows[0]

    // Authorization: parent or coach/admin
    if (user.role === 'parent' && entry.parent_id !== user.id) {
        redirect('/parent')
    }

    if (entry.status !== 'approved') {
        redirect(`/parent/entries/${id}`)
    }

    let qrToken = entry.qr_token
    if (!qrToken) {
        qrToken = generateQrToken()
        await sql`UPDATE entries SET qr_token = ${qrToken} WHERE id = ${id}`
    }

    const verifyUrl = `${BASE_URL}/v/${qrToken}`
    const qrDataUrl = await qrToDataUrl(verifyUrl)

    const cardData: IdCardData = {
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
    }

    return (
        <div className="min-h-screen bg-[#060b14] text-white flex flex-col items-center justify-between">
            {/* Top Action Bar */}
            <header className="w-full bg-[#071320]/95 backdrop-blur border-b border-neutral-800 px-4 py-3 sticky top-0 z-30 shadow-md">
                <div className="w-full max-w-lg mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/parent/entries/${id}`}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-semibold gap-1 transition"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2 border-l border-neutral-800 pl-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3fd8c3] animate-pulse" />
                            <span className="text-xs font-bold tracking-wider uppercase text-neutral-300">
                                Official Digital Pass
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Direct Print A4 Option — No Dropdown */}
                        <IdCardDownload
                            entryId={id}
                            initialData={cardData}
                            size="sm"
                            variant="outline"
                            label="Print A4"
                            customButtonClass="h-8 px-3 rounded-lg border-neutral-700 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700 hover:text-white text-xs font-semibold gap-1.5"
                        />

                        <Link href={`/parent/entries/${id}`}>
                            <button
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                                aria-label="Close pass"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Pass Viewport — Full Page View */}
            <main className="w-full max-w-lg mx-auto flex-1 flex flex-col items-center justify-center p-3 sm:p-6 my-auto">
                <div className="w-full max-w-[400px] shadow-2xl rounded-2xl overflow-hidden border border-neutral-800 bg-[#0a1220]">
                    <IdCardPhonePass data={cardData} />
                </div>
            </main>

            {/* Bottom Info Bar */}
            <footer className="w-full bg-[#071320] text-neutral-400 text-xs px-4 py-3 border-t border-neutral-800 sticky bottom-0 z-20">
                <div className="w-full max-w-lg mx-auto flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 text-neutral-300">
                        <QrCode className="h-3.5 w-3.5 text-[#3fd8c3]" />
                        Scan anywhere on tournament day
                    </span>
                    <span className="text-[#3fd8c3] font-semibold flex items-center gap-1">
                        100% Paperless
                    </span>
                </div>
            </footer>
        </div>
    )
}
