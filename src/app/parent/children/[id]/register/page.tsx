// ============================================================================
// EntryDesk — Parent Tournament Registration Page
// src/app/parent/children/[id]/register/page.tsx
// Parents register a child for an open tournament approved for their dojo.
// ============================================================================

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { ChevronLeft, Trophy } from 'lucide-react'
import { RegistrationForm } from '@/components/parent/registration-form'

interface RegisterPageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ event?: string }>
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
    const { id } = await params
    const rows = await sql<{ name: string }[]>`
        SELECT name FROM students WHERE id = ${id} LIMIT 1
    `
    if (!rows.length) return { title: 'Register for Tournament — EntryDesk' }
    return { title: `Register ${rows[0].name} — EntryDesk` }
}

export default async function RegisterTournamentPage({
    params,
    searchParams,
}: RegisterPageProps) {
    const { id } = await params
    const { event: preselectedEventId } = await searchParams
    const { user } = await requireRole('parent', { redirectTo: '/login' })

    // Fetch child details strictly scoped to current parent
    const studentRows = await sql<{
        id: string
        name: string
        gender: string
        date_of_birth: string | Date | null
        rank: string | null
        weight: number | null
        photo_url: string | null
        dojo_id: string
        dojo_name: string
        coach_name: string | null
    }[]>`
        SELECT
            s.id,
            s.name,
            s.gender,
            s.date_of_birth,
            s.rank,
            s.weight,
            s.photo_url,
            s.dojo_id,
            d.name AS dojo_name,
            u.full_name AS coach_name
        FROM students s
        JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN users u ON d.coach_id = u.id
        WHERE s.id = ${id}
          AND s.parent_id = ${user.id}
          AND s.membership_status = 'active'
        LIMIT 1
    `

    if (!studentRows.length) {
        notFound()
    }

    const rawChild = studentRows[0]
    const child = {
        ...rawChild,
        date_of_birth: rawChild.date_of_birth
            ? (rawChild.date_of_birth instanceof Date
                ? rawChild.date_of_birth.toISOString().slice(0, 10)
                : String(rawChild.date_of_birth).slice(0, 10))
            : null,
    }

    // Fetch open tournaments where this dojo's coach is approved
    const today = new Date().toISOString().slice(0, 10)
    const eventRows = await sql<{
        id: string
        title: string
        description: string | null
        start_date: string | Date
        end_date: string | Date
        location: string | null
        registration_close_date: string | Date | null
        photo_required: boolean
        coach_checks_each_entry: boolean
    }[]>`
        SELECT DISTINCT
            ev.id,
            ev.title,
            ev.description,
            ev.start_date,
            ev.end_date,
            ev.location,
            ev.registration_close_date,
            COALESCE(ev.photo_required, FALSE) AS photo_required,
            COALESCE(ev.coach_checks_each_entry, TRUE) AS coach_checks_each_entry
        FROM events ev
        JOIN dojos d ON d.id = ${child.dojo_id}
        LEFT JOIN event_applications ea ON ea.event_id = ev.id AND (
            ea.coach_id = d.coach_id 
            OR EXISTS (SELECT 1 FROM dojo_collaborators dc WHERE dc.dojo_id = d.id AND dc.user_id = ea.coach_id)
        )
        WHERE (
            ea.status = 'approved'
            OR ev.organizer_id = d.coach_id
            OR EXISTS (SELECT 1 FROM dojo_collaborators dc WHERE dc.dojo_id = d.id AND dc.user_id = ev.organizer_id)
        )
          AND ev.is_registration_open = TRUE
          AND (ev.registration_close_date IS NULL OR ev.registration_close_date >= ${today})
          AND ev.end_date >= ${today}
        ORDER BY ev.start_date ASC
    `

    // Fetch existing entries for this child to detect duplicates
    const existingEntries = await sql<{
        id: string
        event_id: string
        status: string
    }[]>`
        SELECT id, event_id, status
        FROM entries
        WHERE student_id = ${child.id}
    `
    const entryMap = new Map<string, { id: string; status: string }>()
    for (const entry of existingEntries) {
        entryMap.set(entry.event_id, { id: entry.id, status: entry.status })
    }

    // Fetch event days for all available tournaments
    const eventIds = eventRows.map((e) => e.id)
    const eventDaysRows = eventIds.length > 0 ? await sql<{
        id: string
        event_id: string
        date: string | Date
        name: string | null
    }[]>`
        SELECT id, event_id, date, name
        FROM event_days
        WHERE event_id = ANY(${eventIds})
        ORDER BY date ASC
    ` : []

    const eventDaysMap = new Map<string, { id: string; date: string; name: string }[]>()
    for (const d of eventDaysRows) {
        const list = eventDaysMap.get(d.event_id) || []
        const isoDate = d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10)
        list.push({
            id: d.id,
            date: isoDate,
            name: d.name || `Day ${list.length + 1}`,
        })
        eventDaysMap.set(d.event_id, list)
    }

    // Ensure event days exist for any multi-day or single-day events that didn't have rows
    for (const ev of eventRows) {
        const existingDays = eventDaysMap.get(ev.id) || []
        if (existingDays.length === 0) {
            const start = ev.start_date instanceof Date ? ev.start_date.toISOString().slice(0, 10) : String(ev.start_date).slice(0, 10)
            const end = ev.end_date instanceof Date ? ev.end_date.toISOString().slice(0, 10) : String(ev.end_date).slice(0, 10)
            const inserted = await sql<{ id: string; date: string | Date; name: string | null }[]>`
                INSERT INTO event_days (event_id, date, name)
                SELECT 
                    ${ev.id},
                    d::date,
                    'Day ' || ROW_NUMBER() OVER (ORDER BY d)
                FROM generate_series(${start}::date, ${end}::date, '1 day'::interval) AS d
                RETURNING id, date, name
            `
            eventDaysMap.set(ev.id, inserted.map((d, idx) => ({
                id: d.id,
                date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
                name: d.name || `Day ${idx + 1}`,
            })))
        }
    }

    const tournaments = eventRows.map((e) => {
        const existing = entryMap.get(e.id)
        return {
            ...e,
            start_date: e.start_date instanceof Date ? e.start_date.toISOString().slice(0, 10) : String(e.start_date).slice(0, 10),
            end_date: e.end_date instanceof Date ? e.end_date.toISOString().slice(0, 10) : String(e.end_date).slice(0, 10),
            registration_close_date: e.registration_close_date
                ? (e.registration_close_date instanceof Date
                    ? e.registration_close_date.toISOString().slice(0, 10)
                    : String(e.registration_close_date).slice(0, 10))
                : null,
            existing_entry_id: existing?.id ?? null,
            existing_entry_status: existing?.status ?? null,
            days: eventDaysMap.get(e.id) || [],
        }
    })

    return (
        <div className="w-full max-w-6xl 2xl:max-w-[1600px] mx-auto pb-16 space-y-6">
            {/* Top Navigation */}
            <div>
                <Link
                    href={`/athlete/${child.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#57534e] hover:text-[#1c1917] dark:text-[#8a99ab] dark:hover:text-[#e8eef5] transition-colors group"
                >
                    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to {child.name}’s profile
                </Link>
            </div>

            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:bg-[#2dd4b4]/15 dark:border-[#2dd4b4]/30 dark:text-[#2dd4b4]">
                        <Trophy className="h-5 w-5" />
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#e8eef5]">
                        Register for Tournament
                    </h1>
                </div>
                <p className="text-sm text-[#57534e] dark:text-[#8a99ab] max-w-2xl">
                    Register <span className="font-semibold text-[#1c1917] dark:text-[#e8eef5]">{child.name}</span> ({child.dojo_name}) for championship events.
                </p>
            </div>

            {/* Responsive 2-column layout on desktop (14", 15.6", 16"), stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 2xl:gap-10 items-start">
                {/* Left Column: Athlete Profile Card & Policy Guidelines */}
                <div className="lg:col-span-4 2xl:col-span-3 space-y-4 lg:sticky lg:top-20">
                    {/* Athlete Summary Card */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 shadow-xs space-y-4">
                        <div className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-emerald-700 dark:text-[#2dd4b4]">
                            Athlete Summary
                        </div>
                        <div className="flex items-center gap-3.5">
                            {child.photo_url ? (
                                <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-emerald-500 dark:border-[#2dd4b4] bg-[#eee9df] dark:bg-[#16233a] shrink-0">
                                    <Image
                                        src={child.photo_url}
                                        alt={child.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-14 w-14 rounded-full border-2 border-emerald-500 dark:border-[#2dd4b4] bg-emerald-50 dark:bg-[#16233a] flex items-center justify-center text-emerald-700 dark:text-[#2dd4b4] font-bold text-xl shrink-0">
                                    {child.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-base text-[#1c1917] dark:text-[#e8eef5] truncate">{child.name}</h3>
                                <p className="text-xs text-[#57534e] dark:text-[#8a99ab] truncate">{child.dojo_name}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    {child.rank && (
                                        <span className="text-[11px] font-semibold bg-[#eee9df] text-[#1c1917] dark:bg-[#1a2a44] dark:text-[#e8eef5] rounded px-2 py-0.5">
                                            {child.rank}
                                        </span>
                                    )}
                                    {child.weight && (
                                        <span className="text-[11px] font-semibold bg-[#eee9df] text-[#57534e] dark:bg-[#1a2a44] dark:text-[#8a99ab] rounded px-2 py-0.5">
                                            {child.weight} kg
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {child.coach_name && (
                            <div className="pt-3 border-t border-[#ded8cb] dark:border-[#1f2b40] text-xs flex justify-between items-center text-[#57534e] dark:text-[#8a99ab]">
                                <span>Assigned Coach</span>
                                <span className="font-medium text-[#1c1917] dark:text-[#e8eef5]">{child.coach_name}</span>
                            </div>
                        )}
                    </div>

                    {/* How It Works Card */}
                    <div className="bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 shadow-xs space-y-3">
                        <div className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[#57534e] dark:text-[#8a99ab]">
                            Registration Flow
                        </div>
                        <div className="space-y-3 text-xs text-[#57534e] dark:text-[#8a99ab] leading-relaxed">
                            <div className="flex gap-2.5 items-start">
                                <span className="flex h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:bg-[#2dd4b4]/15 dark:border-[#2dd4b4]/30 dark:text-[#2dd4b4] text-[11px] font-bold items-center justify-center shrink-0 mt-0.5">1</span>
                                <p><strong className="text-[#1c1917] dark:text-[#e8eef5]">Apply:</strong> Select category &amp; confirm weight. Your entry is sent to your coach.</p>
                            </div>
                            <div className="flex gap-2.5 items-start">
                                <span className="flex h-5 w-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:bg-[#f5c542]/15 dark:border-[#f5c542]/30 dark:text-[#f5c542] text-[11px] font-bold items-center justify-center shrink-0 mt-0.5">2</span>
                                <p><strong className="text-[#1c1917] dark:text-[#e8eef5]">Coach Review:</strong> Coach verifies your eligibility and forwards to the organiser.</p>
                            </div>
                            <div className="flex gap-2.5 items-start">
                                <span className="flex h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:bg-[#2dd4b4]/15 dark:border-[#2dd4b4]/30 dark:text-[#2dd4b4] text-[11px] font-bold items-center justify-center shrink-0 mt-0.5">3</span>
                                <p><strong className="text-[#1c1917] dark:text-[#e8eef5]">Chest Number:</strong> Once organiser confirms, your official digital pass is issued.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Registration Form */}
                <div className="lg:col-span-8 2xl:col-span-9 bg-white border border-[#ded8cb] dark:bg-[#111a2b] dark:border-[#1f2b40] rounded-[18px] p-5 sm:p-7 2xl:p-8 shadow-xs">
                    <RegistrationForm
                        child={child}
                        tournaments={tournaments}
                        preselectedEventId={preselectedEventId}
                    />
                </div>
            </div>
        </div>
    )
}
