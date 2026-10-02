// ============================================================================
// EntryDesk — Child Detail Page (Parent / Student Portal)
// src/app/parent/children/[id]/page.tsx
// Faithfully replicates the Student Portal reference design (Portal.dc.html).
// Obsidian dark palette (#0a1220 / #111a2b), teal accents (#2dd4b4), Google Sans typography.
// ============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import {
    calculateAge,
    formatDobLong,
    formatTournamentDateRangeLong,
    formatCloseDateBadge,
} from '@/lib/date'
import { isRegistrationClosed, toIsoDate } from '@/lib/events/registration'
import { AthleteIdActions } from '@/components/id-card/athlete-id-actions'
import { ChildPhotoAvatar } from '@/components/parent/child-photo-avatar'
import { EditAthleteTrigger } from '@/components/parent/edit-athlete-dialog'

interface ChildPageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ChildPageProps): Promise<Metadata> {
    const { id } = await params
    const rows = await sql<{ name: string }[]>`
        SELECT name FROM students WHERE id = ${id} LIMIT 1
    `
    if (!rows.length) return { title: 'Athlete Details — EntryDesk' }
    return { title: `${rows[0].name} — EntryDesk` }
}

function getEntryCardState(status: string) {
    if (status === 'approved') {
        return {
            statusText: 'Pass ready · Confirmed',
            dotClass: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            textClass: 'text-emerald-700 dark:text-[#2dd4b4]',
            stepLabel: 'Step 3 of 3',
            step1: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            step2: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            step3: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            actionInfo: 'View pass',
        }
    }
    if (status === 'submitted') {
        return {
            statusText: 'Under organiser review',
            dotClass: 'bg-sky-500 dark:bg-[#38bdf8]',
            textClass: 'text-sky-700 dark:text-[#38bdf8]',
            stepLabel: 'Step 2 of 3',
            step1: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            step2: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            step3: 'bg-sky-500 dark:bg-[#38bdf8]',
            actionInfo: 'View status',
        }
    }
    if (status === 'correction_needed') {
        return {
            statusText: 'Action required · Update entry',
            dotClass: 'bg-orange-500',
            textClass: 'text-orange-700 dark:text-orange-400',
            stepLabel: 'Action required',
            step1: 'bg-emerald-600 dark:bg-[#2dd4b4]',
            step2: 'bg-orange-500',
            step3: 'bg-[#ded8cb] dark:bg-[#243349]',
            actionInfo: 'Update entry',
        }
    }
    if (status === 'coach_declined' || status === 'rejected') {
        return {
            statusText: 'Entry declined',
            dotClass: 'bg-rose-500',
            textClass: 'text-rose-700 dark:text-rose-400',
            stepLabel: 'Declined',
            step1: 'bg-[#ded8cb] dark:bg-[#243349]',
            step2: 'bg-rose-500',
            step3: 'bg-[#ded8cb] dark:bg-[#243349]',
            actionInfo: 'View details',
        }
    }
    // Default: 'pending_coach' (Waiting for coach) — Matches reference design Step 2 of 3
    return {
        statusText: 'Waiting for coach',
        dotClass: 'bg-amber-500 dark:bg-[#f5c542]',
        textClass: 'text-amber-700 dark:text-[#f5c542]',
        stepLabel: 'Step 2 of 3',
        step1: 'bg-emerald-600 dark:bg-[#2dd4b4]',
        step2: 'bg-amber-400 dark:bg-[#f5c542]',
        step3: 'bg-[#ded8cb] dark:bg-[#243349]',
        actionInfo: 'View timeline',
    }
}

