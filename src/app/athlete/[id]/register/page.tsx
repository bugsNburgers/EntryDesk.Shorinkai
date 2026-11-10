// ============================================================================
// EntryDesk — Parent Tournament Registration Page
// src/app/athlete/[id]/register/page.tsx
// Parents register a child for an open tournament approved for their dojo.
// ============================================================================

import type { Metadata } from 'next'
import { SafeAvatar } from '@/components/ui/safe-avatar'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
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
        <div className="mx-auto w-full max-w-2xl space-y-5 pb-16">
            <Link
                href={`/athlete/${child.id}`}
                className="inline-flex min-h-11 items-center gap-1 text-base font-semibold text-foreground hover:text-primary"
            >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                Back
            </Link>

            <div className="flex items-center gap-3.5">
                <SafeAvatar src={child.photo_url} name={child.name} size={60} rounded="lg" priority />
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                        Enter {child.name.split(' ')[0]} in a tournament
                    </h1>
                    <p className="text-[15px] text-muted-foreground">
                        {[child.rank ? `${child.rank.charAt(0).toUpperCase()}${child.rank.slice(1)} belt` : null, child.weight ? `${child.weight} kg` : null, child.dojo_name].filter(Boolean).join(' · ')}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                <RegistrationForm child={child} tournaments={tournaments} preselectedEventId={preselectedEventId} />
            </div>
        </div>
    )
}
