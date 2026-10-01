// ============================================================================
// EntryDesk — Coach Review Queue for Parent Entries
// src/app/dashboard/parent-entries/page.tsx
// Coaches review, verify, forward to organiser, or decline parent submissions.
// ============================================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import {
    Inbox,
    Clock,
    CheckCircle2,
} from 'lucide-react'
import { ParentEntriesTable, type ParentEntryRow } from '@/components/coach/parent-entries-table'
import { ParentEntriesFilters } from '@/components/coach/parent-entries-filters'

export const metadata: Metadata = {
    title: 'Parent & Athlete Entries Review — EntryDesk',
}

interface ParentEntriesPageProps {
    searchParams: Promise<{
        q?: string
        status?: string
        event_id?: string
    }>
}

export default async function CoachParentEntriesPage({ searchParams }: ParentEntriesPageProps) {
    const { user } = await requireRole('coach', { redirectTo: '/login' })
    const { q, status, event_id: eventId } = await searchParams

    // Fetch entries submitted by parents for dojos coached by current user
    const rawEntries = await sql<{
        id: string
        event_id: string
        event_title: string
        student_id: string
        student_name: string
        student_rank: string | null
        student_weight: number | null
        student_photo: string | null
        student_gender: string
        category_name: string | null
        participation_type: string | null
        declared_weight_kg: number | null
        status: string
        coach_notes: string | null
        rejection_reason: string | null
        created_at: string
        parent_name: string | null
        parent_email: string | null
        parent_phone: string | null
    }[]>`
        SELECT
            e.id,
            e.event_id,
            ev.title AS event_title,
            e.student_id,
            s.name AS student_name,
            s.rank AS student_rank,
            s.weight AS student_weight,
            s.photo_url AS student_photo,
            s.gender AS student_gender,
            c.name AS category_name,
            e.participation_type,
            e.declared_weight_kg,
            e.status,
            e.coach_notes,
            e.rejection_reason,
            e.created_at,
            pu.full_name AS parent_name,
            pu.email AS parent_email,
            s.phone AS parent_phone
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        JOIN events ev ON e.event_id = ev.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users pu ON s.parent_id = pu.id
        WHERE (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
          AND (e.submitted_by IS NOT NULL OR s.parent_id IS NOT NULL)
          ${q ? sql`AND (s.name ILIKE ${'%' + q + '%'} OR pu.full_name ILIKE ${'%' + q + '%'})` : sql``}
          ${status && status !== 'all' ? sql`AND e.status = ${status}` : sql``}
          ${eventId && eventId !== 'all' ? sql`AND e.event_id = ${eventId}` : sql``}
        ORDER BY 
            CASE 
                WHEN e.status = 'pending_coach' THEN 1
                WHEN e.status = 'correction_needed' THEN 2
                WHEN e.status = 'submitted' THEN 3
                ELSE 4
            END ASC,
            e.created_at DESC
    `

    // Counts for stats header
    const stats = await sql<{
        pending_count: number
        submitted_count: number
        approved_count: number
    }[]>`
        SELECT
            COUNT(*) FILTER (WHERE e.status = 'pending_coach')::int AS pending_count,
            COUNT(*) FILTER (WHERE e.status = 'submitted')::int AS submitted_count,
            COUNT(*) FILTER (WHERE e.status = 'approved')::int AS approved_count
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        WHERE (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
          AND (e.submitted_by IS NOT NULL OR s.parent_id IS NOT NULL)
    `
    const { pending_count = 0, submitted_count = 0, approved_count = 0 } = stats[0] || {}

    // Events filter list
    const coachEvents = await sql<{ id: string; title: string }[]>`
        SELECT DISTINCT ev.id, ev.title
        FROM events ev
        JOIN entries e ON e.event_id = ev.id
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        WHERE (e.coach_id = ${user.id} OR d.coach_id = ${user.id})
          AND (e.submitted_by IS NOT NULL OR s.parent_id IS NOT NULL)
        ORDER BY ev.title ASC
    `

    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Parent & Athlete Entries Queue</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Review registrations submitted by parents or self-registering athletes before forwarding them to tournament organisers.
                    </p>
                </div>
            </div>

            {/* Quick Stat Metric Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground font-medium">Waiting for Review</span>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {pending_count}
                        </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                        <Clock className="h-5 w-5" />
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground font-medium">Sent to Organiser</span>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {submitted_count}
                        </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                        <Inbox className="h-5 w-5" />
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground font-medium">Accepted by Organiser</span>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {approved_count}
                        </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* Filter Bar with Enhanced Selects */}
            <ParentEntriesFilters events={coachEvents} pendingCount={pending_count} />

            {/* Review Table Component */}
            <ParentEntriesTable entries={rawEntries} />
        </div>
    )
}
