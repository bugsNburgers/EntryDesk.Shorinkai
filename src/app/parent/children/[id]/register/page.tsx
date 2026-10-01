// ============================================================================
// EntryDesk — Parent Tournament Registration Page
// src/app/parent/children/[id]/register/page.tsx
// Parents register a child for an open tournament approved for their dojo.
// ============================================================================

import type { Metadata } from 'next'
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
        date_of_birth: string | null
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

    const child = studentRows[0]

    // Fetch open tournaments where this dojo's coach is approved
    const today = new Date().toISOString().slice(0, 10)
    const eventRows = await sql<{
        id: string
        title: string
        description: string | null
        start_date: string
        end_date: string
        location: string | null
        registration_close_date: string | null
        photo_required: boolean
        coach_checks_each_entry: boolean
    }[]>`
        SELECT
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
        JOIN event_applications ea ON ea.event_id = ev.id
        JOIN dojos d ON ea.coach_id = d.coach_id
        WHERE d.id = ${child.dojo_id}
          AND ea.status = 'approved'
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

    const tournaments = eventRows.map((e) => {
        const existing = entryMap.get(e.id)
        return {
            ...e,
            existing_entry_id: existing?.id ?? null,
            existing_entry_status: existing?.status ?? null,
        }
    })

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-16">
            {/* Top Navigation */}
            <div>
                <Link
                    href={`/athlete/${child.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to {child.name}’s profile
                </Link>
            </div>

            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Trophy className="h-4 w-4" />
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight">Register for Tournament</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    Register <span className="font-semibold text-foreground">{child.name}</span> ({child.dojo_name}) for upcoming championship events.
                </p>
            </div>

            {/* Form */}
            <RegistrationForm
                child={child}
                tournaments={tournaments}
                preselectedEventId={preselectedEventId}
            />
        </div>
    )
}
