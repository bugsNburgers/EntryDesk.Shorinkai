// ============================================================================
// EntryDesk — Tournament Entry Detail Page (Parent / Student Portal)
// src/app/parent/entries/[id]/page.tsx
// Faithfully replicates the Tournament Entry reference design (Entry.dc.html).
// Obsidian dark palette (#0a1220 / #111a2b), teal accents (#2dd4b4), Google Sans typography.
// ============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import {
    formatTournamentDateRangeLong,
    formatSubmittedTimestamp,
    formatStepDate,
} from '@/lib/date'
import { isRegistrationClosed } from '@/lib/events/registration'
import { AthleteIdActions } from '@/components/id-card/athlete-id-actions'
import { EntryWithdrawSection } from '@/components/parent/entry-withdraw-dialog'
import { EntryDaySelector } from '@/components/parent/entry-day-selector'
import { QrCode, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IdCardDownload } from '@/components/id-card/id-card-download'

interface EntryPageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
    const { id } = await params
    const rows = await sql<{ student_name: string; event_title: string }[]>`
        SELECT s.name AS student_name, ev.title AS event_title
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN events ev ON e.event_id = ev.id
        WHERE e.id = ${id}
        LIMIT 1
    `
    if (!rows.length) return { title: 'Tournament Entry — EntryDesk' }
    return { title: `${rows[0].student_name} — ${rows[0].event_title} — EntryDesk` }
}

function parseAppliedEvents(participationType: string | null | undefined) {
    if (!participationType) {
        return { kata: true, kumite: true, teamKata: false, teamKumite: false }
    }
    const lower = participationType.toLowerCase()
    const parts = lower.split(',').map((s) => s.trim())
    const hasBoth = parts.includes('both')
    const hasKata = hasBoth || parts.includes('kata')
    const hasKumite = hasBoth || parts.includes('kumite')
    const hasTeamKata = parts.includes('team_kata') || parts.includes('team kata')
    const hasTeamKumite = parts.includes('team_kumite') || parts.includes('team kumite')

    return {
        kata: hasKata,
        kumite: hasKumite,
        teamKata: hasTeamKata,
        teamKumite: hasTeamKumite,
    }
}