export default async function ChildDetailPage({ params }: ChildPageProps) {
    const { id } = await params
    const { user } = await requireRole('parent', { redirectTo: '/login' })

    // Fetch child details strictly scoped to current parent
    const students = await sql<{
        id: string
        name: string
        gender: string
        date_of_birth: string | null
        rank: string | null
        weight: number | null
        school_or_city: string | null
        phone: string | null
        photo_url: string | null
        dojo_id: string
        dojo_name: string
        city: string | null
        coach_name: string | null
        created_at: string
    }[]>`
        SELECT
            s.id,
            s.name,
            s.gender,
            s.date_of_birth,
            s.rank,
            s.weight,
            s.school_or_city,
            s.phone,
            s.photo_url,
            s.dojo_id,
            d.name AS dojo_name,
            d.city,
            u.full_name AS coach_name,
            s.created_at
        FROM students s
        JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN users u ON d.coach_id = u.id
        WHERE s.id = ${id}
          AND s.parent_id = ${user.id}
          AND s.membership_status = 'active'
        LIMIT 1
    `

    if (!students.length) {
        notFound()
    }

    const child = students[0]

    // Fetch entries and approved tournaments for this child's dojo in parallel
    const [entries, approvedTournaments] = await Promise.all([
        sql<{
            id: string
            event_id: string
            event_title: string
            start_date: string
            end_date: string
            location: string | null
            status: string
            event_day_id: string | null
            event_day_name: string | null
            event_day_date: string | Date | null
            category_name: string | null
            coach_notes: string | null
            rejection_reason: string | null
            created_at: string
            qr_token: string | null
        }[]>`
            SELECT
                e.id,
                e.event_id,
                ev.title AS event_title,
                ev.start_date,
                ev.end_date,
                ev.location,
                e.status,
                e.event_day_id,
                ed.name AS event_day_name,
                ed.date AS event_day_date,
                COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
                e.coach_notes,
                e.rejection_reason,
                e.created_at,
                e.qr_token
            FROM entries e
            JOIN events ev ON e.event_id = ev.id
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN event_days ed ON e.event_day_id = ed.id
            WHERE e.student_id = ${child.id}
            ORDER BY ev.start_date DESC
        `,
        sql<{
            id: string
            title: string
            start_date: string
            end_date: string
            location: string | null
            registration_close_date: string | null
            is_registration_open: boolean
        }[]>`
            SELECT DISTINCT
                ev.id,
                ev.title,
                ev.start_date,
                ev.end_date,
                ev.location,
                ev.registration_close_date,
                COALESCE(ev.is_registration_open, TRUE) AS is_registration_open
            FROM events ev
            JOIN dojos d ON d.id = ${child.dojo_id}
            LEFT JOIN event_applications ea ON ea.event_id = ev.id AND (
                ea.coach_id = d.coach_id 
                OR EXISTS (SELECT 1 FROM dojo_collaborators dc WHERE dc.dojo_id = d.id AND dc.user_id = ea.coach_id)
            )
            WHERE (
                LOWER(ea.status) = 'approved'
                OR ev.organizer_id = d.coach_id
                OR EXISTS (SELECT 1 FROM dojo_collaborators dc WHERE dc.dojo_id = d.id AND dc.user_id = ev.organizer_id)
            )
            ORDER BY ev.start_date DESC
        `,
    ])

    // Formatted details
    const dobFormattedLong = formatDobLong(child.date_of_birth)
    const ageString = calculateAge(child.date_of_birth)
    const citySchoolText = [child.city, child.school_or_city].filter(Boolean).join(' · ') || child.school_or_city || child.city || '—'

    // Separate active/open events from past/closed events
    const todayIso = new Date().toISOString().slice(0, 10)

    const isEventDatePast = (
        endDateVal: string | Date | null | undefined,
        startDateVal?: string | Date | null | undefined
    ) => {
        const iso = toIsoDate(endDateVal) || toIsoDate(startDateVal)
        if (!iso) return false
        return iso < todayIso
    }

    // Active entries: registered event is ongoing or in future AND entry has not been withdrawn or declined
    const activeEntries = entries.filter(
        (e) => !isEventDatePast(e.end_date, e.start_date) && e.status !== 'withdrawn' && e.status !== 'coach_declined'
    )
    // Past participated entries: ONLY events whose tournament date has passed where this athlete actually entered (and was not withdrawn/declined/rejected)
    const pastParticipatedEntries = entries.filter(
        (e) => isEventDatePast(e.end_date, e.start_date) && !['withdrawn', 'coach_declined', 'rejected'].includes(e.status)
    )

    // Active event IDs: tournaments where the athlete currently holds an active non-withdrawn registration
    const activeRegisteredEventIds = new Set(activeEntries.map((e) => e.event_id))

    // Unentered tournaments: tournaments where athlete doesn't have an active registration (allows re-applying after withdrawal)
    const unenteredTournaments = approvedTournaments.filter((t) => !activeRegisteredEventIds.has(t.id))

    // Open tournaments: not entered, registration is open, and event is upcoming
    const openTournaments = unenteredTournaments.filter((t) => {
        const isClosed = isRegistrationClosed(t, todayIso)
        const isPast = isEventDatePast(t.end_date, t.start_date)
        return !isClosed && !isPast
    })

    return (
        <div className="w-full min-h-screen text-[#1c1917] dark:text-[#e8eef5] space-y-4 pb-14 font-sans select-none">
            {/* 1. Top Navigation Bar */}
            <div className="flex items-center justify-between py-1 px-1">
                <Link
                    href="/athlete"
                    className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-[#57534e] hover:text-[#1c1917] dark:text-[#8a99ab] dark:hover:text-[#e8eef5] transition-colors group"
                >
                    <span className="text-xl leading-none font-light group-hover:-translate-x-0.5 transition-transform">‹</span>
                    <span>All profiles</span>
                </Link>
                <span className="text-[12px] font-mono tracking-tight text-[#57534e] border border-[#ded8cb] rounded-md px-2.5 py-0.5 tabular-nums bg-white shadow-2xs dark:text-[#8a99ab] dark:border-[#1f2b40] dark:bg-[#111a2b]/80">
                    ID {child.id.slice(0, 8)}
                </span>
            </div>

            {/* Responsive Main Layout: 2 Columns on desktop (lg+), 1 Column stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 2xl:gap-10 items-start">
                {/* Left Column: Athlete Profile Card, Personal Details & Contact */}
                <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-3 space-y-4 lg:sticky lg:top-20">
                    {/* Athlete Header Card */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 shadow-xs">
                        <div className="flex items-center gap-4">
                            {/* 84x84 Circular Avatar with interactive upload */}
                            <ChildPhotoAvatar
                                childId={child.id}
                                childName={child.name}
                                initialPhotoUrl={child.photo_url}
                            />

                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <h1 className="text-[22px] sm:text-[25px] font-bold leading-[1.1] text-[#1c1917] dark:text-[#e8eef5] truncate">
                                        {child.name}
                                    </h1>
                                    <EditAthleteTrigger
                                        student={child}
                                        target="basic"
                                    />
                                </div>

                                {/* Chips: Gender & Calculated Age */}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[13px] font-semibold bg-[#eee9df] text-[#1c1917] dark:bg-[#1a2a44] dark:text-[#e8eef5] rounded-md px-2.5 py-0.5 capitalize shadow-2xs">
                                        {child.gender}
                                    </span>
                                    {ageString && (
                                        <span className="text-[13px] font-semibold bg-[#eee9df] text-[#1c1917] dark:bg-[#1a2a44] dark:text-[#e8eef5] rounded-md px-2.5 py-0.5 shadow-2xs">
                                            {ageString}
                                        </span>
                                    )}
                                </div>

                                {/* Dojo name */}
                                <div className="text-[13.5px] mt-2 text-[#1c1917] dark:text-[#e8eef5] truncate">
                                    <span className="text-[#57534e] dark:text-[#8a99ab] mr-1.5 font-normal">Dojo</span>
                                    <span className="font-semibold">{child.dojo_name}</span>
                                </div>

                                {/* Coach name */}
                                <div className="text-[13.5px] mt-0.5 text-[#1c1917] dark:text-[#e8eef5] truncate">
                                    <span className="text-[#57534e] dark:text-[#8a99ab] mr-1.5 font-normal">Coach</span>
                                    <span className="font-medium">{child.coach_name || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Details Card */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-[16px_20px] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[#0d9488] dark:text-[#2dd4b4]">
                                Personal details
                            </div>
                            <EditAthleteTrigger
                                student={child}
                                target="personal"
                            />
                        </div>

                        <div className="divide-y divide-[#ded8cb] dark:divide-[#1f2b40]">
                            <div className="flex items-baseline justify-between gap-3.5 py-3">
                                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Belt</span>
                                <b className="text-[15.5px] font-semibold text-right text-[#1c1917] dark:text-[#e8eef5] break-words">
                                    {child.rank || '—'}
                                </b>
                            </div>
                            <div className="flex items-baseline justify-between gap-3.5 py-3">
                                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Weight</span>
                                <b className="text-[15.5px] font-semibold text-right text-[#1c1917] dark:text-[#e8eef5] break-words">
                                    {child.weight ? `${child.weight} kg` : '—'}
                                </b>
                            </div>
                            <div className="flex items-baseline justify-between gap-3.5 py-3">
                                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Date of birth</span>
                                <b className="text-[15.5px] font-semibold text-right text-[#1c1917] dark:text-[#e8eef5] break-words">
                                    {dobFormattedLong || '—'}
                                </b>
                            </div>
                            <div className="flex items-baseline justify-between gap-3.5 py-3">
                                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">City / School</span>
                                <b className="text-[15.5px] font-semibold text-right text-[#1c1917] dark:text-[#e8eef5] break-words">
                                    {citySchoolText}
                                </b>
                            </div>
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-[16px_20px] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[#0d9488] dark:text-[#2dd4b4]">
                                Contact
                            </div>
                            <EditAthleteTrigger
                                student={child}
                                target="contact"
                            />
                        </div>

                        <div className="divide-y divide-[#ded8cb] dark:divide-[#1f2b40]">
                            <div className="flex items-baseline justify-between gap-3.5 py-3">
                                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Email</span>
                                <b className="text-[15.5px] font-semibold text-right text-[#1c1917] dark:text-[#e8eef5] break-words">
                                    {user.email || '—'}
                                </b>
                            </div>
                            <div className="flex items-baseline justify-between gap-3.5 py-3">
                                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0">Phone</span>
                                <b className="text-[15.5px] font-semibold text-right text-[#1c1917] dark:text-[#e8eef5] break-words">
                                    {child.phone || '—'}
                                </b>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tournaments & Past Events */}
                <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-9 space-y-6">
                    {/* Active Tournaments Section (Open & Registered) */}
                    <div>
                        <div className="text-[22px] font-bold text-[#1c1917] dark:text-[#e8eef5]">Tournaments</div>
                        <div className="text-[14.5px] text-[#57534e] dark:text-[#8a99ab] mt-1 mb-3.5">
                            Your active registrations &amp; upcoming tournaments.
                        </div>

                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                            {/* 1. Active Registered Entries */}
                            {activeEntries.map((entry) => {
                                const cardState = getEntryCardState(entry.status)

                                return (
                                    <Link
                                        key={entry.id}
                                        href={`/athlete/entries/${entry.id}`}
                                        className="group min-w-0 bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[16px] p-4 sm:p-[16px_16px_16px_18px] shadow-xs hover:shadow-md hover:border-[#0d9488]/40 dark:hover:border-[#2dd4b4]/40 transition-all flex items-center gap-4 text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            {/* Status line with dot */}
                                            <div className={`flex items-center gap-2 text-[13px] font-semibold ${cardState.textClass}`}>
                                                <span className={`w-2 h-2 rounded-full ${cardState.dotClass} shrink-0`} />
                                                <span className="truncate">{cardState.statusText}</span>
                                            </div>

                                            {/* Tournament Name strictly on 1 line with ellipsis */}
                                            <div
                                                className="text-[19px] font-bold text-[#1c1917] dark:text-[#e8eef5] mt-2 leading-[1.2] truncate"
                                                title={entry.event_title}
                                            >
                                                {entry.event_title}
                                            </div>

                                            {/* Metadata row with SVG icons matching reference */}
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-[14px] text-[#57534e] dark:text-[#8a99ab]">
                                                <span className="inline-flex items-center gap-1.5 shrink-0">
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                        <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
                                                        <path d="M1.5 6h11M4.5 1v3M9.5 1v3" />
                                                    </svg>
                                                    {formatTournamentDateRangeLong(entry.start_date, entry.end_date)}
                                                </span>
                                                {(entry.location || entry.category_name) && (
                                                    <span className="inline-flex items-center gap-1.5 truncate">
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                            <path d="M7 13s4.5-3.9 4.5-7.2a4.5 4.5 0 10-9 0C2.5 9.1 7 13 7 13z" />
                                                            <circle cx="7" cy="5.8" r="1.5" />
                                                        </svg>
                                                        <span className="truncate">
                                                            {[entry.category_name, entry.location].filter(Boolean).join(', ')}
                                                        </span>
                                                    </span>
                                                )}
                                                {entry.event_day_name && (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-[#2dd4b4] border border-emerald-500/20 text-xs font-semibold shrink-0">
                                                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                            <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
                                                            <path d="M1.5 6h11M4.5 1v3M9.5 1v3" />
                                                        </svg>
                                                        <span>{entry.event_day_name}</span>
                                                        {entry.event_day_date && (
                                                            <span className="opacity-80">
                                                                ({new Date(entry.event_day_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Coach note callout if present */}
                                            {(entry.coach_notes || entry.rejection_reason) && (
                                                <div className="rounded-xl bg-[#fff8ea] border border-amber-200 dark:bg-[#0d1626] dark:border-[#1f2b40] p-2.5 text-xs mt-2.5">
                                                    {entry.coach_notes && (
                                                        <p className="text-amber-800 dark:text-amber-400 truncate">
                                                            <span className="font-semibold">Coach note: </span>{entry.coach_notes}
                                                        </p>
                                                    )}
                                                    {entry.rejection_reason && (
                                                        <p className="text-rose-800 dark:text-rose-400 truncate mt-0.5">
                                                            <span className="font-semibold">Reason: </span>{entry.rejection_reason}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* 3-segment progress bar */}
                                            <div className="flex items-center gap-3 mt-4">
                                                <div className="flex gap-1 flex-1 max-w-none">
                                                    <i className={`flex-1 h-1 rounded-[2px] ${cardState.step1}`} />
                                                    <i className={`flex-1 h-1 rounded-[2px] ${cardState.step2}`} />
                                                    <i className={`flex-1 h-1 rounded-[2px] ${cardState.step3}`} />
                                                </div>
                                                <span className="text-[12.5px] text-[#57534e] dark:text-[#8a99ab] whitespace-nowrap font-medium">
                                                    {cardState.stepLabel}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: info text before arrow + side arrow > */}
                                        <div className="flex items-center gap-1.5 shrink-0 text-[12.5px] sm:text-[13px] font-semibold text-[#57534e] dark:text-[#8a99ab] group-hover:text-emerald-700 dark:group-hover:text-[#2dd4b4] transition-colors">
                                            <span className="whitespace-nowrap">{cardState.actionInfo}</span>
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-[#8a99ab] dark:text-[#6b7b8f] group-hover:text-emerald-700 dark:group-hover:text-[#2dd4b4] transition-all group-hover:translate-x-0.5 shrink-0"
                                            >
                                                <path d="M6 3l5 5-5 5" />
                                            </svg>
                                        </div>
                                    </Link>
                                )
                            })}

                            {/* 2. Open Tournaments (Ready to Register) */}
                            {openTournaments.map((t) => {
                                const closeDateBadge = formatCloseDateBadge(t.registration_close_date)

                                return (
                                    <div
                                        key={t.id}
                                        className="min-w-0 bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[16px] p-4 sm:p-[16px_16px_16px_18px] shadow-xs flex flex-col justify-between"
                                    >
                                        <div className="min-w-0">
                                            {/* Status line with green dot and close date */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800 dark:text-[#2dd4b4]">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-[#2dd4b4] shrink-0" />
                                                    <span>Registration open</span>
                                                </div>
                                                {closeDateBadge && (
                                                    <span className="text-[12.5px] text-[#57534e] dark:text-[#8a99ab] shrink-0">
                                                        Closes {closeDateBadge}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Tournament Name strictly on 1 line with ellipsis */}
                                            <div
                                                className="text-[19px] font-bold text-[#1c1917] dark:text-[#e8eef5] mt-2 leading-[1.2] truncate"
                                                title={t.title}
                                            >
                                                {t.title}
                                            </div>

                                            {/* Metadata row with SVG icons */}
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-[14px] text-[#57534e] dark:text-[#8a99ab]">
                                                <span className="inline-flex items-center gap-1.5 shrink-0">
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                        <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
                                                        <path d="M1.5 6h11M4.5 1v3M9.5 1v3" />
                                                    </svg>
                                                    {formatTournamentDateRangeLong(t.start_date, t.end_date)}
                                                </span>
                                                {t.location && (
                                                    <span className="inline-flex items-center gap-1.5 truncate">
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                            <path d="M7 13s4.5-3.9 4.5-7.2a4.5 4.5 0 10-9 0C2.5 9.1 7 13 7 13z" />
                                                            <circle cx="7" cy="5.8" r="1.5" />
                                                        </svg>
                                                        <span className="truncate">{t.location}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom button below (NO progress bar, NO side arrow) */}
                                        <div className="mt-4 pt-3 border-t border-[#ded8cb]/60 dark:border-[#1f2b40]/60 flex items-center justify-start">
                                            <Link
                                                href={`/athlete/${child.id}/register?event=${t.id}`}
                                                className="w-full sm:w-auto sm:min-w-[180px] h-[46px] px-6 rounded-md bg-[#0d9488] hover:bg-[#0f766e] text-white dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] dark:text-[#04231e] text-[15px] font-bold flex items-center justify-center transition-all duration-150 active:scale-[0.99] shadow-sm"
                                            >
                                                Register for Tournament
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Empty State when no active entries and no open tournaments */}
                            {openTournaments.length === 0 && activeEntries.length === 0 && (
                                <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[16px] p-6 text-center shadow-xs 2xl:col-span-2">
                                    <p className="text-[15px] font-semibold text-[#1c1917] dark:text-[#e8eef5]">No open tournaments right now</p>
                                    <p className="text-[13px] text-[#57534e] dark:text-[#8a99ab] mt-1">
                                        Tournaments open for {child.dojo_name} will appear here when announced.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Past Events Section — Only events the athlete actually participated in */}
                    {pastParticipatedEntries.length > 0 && (
                        <div className="pt-6">
                            <div className="text-[22px] font-bold text-[#1c1917] dark:text-[#e8eef5]">Past events</div>
                            <div className="text-[14.5px] text-[#57534e] dark:text-[#8a99ab] mt-1 mb-3.5">
                                Completed tournaments and past registrations.
                            </div>

                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5">
                                {pastParticipatedEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="min-w-0 bg-[#f2eee5]/80 border border-[#ded8cb] dark:bg-[#0d1626] dark:border-[#1f2b40] rounded-[16px] p-4 sm:p-[14px_16px_14px_18px] shadow-2xs"
                                    >
                                        <div className="min-w-0">
                                            {/* Status: Completed (NO tick mark!) */}
                                            <div className="text-[13px] font-semibold text-[#57534e] dark:text-[#8a99ab]">
                                                Completed
                                            </div>

                                            {/* Tournament Name strictly on 1 line with ellipsis */}
                                            <div
                                                className="text-[17px] font-semibold text-[#1c1917]/90 dark:text-[#c9d3df] mt-1.5 leading-[1.2] truncate"
                                                title={entry.event_title}
                                            >
                                                {entry.event_title}
                                            </div>

                                            {/* Metadata row with SVG icons */}
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-[14px] text-[#57534e]/85 dark:text-[#6b7b8f]">
                                                <span className="inline-flex items-center gap-1.5 shrink-0">
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                        <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
                                                        <path d="M1.5 6h11M4.5 1v3M9.5 1v3" />
                                                    </svg>
                                                    {formatTournamentDateRangeLong(entry.start_date, entry.end_date)}
                                                </span>
                                                {(entry.location || entry.category_name) && (
                                                    <span className="inline-flex items-center gap-1.5 truncate">
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                                                            <path d="M7 13s4.5-3.9 4.5-7.2a4.5 4.5 0 10-9 0C2.5 9.1 7 13 7 13z" />
                                                            <circle cx="7" cy="5.8" r="1.5" />
                                                        </svg>
                                                        <span className="truncate">
                                                            {[entry.category_name, entry.location].filter(Boolean).join(', ')}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* NO arrow mark! Card is static and non-enterable */}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
