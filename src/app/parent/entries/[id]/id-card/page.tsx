// ============================================================================
// EntryDesk — Full-Screen Athlete ID Card (Mobile Pass)
// Route: /parent/entries/[id]/id-card
// ============================================================================

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '@/lib/auth/session'
import sql from '@/lib/db'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Printer, ShieldCheck } from 'lucide-react'
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

    // Authorization
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
        <div className="min-h-screen bg-[#f7f4ec] text-[#1c1917] dark:bg-[#070e1b] dark:text-[#e8eef5] flex flex-col items-center">
            {/* Top Bar */}
            <header className="w-full bg-[#f7f4ec]/90 backdrop-blur border-b border-[#ded8cb] dark:bg-[#0a1220]/90 dark:border-[#1f2b40] px-4 py-3 sticky top-0 z-30">
                <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto flex items-center justify-between">
                    <Link href={`/athlete/entries/${id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-[#57534e] hover:text-[#1c1917] hover:bg-[#ded8cb]/40 dark:text-[#8a99ab] dark:hover:text-[#e8eef5] dark:hover:bg-[#111a2b]">
                            <ChevronLeft className="h-4 w-4" />
                            Back to Entry
                        </Button>
                    </Link>

                    <div className="flex items-center gap-2">
                        <IdCardDownload
                            entryId={id}
                            initialData={cardData}
                            size="sm"
                            label="Download A4 Pass"
                            customButtonClass="rounded-xl bg-[#059669] hover:bg-[#047857] text-white dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] dark:text-[#04231e] font-bold text-xs gap-1.5 px-3.5 h-9"
                        />
                    </div>
                </div>
            </header>

            {/* Main Pass Viewport */}
            <main className="w-full max-w-5xl 2xl:max-w-6xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 py-8 px-4">
                {/* Phone Pass Preview */}
                <div className="w-full max-w-[400px] shadow-xl rounded-2xl overflow-hidden border border-[#ded8cb] dark:border-[#1f2b40] bg-white dark:bg-[#111a2b]">
                    <IdCardPhonePass data={cardData} />
                </div>

                {/* Desktop Pass Details & Action Panel */}
                <div className="hidden lg:flex flex-col gap-4 max-w-sm sticky top-20">
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[20px] p-6 space-y-4 shadow-xs">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-[#2dd4b4]">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-xs font-bold tracking-wider uppercase">Verified Competitor Pass</span>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-[#1c1917] dark:text-[#e8eef5]">{cardData.student.name}</h2>
                            <p className="text-sm text-[#57534e] dark:text-[#8a99ab] mt-0.5">{cardData.event.title}</p>
                        </div>

                        <div className="divide-y divide-[#ded8cb] dark:divide-[#1f2b40] text-xs">
                            <div className="py-2.5 flex justify-between">
                                <span className="text-[#57534e] dark:text-[#8a99ab]">Chest Number</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-[#2dd4b4]">{cardData.chest_no ? `#${cardData.chest_no}` : 'Assigned on check-in'}</span>
                            </div>
                            <div className="py-2.5 flex justify-between">
                                <span className="text-[#57534e] dark:text-[#8a99ab]">Category</span>
                                <span className="font-semibold text-[#1c1917] dark:text-[#e8eef5] text-right truncate max-w-[180px]">{entry.category_name || cardData.category_snapshot || 'Standard'}</span>
                            </div>
                            <div className="py-2.5 flex justify-between">
                                <span className="text-[#57534e] dark:text-[#8a99ab]">Dojo / Club</span>
                                <span className="font-semibold text-[#1c1917] dark:text-[#e8eef5] text-right truncate max-w-[180px]">{cardData.dojo.name}</span>
                            </div>
                        </div>

                        <p className="text-xs text-[#57534e] dark:text-[#8a99ab] leading-relaxed pt-1">
                            Present this digital pass on your phone or print a physical copy for stadium entry and official weigh-in verification.
                        </p>

                        <div className="pt-2">
                            <IdCardDownload
                                entryId={id}
                                initialData={cardData}
                                size="default"
                                label="Download Printable Pass (A4 PDF)"
                                customButtonClass="w-full rounded-xl bg-[#059669] hover:bg-[#047857] text-white dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] dark:text-[#04231e] font-bold text-sm h-11"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