export default async function ParentEntryDetailPage({ params }: EntryPageProps) {
    const { id } = await params
    const { user } = await requireRole('parent', { redirectTo: '/login' })

    const rows = await sql<{
        id: string
        event_id: string
        student_id: string
        status: string
        participation_type: string | null
        declared_weight_kg: number | null
        event_day_id: string | null
        event_day_name: string | null
        event_day_date: string | Date | null
        category_name: string | null
        coach_notes: string | null
        rejection_reason: string | null
        chest_no: number | null
        qr_token: string | null
        created_at: string | Date
        updated_at: string | Date | null
        student_name: string
        student_gender: string
        student_dob: string | Date | null
        student_rank: string | null
        student_photo: string | null
        dojo_name: string
        dojo_city: string | null
        coach_name: string | null
        event_title: string
        event_description: string | null
        start_date: string | Date
        end_date: string | Date
        event_location: string | null
        is_registration_open: boolean
        registration_close_date: string | Date | null
    }[]>`
        SELECT
            e.id,
            e.event_id,
            e.student_id,
            e.status,
            e.participation_type,
            e.declared_weight_kg,
            e.event_day_id,
            ed.name AS event_day_name,
            ed.date AS event_day_date,
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
            e.coach_notes,
            e.rejection_reason,
            e.chest_no,
            e.qr_token,
            e.created_at,
            e.updated_at,
            s.name AS student_name,
            s.gender AS student_gender,
            s.date_of_birth AS student_dob,
            s.rank AS student_rank,
            s.photo_url AS student_photo,
            d.name AS dojo_name,
            d.city AS dojo_city,
            u.full_name AS coach_name,
            ev.title AS event_title,
            ev.description AS event_description,
            ev.start_date,
            ev.end_date,
            ev.location AS event_location,
            ev.is_registration_open,
            ev.registration_close_date
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN users u ON d.coach_id = u.id
        JOIN events ev ON e.event_id = ev.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN event_days ed ON e.event_day_id = ed.id
        WHERE e.id = ${id}
          AND s.parent_id = ${user.id}
        LIMIT 1
    `

    if (!rows.length) {
        notFound()
    }

    const entry = rows[0]

    // Fetch all event days for this event so user can view/change
    const eventDaysRows = await sql<{ id: string; date: string | Date; name: string | null }[]>`
        SELECT id, date, name
        FROM event_days
        WHERE event_id = ${entry.event_id}
        ORDER BY date ASC
    `
    const eventDays = eventDaysRows.map((d, idx) => ({
        id: d.id,
        date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
        name: d.name || `Day ${idx + 1}`,
    }))

    const applied = parseAppliedEvents(entry.participation_type)
    const datesFormatted = formatTournamentDateRangeLong(entry.start_date, entry.end_date)
    const submittedFormatted = formatSubmittedTimestamp(entry.created_at)
    const step1Date = formatStepDate(entry.created_at)
    const step2Date = entry.updated_at ? formatStepDate(entry.updated_at) : null

    // Determine status badge info
    const status = entry.status
    const isApproved = status === 'approved'
    const isPendingCoach = status === 'pending_coach'
    const isSubmitted = status === 'submitted'
    const isCorrectionNeeded = status === 'correction_needed'
    const isDeclined = status === 'coach_declined'
    const isRejected = status === 'rejected'
    const isWithdrawn = status === 'withdrawn'

    // Check if tournament registration is still open (for re-applying after withdrawal)
    const todayIso = new Date().toISOString().slice(0, 10)
    const isClosed = isRegistrationClosed(
        {
            is_registration_open: entry.is_registration_open,
            registration_close_date: entry.registration_close_date,
            end_date: entry.end_date,
        },
        todayIso
    )
    const canReapply = isWithdrawn && !isClosed

    return (
        <div className="w-full min-h-screen text-[#1c1917] dark:text-[#e8eef5] space-y-4 pb-14 font-sans select-none">
            {/* Top Navigation: ‹ Back to [Athlete Name]'s profile */}
            <div className="py-1 px-1">
                <Link
                    href={`/athlete/${entry.student_id}`}
                    className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-[#57534e] hover:text-[#1c1917] dark:text-[#8a99ab] dark:hover:text-[#e8eef5] transition-colors group"
                >
                    <span className="text-xl leading-none font-light group-hover:-translate-x-0.5 transition-transform">‹</span>
                    <span>Back to {entry.student_name}’s profile</span>
                </Link>
            </div>

            {/* Responsive Grid: Left (Tournament Header + Details + Withdraw) & Right (ID Pass + Stepper) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 2xl:gap-10 items-start">
                {/* 1. Left Column Top: Tournament Header Card */}
                <div className="lg:col-span-5 2xl:col-span-4 order-1">
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 sm:p-6 shadow-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[#0d9488] dark:text-[#2dd4b4]">
                                Tournament entry
                            </span>

                            {/* Status Badge */}
                            {isPendingCoach && (
                                <span className="text-[12.5px] font-bold text-amber-800 bg-amber-100 border border-amber-300 dark:text-[#f5c542] dark:bg-[#f5c542]/12 dark:border-[#f5c542]/35 rounded-md px-2.5 py-1">
                                    Waiting for coach
                                </span>
                            )}
                            {isSubmitted && (
                                <span className="text-[12.5px] font-bold text-amber-800 bg-amber-100 border border-amber-300 dark:text-[#f5c542] dark:bg-[#f5c542]/12 dark:border-[#f5c542]/35 rounded-md px-2.5 py-1">
                                    Waiting for organiser
                                </span>
                            )}
                            {isApproved && (
                                <span className="text-[12.5px] font-bold text-[#14532d] bg-[#dcfce7] border border-[#86efac] dark:text-[#2dd4b4] dark:bg-[#2dd4b4]/12 dark:border-[#2dd4b4]/35 rounded-md px-2.5 py-1">
                                    Entry accepted
                                </span>
                            )}
                            {isCorrectionNeeded && (
                                <span className="text-[12.5px] font-bold text-orange-800 bg-orange-100 border border-orange-300 dark:text-[#fb923c] dark:bg-[#fb923c]/12 dark:border-[#fb923c]/35 rounded-md px-2.5 py-1">
                                    Correction needed
                                </span>
                            )}
                            {(isDeclined || isRejected) && (
                                <span className="text-[12.5px] font-bold text-rose-800 bg-rose-100 border border-rose-300 dark:text-[#f87171] dark:bg-[#f87171]/12 dark:border-[#f87171]/35 rounded-md px-2.5 py-1">
                                    {isDeclined ? 'Coach declined' : 'Rejected'}
                                </span>
                            )}
                            {isWithdrawn && (
                                <span className="text-[12.5px] font-bold text-[#57534e] bg-[#eee9df] border border-[#ded8cb] dark:text-[#8a99ab] dark:bg-[#8a99ab]/12 dark:border-[#8a99ab]/35 rounded-md px-2.5 py-1">
                                    Withdrawn
                                </span>
                            )}
                        </div>

                        <div className="text-[23px] sm:text-[25px] font-bold leading-[1.15] mt-3.5 text-[#1c1917] dark:text-[#e8eef5]">
                            {entry.event_title}
                        </div>

                        <div className="mt-3 text-[14.5px] leading-[1.5]">
                            <div className="text-[#1c1917] dark:text-[#e8eef5]">{datesFormatted}</div>
                            {entry.event_location && (
                                <div className="text-[#57534e] dark:text-[#8a99ab]">{entry.event_location}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Right Column: ID Pass & Progress Stepper */}
                <div className="lg:col-span-7 2xl:col-span-8 lg:row-span-2 order-2 lg:order-2 space-y-4">
                    {/* Official Athlete ID Pass Card (when approved) */}
                    {isApproved && (
                        <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-emerald-500/40 bg-gradient-to-br from-[#0c2238] via-[#091b2c] to-[#040d18] text-white shadow-xl shadow-emerald-950/40 space-y-4">
                            {/* Ambient background glow accents */}
                            <div className="absolute -right-10 -top-10 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-[#3fd8c3]/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/20 text-[#3fd8c3] border border-emerald-500/40">
                                    <span className="h-2 w-2 rounded-full bg-[#3fd8c3] animate-pulse" />
                                    Official ID Pass Ready
                                </span>
                                {entry.chest_no && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-black bg-emerald-400 text-[#04231e] shadow-sm">
                                        Chest #{entry.chest_no}
                                    </span>
                                )}
                            </div>

                            <div className="relative z-10 flex items-start gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-[#3fd8c3]">
                                    <QrCode className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                        Accreditation Pass Confirmed
                                    </h4>
                                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                                        Show pass on phone for venue &amp; weigh-in scanning, or download the official card.
                                    </p>
                                </div>
                            </div>

                            <div className="relative z-10 pt-1 flex items-center gap-3 flex-wrap">
                                <Link href={`/parent/entries/${entry.id}/id-card`}>
                                    <Button
                                        size="default"
                                        className="gap-2 rounded-xl font-bold bg-[#3fd8c3] hover:bg-[#25c4a5] text-[#04231e] shadow-lg shadow-[#3fd8c3]/20 h-10 px-5 text-xs sm:text-sm transition-all cursor-pointer"
                                    >
                                        <Smartphone className="h-4 w-4" />
                                        View Pass
                                    </Button>
                                </Link>

                                <IdCardDownload
                                    entryId={entry.id}
                                    label="Print A4"
                                    size="default"
                                    variant="outline"
                                    customButtonClass="h-10 px-4 rounded-xl border-neutral-700 bg-neutral-800/90 text-neutral-200 hover:bg-neutral-700 hover:text-white font-semibold text-xs sm:text-sm gap-2"
                                />
                            </div>
                        </div>
                    )}

                    {/* Card 2: Registration Progress & Stepper */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 sm:p-6 shadow-xs">
                        <div className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[#0d9488] dark:text-[#2dd4b4] mb-3">
                            Registration progress
                        </div>

                {/* Status Callout Box */}
                {isPendingCoach && (
                    <div className="bg-amber-500/10 border border-amber-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[12px] text-amber-800 dark:text-[#f5c542] font-bold tracking-[0.08em] uppercase">
                            STEP 2 OF 3
                        </div>
                        <div className="text-[19px] font-bold mt-1 text-[#1c1917] dark:text-[#e8eef5]">
                            Waiting for your coach
                        </div>
                        <div className="text-[14px] text-[#57534e] dark:text-[#c9d3df] mt-1 leading-[1.4]">
                            Your coach will review and forward your entry to the organiser.
                        </div>
                    </div>
                )}

                {isSubmitted && (
                    <div className="bg-amber-500/10 border border-amber-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[12px] text-amber-800 dark:text-[#f5c542] font-bold tracking-[0.08em] uppercase">
                            STEP 3 OF 3
                        </div>
                        <div className="text-[19px] font-bold mt-1 text-[#1c1917] dark:text-[#e8eef5]">
                            Waiting for organiser
                        </div>
                        <div className="text-[14px] text-[#57534e] dark:text-[#c9d3df] mt-1 leading-[1.4]">
                            Coach verified and forwarded! Waiting for the tournament organiser to confirm your entry.
                        </div>
                    </div>
                )}

                {isApproved && (
                    <div className="bg-[#dcfce7] border border-[#86efac] dark:bg-[#2dd4b4]/10 dark:border-[#2dd4b4]/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[12px] text-[#14532d] dark:text-[#2dd4b4] font-bold tracking-[0.08em] uppercase">
                            OFFICIALLY REGISTERED
                        </div>
                        <div className="text-[19px] font-bold mt-1 text-[#14532d] dark:text-[#e8eef5]">
                            Entry Accepted!
                        </div>
                        <div className="text-[14px] text-[#166534] dark:text-[#c9d3df] mt-1 leading-[1.4]">
                            {entry.chest_no
                                ? `Chest number #${entry.chest_no} assigned. Official ID Pass is ready below.`
                                : 'The athlete is confirmed. Official ID Pass is ready below.'}
                        </div>
                    </div>
                )}

                {isCorrectionNeeded && (
                    <div className="bg-orange-500/10 border border-orange-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[12px] text-orange-800 dark:text-[#fb923c] font-bold tracking-[0.08em] uppercase">
                            ACTION NEEDED
                        </div>
                        <div className="text-[19px] font-bold mt-1 text-[#1c1917] dark:text-[#e8eef5]">
                            Updates requested by coach
                        </div>
                        <div className="text-[14px] text-[#57534e] dark:text-[#c9d3df] mt-1 leading-[1.4]">
                            {entry.coach_notes
                                ? `Note from coach: "${entry.coach_notes}"`
                                : 'Your coach requested updates before approving this entry.'}
                        </div>
                    </div>
                )}

                {(isDeclined || isRejected) && (
                    <div className="bg-rose-500/10 border border-rose-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[12px] text-rose-800 dark:text-[#f87171] font-bold tracking-[0.08em] uppercase">
                            NOT ACCEPTED
                        </div>
                        <div className="text-[19px] font-bold mt-1 text-[#1c1917] dark:text-[#e8eef5]">
                            {isDeclined ? 'Entry declined by coach' : 'Entry not accepted'}
                        </div>
                        <div className="text-[14px] text-[#57534e] dark:text-[#c9d3df] mt-1 leading-[1.4]">
                            {entry.rejection_reason || entry.coach_notes || 'This entry was not accepted for this event.'}
                        </div>
                    </div>
                )}

                {isWithdrawn && (
                    <div className="bg-[#eee9df] border border-[#ded8cb] dark:bg-[#8a99ab]/10 dark:border-[#8a99ab]/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[12px] text-[#57534e] dark:text-[#8a99ab] font-bold tracking-[0.08em] uppercase">
                            STATUS
                        </div>
                        <div className="text-[19px] font-bold mt-1 text-[#1c1917] dark:text-[#e8eef5]">
                            Entry withdrawn
                        </div>
                        <div className="text-[14px] text-[#57534e] dark:text-[#c9d3df] mt-1 leading-[1.4]">
                            {entry.rejection_reason || 'This registration was withdrawn by the parent.'}
                        </div>
                    </div>
                )}

                {/* Vertical Stepper: Step 1, Step 2, Step 3 */}
                <div className="space-y-0">
                    {/* Step 1: Registration sent */}
                    <div className="flex gap-3.5 h-[70px]">
                        <div className="flex flex-col items-center w-[30px] shrink-0">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#2dd4b4] flex items-center justify-center shrink-0">
                                <svg width="14" height="14" viewBox="0 0 14 14">
                                    <path
                                        d="M2 7.5l3 3 7-7.5"
                                        fill="none"
                                        stroke="#04231e"
                                        strokeWidth="2.4"
                                    />
                                </svg>
                            </div>
                            <div
                                className={`w-[2px] flex-1 my-1 ${
                                    isPendingCoach || isCorrectionNeeded || isDeclined
                                        ? 'bg-[#2dd4b4]'
                                        : isSubmitted || isApproved || isRejected
                                        ? 'bg-[#2dd4b4]'
                                        : 'bg-[#243349]'
                                }`}
                            />
                        </div>
                        <div className="pt-1 flex-1">
                            <b className="text-[16px] font-semibold block text-[#e8eef5]">
                                Registration sent
                            </b>
                            <small className="text-[13.5px] text-[#8a99ab] block mt-0.5 leading-[1.4]">
                                {step1Date || 'Submitted'}
                            </small>
                        </div>
                    </div>

                    {/* Step 2: Coach review */}
                    <div className="flex gap-3.5 h-[70px]">
                        <div className="flex flex-col items-center w-[30px] shrink-0">
                            {isPendingCoach && (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#f5c542] bg-[#f5c542]/12 flex items-center justify-center shrink-0">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        stroke="#f5c542"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    >
                                        <circle cx="7" cy="7" r="5.5" />
                                        <path d="M7 4v3.2l2 1.2" />
                                    </svg>
                                </div>
                            )}

                            {(isSubmitted || isApproved || isRejected) && (
                                <div className="w-[30px] h-[30px] rounded-full bg-[#2dd4b4] flex items-center justify-center shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 14 14">
                                        <path
                                            d="M2 7.5l3 3 7-7.5"
                                            fill="none"
                                            stroke="#04231e"
                                            strokeWidth="2.4"
                                        />
                                    </svg>
                                </div>
                            )}

                            {isCorrectionNeeded && (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#fb923c] bg-[#fb923c]/12 flex items-center justify-center shrink-0">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        stroke="#fb923c"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    >
                                        <circle cx="7" cy="7" r="5.5" />
                                        <path d="M7 4.5v3" />
                                        <circle cx="7" cy="9.8" r="0.6" fill="#fb923c" />
                                    </svg>
                                </div>
                            )}

                            {isDeclined && (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#f87171] bg-[#f87171]/12 flex items-center justify-center shrink-0">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        stroke="#f87171"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    >
                                        <path d="M4 4l6 6M10 4l-6 6" />
                                    </svg>
                                </div>
                            )}

                            {isWithdrawn && (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#34455f] text-[#8a99ab] text-[13px] font-bold flex items-center justify-center shrink-0">
                                    2
                                </div>
                            )}

                            <div
                                className={`w-[2px] flex-1 my-1 ${
                                    isApproved ? 'bg-[#2dd4b4]' : 'bg-[#243349]'
                                }`}
                            />
                        </div>

                        <div className="pt-1 flex-1">
                            <b
                                className={`text-[16px] font-semibold block ${
                                    isPendingCoach
                                        ? 'text-[#f5c542]'
                                        : isCorrectionNeeded
                                        ? 'text-[#fb923c]'
                                        : isDeclined
                                        ? 'text-[#f87171]'
                                        : 'text-[#e8eef5]'
                                }`}
                            >
                                Coach review
                            </b>
                            <small className="text-[13.5px] text-[#8a99ab] block mt-0.5 leading-[1.4]">
                                {isPendingCoach
                                    ? 'In progress'
                                    : isSubmitted || isApproved
                                    ? step2Date
                                        ? `Verified · ${step2Date}`
                                        : 'Verified'
                                    : isCorrectionNeeded
                                    ? 'Correction requested'
                                    : isDeclined
                                    ? 'Declined by coach'
                                    : 'Awaiting review'}
                            </small>
                        </div>
                    </div>

                    {/* Step 3: Organiser acceptance */}
                    <div className="flex gap-3.5 h-auto">
                        <div className="flex flex-col items-center w-[30px] shrink-0">
                            {isApproved ? (
                                <div className="w-[30px] h-[30px] rounded-full bg-[#2dd4b4] flex items-center justify-center shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 14 14">
                                        <path
                                            d="M2 7.5l3 3 7-7.5"
                                            fill="none"
                                            stroke="#04231e"
                                            strokeWidth="2.4"
                                        />
                                    </svg>
                                </div>
                            ) : isSubmitted ? (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#f5c542] bg-[#f5c542]/12 flex items-center justify-center shrink-0">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        stroke="#f5c542"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    >
                                        <circle cx="7" cy="7" r="5.5" />
                                        <path d="M7 4v3.2l2 1.2" />
                                    </svg>
                                </div>
                            ) : isRejected ? (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#f87171] bg-[#f87171]/12 flex items-center justify-center shrink-0">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                        stroke="#f87171"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    >
                                        <path d="M4 4l6 6M10 4l-6 6" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-[#34455f] text-[#8a99ab] text-[13px] font-bold flex items-center justify-center shrink-0">
                                    3
                                </div>
                            )}
                        </div>

                        <div className="pt-1 flex-1 pb-1">
                            <b
                                className={`text-[16px] font-semibold block ${
                                    isApproved
                                        ? 'text-[#2dd4b4]'
                                        : isSubmitted
                                        ? 'text-[#f5c542]'
                                        : isRejected
                                        ? 'text-[#f87171]'
                                        : 'text-[#8a99ab]'
                                }`}
                            >
                                Organiser acceptance
                            </b>
                            <small className="text-[13.5px] text-[#8a99ab] block mt-0.5 leading-[1.4]">
                                {isApproved
                                    ? entry.chest_no
                                        ? `Confirmed · Chest #${entry.chest_no}`
                                        : 'Confirmed'
                                    : isSubmitted
                                    ? 'In review by organiser'
                                    : isRejected
                                    ? 'Not accepted by organiser'
                                    : 'Chest number assigned once confirmed'}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. Left Column Bottom: Registration Details & Actions */}
        <div className="lg:col-span-5 2xl:col-span-4 order-3 lg:order-3 space-y-4">
                    {/* Card 3: Registration Details (matches Entry.dc.html lines 62-71) */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 sm:p-6 pb-2 shadow-xs">
                        <div className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[#0d9488] dark:text-[#2dd4b4] mb-0.5">
                            Registration details
                        </div>

                <div className="divide-y divide-[#ded8cb] dark:divide-[#1f2b40]">
                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Athlete</span>
                        <b className="text-[15.5px] font-semibold text-right break-words text-[#1c1917] dark:text-[#e8eef5]">
                            {entry.student_name}
                        </b>
                    </div>

                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Coach</span>
                        <b className="text-[15.5px] font-semibold text-right break-words text-[#1c1917] dark:text-[#e8eef5]">
                            {entry.coach_name || '—'}
                        </b>
                    </div>

                    {entry.category_name && (
                        <div className="flex justify-between items-baseline gap-3.5 py-3">
                            <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Category</span>
                            <b className="text-[15.5px] font-semibold text-right break-words text-[#1c1917] dark:text-[#e8eef5]">
                                {entry.category_name}
                            </b>
                        </div>
                    )}

                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Weight</span>
                        <b className="text-[15.5px] font-semibold text-right break-words text-[#1c1917] dark:text-[#e8eef5]">
                            {entry.declared_weight_kg ? `${entry.declared_weight_kg} kg` : '—'}
                        </b>
                    </div>

                    {/* Participation Day Selector */}
                    <EntryDaySelector
                        entryId={entry.id}
                        currentEventDayId={entry.event_day_id}
                        currentEventDayName={entry.event_day_name}
                        currentEventDayDate={entry.event_day_date ? (entry.event_day_date instanceof Date ? entry.event_day_date.toISOString().slice(0, 10) : String(entry.event_day_date).slice(0, 10)) : null}
                        eventDays={eventDays}
                        isEditable={!isApproved && !isWithdrawn && !isDeclined && !isRejected}
                    />

                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Submitted</span>
                        <b className="text-[15.5px] font-semibold text-right break-words text-[#1c1917] dark:text-[#e8eef5]">
                            {submittedFormatted}
                        </b>
                    </div>

                    {/* Events applied 2x2 grid */}
                    <div className="py-3 pb-3.5">
                        <div className="text-[14px] text-[#57534e] dark:text-[#8a99ab] mb-3">
                            Events applied
                        </div>
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-3.5">
                            {/* Kata */}
                            <div
                                className={`flex items-center gap-2.5 text-[15.5px] ${
                                    applied.kata
                                        ? 'font-semibold text-[#1c1917] dark:text-[#e8eef5]'
                                        : 'font-medium text-[#57534e]/60 dark:text-[#6b7b8f]'
                                }`}
                            >
                                <span
                                    className={`w-[22px] h-[22px] rounded-[7px] border-2 box-border flex items-center justify-center shrink-0 ${
                                        applied.kata
                                            ? 'bg-[#0d9488] border-[#0d9488] dark:bg-[#2dd4b4] dark:border-[#2dd4b4]'
                                            : 'border-[#ded8cb] dark:border-[#34455f]'
                                    }`}
                                >
                                    {applied.kata && (
                                        <svg width="13" height="13" viewBox="0 0 14 14">
                                            <path
                                                d="M2 7.5l3 3 7-7.5"
                                                fill="none"
                                                stroke="#ffffff"
                                                strokeWidth="2.4"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <span>Kata</span>
                            </div>

                            {/* Kumite */}
                            <div
                                className={`flex items-center gap-2.5 text-[15.5px] ${
                                    applied.kumite
                                        ? 'font-semibold text-[#1c1917] dark:text-[#e8eef5]'
                                        : 'font-medium text-[#57534e]/60 dark:text-[#6b7b8f]'
                                }`}
                            >
                                <span
                                    className={`w-[22px] h-[22px] rounded-[7px] border-2 box-border flex items-center justify-center shrink-0 ${
                                        applied.kumite
                                            ? 'bg-[#0d9488] border-[#0d9488] dark:bg-[#2dd4b4] dark:border-[#2dd4b4]'
                                            : 'border-[#ded8cb] dark:border-[#34455f]'
                                    }`}
                                >
                                    {applied.kumite && (
                                        <svg width="13" height="13" viewBox="0 0 14 14">
                                            <path
                                                d="M2 7.5l3 3 7-7.5"
                                                fill="none"
                                                stroke="#ffffff"
                                                strokeWidth="2.4"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <span>Kumite</span>
                            </div>

                            {/* Team Kata */}
                            <div
                                className={`flex items-center gap-2.5 text-[15.5px] ${
                                    applied.teamKata
                                        ? 'font-semibold text-[#1c1917] dark:text-[#e8eef5]'
                                        : 'font-medium text-[#57534e]/60 dark:text-[#6b7b8f]'
                                }`}
                            >
                                <span
                                    className={`w-[22px] h-[22px] rounded-[7px] border-2 box-border flex items-center justify-center shrink-0 ${
                                        applied.teamKata
                                            ? 'bg-[#0d9488] border-[#0d9488] dark:bg-[#2dd4b4] dark:border-[#2dd4b4]'
                                            : 'border-[#ded8cb] dark:border-[#34455f]'
                                    }`}
                                >
                                    {applied.teamKata && (
                                        <svg width="13" height="13" viewBox="0 0 14 14">
                                            <path
                                                d="M2 7.5l3 3 7-7.5"
                                                fill="none"
                                                stroke="#ffffff"
                                                strokeWidth="2.4"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <span>Team Kata</span>
                            </div>

                            {/* Team Kumite */}
                            <div
                                className={`flex items-center gap-2.5 text-[15.5px] ${
                                    applied.teamKumite
                                        ? 'font-semibold text-[#1c1917] dark:text-[#e8eef5]'
                                        : 'font-medium text-[#57534e]/60 dark:text-[#6b7b8f]'
                                }`}
                            >
                                <span
                                    className={`w-[22px] h-[22px] rounded-[7px] border-2 box-border flex items-center justify-center shrink-0 ${
                                        applied.teamKumite
                                            ? 'bg-[#0d9488] border-[#0d9488] dark:bg-[#2dd4b4] dark:border-[#2dd4b4]'
                                            : 'border-[#ded8cb] dark:border-[#34455f]'
                                    }`}
                                >
                                    {applied.teamKumite && (
                                        <svg width="13" height="13" viewBox="0 0 14 14">
                                            <path
                                                d="M2 7.5l3 3 7-7.5"
                                                fill="none"
                                                stroke="#ffffff"
                                                strokeWidth="2.4"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <span>Team Kumite</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                    {/* Bottom Actions: Withdraw Entry / Update Registration / Apply Again */}
                    <EntryWithdrawSection
                        entryId={entry.id}
                        studentId={entry.student_id}
                        eventId={entry.event_id}
                        studentName={entry.student_name}
                        eventTitle={entry.event_title}
                        status={entry.status}
                        canReapply={canReapply}
                    />
                </div>
            </div>
        </div>
    )
}
