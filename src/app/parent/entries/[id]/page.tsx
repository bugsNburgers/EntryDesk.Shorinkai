// ============================================================================
// EntryDesk — Parent Entry Detail Page
// src/app/parent/entries/[id]/page.tsx
// Displays detailed tournament entry status, timeline, actions, and credentials.
// ============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { Button } from '@/components/ui/button'
import {
    ChevronLeft,
    Calendar,
    MapPin,
    Trophy,
    Award,
    Scale,
    Building2,
    Clock,
    QrCode,
    FileText,
} from 'lucide-react'
import { getStatusLabel, getStatusBgClass, getStatusDescription } from '@/lib/status'
import { StatusTimeline } from '@/components/parent/status-timeline'
import { EntryActionsClient } from '@/components/parent/entry-actions-client'
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
        category_name: string | null
        coach_notes: string | null
        rejection_reason: string | null
        chest_no: number | null
        qr_token: string | null
        created_at: string
        updated_at: string | null
        student_name: string
        student_gender: string
        student_dob: string | null
        student_rank: string | null
        student_photo: string | null
        dojo_name: string
        dojo_city: string | null
        coach_name: string | null
        event_title: string
        event_description: string | null
        start_date: string
        end_date: string
        event_location: string | null
    }[]>`
        SELECT
            e.id,
            e.event_id,
            e.student_id,
            e.status,
            e.participation_type,
            e.declared_weight_kg,
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
            ev.location AS event_location
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN users u ON d.coach_id = u.id
        JOIN events ev ON e.event_id = ev.id
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = ${id}
          AND s.parent_id = ${user.id}
        LIMIT 1
    `

    if (!rows.length) {
        notFound()
    }

    const entry = rows[0]

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-16">
            {/* Back Navigation */}
            <div>
                <Link
                    href={`/athlete/${entry.student_id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to {entry.student_name}’s profile
                </Link>
            </div>

            {/* Top Overview Banner */}
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Trophy className="h-4 w-4" />
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Tournament Entry
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {entry.event_title}
                        </h1>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {entry.student_name} • {entry.dojo_name}
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBgClass(entry.status)}`}>
                            {getStatusLabel(entry.status)}
                        </span>
                        {entry.chest_no && (
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                Chest no #{entry.chest_no}
                            </span>
                        )}
                    </div>
                </div>

                {/* Event date & location info */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(entry.start_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                        })}
                        {entry.start_date !== entry.end_date &&
                            ` – ${new Date(entry.end_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}`}
                    </span>

                    {entry.event_location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-primary" />
                            {entry.event_location}
                        </span>
                    )}

                    {entry.coach_name && (
                        <span>
                            Coach: <strong className="text-foreground">{entry.coach_name}</strong>
                        </span>
                    )}
                </div>
            </div>

            {/* Status Timeline */}
            <StatusTimeline
                status={entry.status}
                createdAt={entry.created_at}
                updatedAt={entry.updated_at}
                coachNotes={entry.coach_notes}
                rejectionReason={entry.rejection_reason}
            />

            {/* Entry Specification Details */}
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-base">Registration Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-muted/40 p-3">
                        <span className="text-xs text-muted-foreground block mb-1">Athlete</span>
                        <p className="text-sm font-semibold truncate">{entry.student_name}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                        <span className="text-xs text-muted-foreground block mb-1">Category</span>
                        <p className="text-sm font-semibold truncate">{entry.category_name || 'Open'}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                        <span className="text-xs text-muted-foreground block mb-1">Events</span>
                        <p className="text-sm font-semibold capitalize">{entry.participation_type || 'Both'}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                        <span className="text-xs text-muted-foreground block mb-1">Weight</span>
                        <p className="text-sm font-semibold">
                            {entry.declared_weight_kg ? `${entry.declared_weight_kg} kg` : '—'}
                        </p>
                    </div>
                </div>

                {/* ID card download section if approved */}
                {entry.status === 'approved' && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                                <QrCode className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                    Official Tournament ID Card Ready
                                </h4>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                    Present this credential at the tournament check-in desk.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <IdCardDownload entryId={entry.id} size="sm" label="Download PDF" />
                            {entry.qr_token && (
                                <Link href={`/v/${entry.qr_token}`} target="_blank">
                                    <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl text-xs gap-1.5 font-semibold">
                                        View Digital Pass
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Interactive action buttons (Withdraw, Edit) */}
                <EntryActionsClient
                    entryId={entry.id}
                    studentId={entry.student_id}
                    eventId={entry.event_id}
                    status={entry.status}
                    studentName={entry.student_name}
                    eventTitle={entry.event_title}
                />
            </div>
        </div>
    )
}
