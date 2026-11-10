// ============================================================================
// EntryDesk — Tournament Entry Detail Page (Parent / Student Portal)
// src/app/athlete/entries/[id]/page.tsx
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
import { StatusBadge } from '@/components/ui/status-badge'
import { AthleteIdActions } from '@/components/id-card/athlete-id-actions'
import { EntryWithdrawSection } from '@/components/parent/entry-withdraw-dialog'
import { EntryDaySelector } from '@/components/parent/entry-day-selector'
import { Check, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IdCardDownload } from '@/components/id-card/id-card-download'

interface EntryPageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
    const { id } = await params
    const rows = await sql<{ student_name: string; event_title: string }[]>`
        SELECT COALESCE(e.snap_name, s.name) AS student_name, ev.title AS event_title
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
            COALESCE(e.snap_name, s.name) AS student_name,
            COALESCE(e.snap_gender, s.gender) AS student_gender,
            COALESCE(e.snap_dob, s.date_of_birth) AS student_dob,
            COALESCE(e.snap_rank, s.rank) AS student_rank,
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
        <div className="w-full min-h-screen text-foreground space-y-4 pb-14 font-sans select-none">
            {/* Top Navigation: ‹ Back to [Athlete Name]'s profile */}
            <div className="py-1 px-1">
                <Link
                    href={`/athlete/${entry.student_id}`}
                    className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground transition-colors group"
                >
                    <span className="text-xl leading-none font-light group-hover:-translate-x-0.5 transition-transform">‹</span>
                    <span>{entry.student_name}</span>
                </Link>
            </div>

            {/* Responsive Grid: Left (Tournament Header + Details + Withdraw) & Right (ID Pass + Stepper) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 2xl:gap-10 items-start">
                {/* 1. Left Column Top: Tournament Header Card */}
                <div className="lg:col-span-5 2xl:col-span-4 order-1">
                    <div className="bg-white border border-border dark:bg-card dark:border-border rounded-[18px] p-5 sm:p-6 shadow-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-[15px] font-semibold text-muted-foreground">
                                {entry.student_name}
                            </span>

                            <StatusBadge status={status} />
                        </div>

                        <div className="text-[23px] sm:text-[25px] font-bold leading-[1.15] mt-3.5 text-foreground">
                            {entry.event_title}
                        </div>

                        <div className="mt-3 text-base leading-[1.5]">
                            <div className="text-foreground">{datesFormatted}</div>
                            {entry.event_location && (
                                <div className="text-muted-foreground">{entry.event_location}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Right Column: ID Pass & Progress Stepper */}
                <div className="lg:col-span-7 2xl:col-span-8 lg:row-span-2 order-2 lg:order-2 space-y-4">
                    {/* Accepted: one card, two big buttons */}
                    {isApproved && (
                        <div className="rounded-2xl border border-[var(--status-approved)]/40 bg-[var(--status-approved-bg)] p-5 sm:p-6 space-y-4">
                            <div className="flex items-center gap-3.5">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--status-approved-fg)] text-[var(--status-approved-bg)]">
                                    <Check className="h-7 w-7" strokeWidth={2.8} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--status-approved-fg)]">Accepted</h2>
                                    <p className="text-base text-foreground">
                                        {entry.student_name.split(' ')[0]} can compete.
                                        {entry.chest_no ? <b> Chest number {entry.chest_no}.</b> : null}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Link
                                    href={`/athlete/entries/${entry.id}/id-card`}
                                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                    <Smartphone className="h-5 w-5" aria-hidden="true" />
                                    Show ID card
                                </Link>
                                <IdCardDownload
                                    entryId={entry.id}
                                    label="Download to print (A4)"
                                    size="default"
                                    variant="outline"
                                    customButtonClass="min-h-[52px] w-full rounded-xl text-base font-semibold gap-2"
                                />
                            </div>
                            <p className="text-[15px] text-[var(--status-approved-fg)]">
                                Show the ID card on your phone at the gate, or bring it printed.
                            </p>
                        </div>
                    )}

                    {/* Card 2: Registration Progress & Stepper */}
                    <div className="bg-white border border-border dark:bg-card dark:border-border rounded-[18px] p-5 sm:p-6 shadow-xs">
                        <h2 className="text-lg font-bold text-foreground mb-3">What happened</h2>

                {/* Status Callout Box */}
                {isPendingCoach && (
                    <div className="bg-amber-500/10 border border-amber-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[19px] font-bold mt-1 text-foreground">
                            With your coach
                        </div>
                        <div className="text-base text-muted-foreground dark:text-foreground mt-1 leading-[1.45]">
                            Your coach is checking it. Then they send it to the organiser.
                        </div>
                    </div>
                )}

                {isSubmitted && (
                    <div className="bg-amber-500/10 border border-amber-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[19px] font-bold mt-1 text-foreground">
                            With the organiser
                        </div>
                        <div className="text-base text-muted-foreground dark:text-foreground mt-1 leading-[1.45]">
                            Your coach checked it and sent it on. The organiser will accept it.
                        </div>
                    </div>
                )}

                {isCorrectionNeeded && (
                    <div className="bg-orange-500/10 border border-orange-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[19px] font-bold mt-1 text-foreground">
                            Needs a fix
                        </div>
                        <div className="text-base text-muted-foreground dark:text-foreground mt-1 leading-[1.45]">
                            {entry.coach_notes
                                ? `Coach says: "${entry.coach_notes}"`
                                : 'Your coach asked you to change something. Fix it below and send it again.'}
                        </div>
                    </div>
                )}

                {(isDeclined || isRejected) && (
                    <div className="bg-rose-500/10 border border-rose-500/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[19px] font-bold mt-1 text-foreground">
                            {isDeclined ? 'Not accepted by your coach' : 'Not accepted by the organiser'}
                        </div>
                        <div className="text-base text-muted-foreground dark:text-foreground mt-1 leading-[1.45]">
                            {entry.rejection_reason || entry.coach_notes || 'This entry was not accepted for this event.'}
                        </div>
                    </div>
                )}

                {isWithdrawn && (
                    <div className="bg-muted border border-border dark:bg-muted-foreground/10 dark:border-muted-foreground/35 rounded-[12px] p-[14px_16px] mb-5">
                        <div className="text-[19px] font-bold mt-1 text-foreground">
                            Cancelled
                        </div>
                        <div className="text-base text-muted-foreground dark:text-foreground mt-1 leading-[1.45]">
                            {entry.rejection_reason || 'You cancelled this entry.'}
                        </div>
                    </div>
                )}

                {/* Vertical Stepper: Step 1, Step 2, Step 3 */}
                <div className="space-y-0">
                    {/* Step 1: You sent the entry */}
                    <div className="flex gap-3.5 h-[70px]">
                        <div className="flex flex-col items-center w-[30px] shrink-0">
                            <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center shrink-0">
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
                                        ? 'bg-primary'
                                        : isSubmitted || isApproved || isRejected
                                        ? 'bg-primary'
                                        : 'bg-border'
                                }`}
                            />
                        </div>
                        <div className="pt-1 flex-1">
                            <b className="text-[16px] font-semibold block text-foreground">
                                You sent the entry
                            </b>
                            <small className="text-[15px] text-muted-foreground block mt-0.5 leading-[1.4]">
                                {step1Date || 'Sent'}
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
                                <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center shrink-0">
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
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-border text-muted-foreground text-[13px] font-bold flex items-center justify-center shrink-0">
                                    2
                                </div>
                            )}

                            <div
                                className={`w-[2px] flex-1 my-1 ${
                                    isApproved ? 'bg-primary' : 'bg-border'
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
                                        : 'text-foreground'
                                }`}
                            >
                                Coach checks it
                            </b>
                            <small className="text-[15px] text-muted-foreground block mt-0.5 leading-[1.4]">
                                {isPendingCoach
                                    ? 'Checking now'
                                    : isSubmitted || isApproved
                                    ? step2Date
                                        ? `Done · ${step2Date}`
                                        : 'Done'
                                    : isCorrectionNeeded
                                    ? 'Asked you to fix something'
                                    : isDeclined
                                    ? 'Coach did not send it'
                                    : 'Not yet'}
                            </small>
                        </div>
                    </div>

                    {/* Step 3: Organiser acceptance */}
                    <div className="flex gap-3.5 h-auto">
                        <div className="flex flex-col items-center w-[30px] shrink-0">
                            {isApproved ? (
                                <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center shrink-0">
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
                                <div className="w-[30px] h-[30px] rounded-full border-2 border-border text-muted-foreground text-[13px] font-bold flex items-center justify-center shrink-0">
                                    3
                                </div>
                            )}
                        </div>

                        <div className="pt-1 flex-1 pb-1">
                            <b
                                className={`text-[16px] font-semibold block ${
                                    isApproved
                                        ? 'text-primary'
                                        : isSubmitted
                                        ? 'text-[#f5c542]'
                                        : isRejected
                                        ? 'text-[#f87171]'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                Organiser accepts it
                            </b>
                            <small className="text-[15px] text-muted-foreground block mt-0.5 leading-[1.4]">
                                {isApproved
                                    ? entry.chest_no
                                        ? `Accepted · Chest number ${entry.chest_no}`
                                        : 'Accepted'
                                    : isSubmitted
                                    ? 'Checking now'
                                    : isRejected
                                    ? 'Not accepted'
                                    : 'Not yet'}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. Left Column Bottom: Registration Details & Actions */}
        <div className="lg:col-span-5 2xl:col-span-4 order-3 lg:order-3 space-y-4">
                    {/* Card 3: Registration Details (matches Entry.dc.html lines 62-71) */}
                    <div className="bg-white border border-border dark:bg-card dark:border-border rounded-[18px] p-5 sm:p-6 pb-2 shadow-xs">
                        <div className="text-lg font-bold text-foreground mb-0.5">
                            Entry details
                        </div>

                <div className="divide-y divide-border">
                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[15px] text-muted-foreground shrink-0">Athlete</span>
                        <b className="text-base font-semibold text-right break-words text-foreground">
                            {entry.student_name}
                        </b>
                    </div>

                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[15px] text-muted-foreground shrink-0">Coach</span>
                        <b className="text-base font-semibold text-right break-words text-foreground">
                            {entry.coach_name || '—'}
                        </b>
                    </div>

                    {entry.category_name && (
                        <div className="flex justify-between items-baseline gap-3.5 py-3">
                            <span className="text-[15px] text-muted-foreground shrink-0">Category</span>
                            <b className="text-base font-semibold text-right break-words text-foreground">
                                {entry.category_name}
                            </b>
                        </div>
                    )}

                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[15px] text-muted-foreground shrink-0">Weight</span>
                        <b className="text-base font-semibold text-right break-words text-foreground">
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
                        <span className="text-[15px] text-muted-foreground shrink-0">Sent on</span>
                        <b className="text-base font-semibold text-right break-words text-foreground">
                            {submittedFormatted}
                        </b>
                    </div>

                    {/* Events: only what was chosen, in words */}
                    <div className="flex justify-between items-baseline gap-3.5 py-3">
                        <span className="text-[15px] text-muted-foreground shrink-0">Events</span>
                        <b className="text-base font-semibold text-right text-foreground">
                            {[
                                applied.kata && 'Kata',
                                applied.kumite && 'Kumite',
                                applied.teamKata && 'Team Kata',
                                applied.teamKumite && 'Team Kumite',
                            ].filter(Boolean).join(', ') || '—'}
                        </b>
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
