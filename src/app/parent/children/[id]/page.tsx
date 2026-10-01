// ============================================================================
// EntryDesk — Child Detail Page (Parent Portal)
// src/app/parent/children/[id]/page.tsx
// Displays child profile, active tournament entries, entry status, and actions.
// ============================================================================

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import {
    ChevronLeft,
    Calendar,
    Award,
    Scale,
    Building2,
    Trophy,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
} from 'lucide-react'
import { getStatusLabel, getStatusBgClass, getStatusDescription } from '@/lib/status'
import { normalizeDobToIso } from '@/lib/date'
import { IdCardDownload } from '@/components/id-card/id-card-download'
import { ChildPhotoAvatar } from '@/components/parent/child-photo-avatar'

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

    // Fetch entries for this child
    const entries = await sql<{
        id: string
        event_id: string
        event_title: string
        start_date: string
        end_date: string
        location: string | null
        status: string
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
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
            e.coach_notes,
            e.rejection_reason,
            e.created_at,
            e.qr_token
        FROM entries e
        JOIN events ev ON e.event_id = ev.id
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.student_id = ${child.id}
        ORDER BY ev.start_date DESC
    `

    const formattedDob = child.date_of_birth
        ? normalizeDobToIso(child.date_of_birth) || child.date_of_birth
        : null

    return (
        <div className="space-y-5 pb-12">
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between">
                <Link
                    href="/athlete"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to all profiles
                </Link>
                <span className="text-xs text-muted-foreground font-mono">
                    ID: {child.id.slice(0, 8)}
                </span>
            </div>

            {/* Child Profile Card */}
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Interactive Avatar with Photo Upload */}
                    <ChildPhotoAvatar
                        childId={child.id}
                        childName={child.name}
                        initialPhotoUrl={child.photo_url}
                    />

                    {/* Basic details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                                {child.name}
                            </h1>
                            <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border">
                                {child.gender}
                            </span>
                        </div>

                        <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 shrink-0" />
                            {child.dojo_name}
                            {child.city && <span className="text-muted-foreground">• {child.city}</span>}
                        </p>

                        {child.coach_name && (
                            <p className="text-xs text-muted-foreground">
                                Coach: <span className="text-foreground font-medium">{child.coach_name}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/60">
                    <div className="rounded-xl bg-muted/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Award className="h-3.5 w-3.5 text-primary" />
                            <span>Rank / Belt</span>
                        </div>
                        <p className="text-sm font-semibold capitalize">
                            {child.rank || 'Not specified'}
                        </p>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Scale className="h-3.5 w-3.5 text-primary" />
                            <span>Weight</span>
                        </div>
                        <p className="text-sm font-semibold">
                            {child.weight ? `${child.weight} kg` : 'Not specified'}
                        </p>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>Date of Birth</span>
                        </div>
                        <p className="text-sm font-semibold">
                            {formattedDob || 'Not specified'}
                        </p>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span>City / School</span>
                        </div>
                        <p className="text-sm font-semibold truncate">
                            {child.school_or_city || '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tournaments & Entries Section */}
            <div className="space-y-4 pt-2">
                <div>
                    <h2 className="text-lg font-bold">Tournament Entries</h2>
                    <p className="text-xs text-muted-foreground">
                        Active registrations and verification statuses
                    </p>
                </div>

                {entries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center bg-card/50">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Trophy className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold mb-1">No tournament entries yet</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Tournament entries and ID cards will appear here once registered.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry) => {
                            const label = getStatusLabel(entry.status)
                            const bgClass = getStatusBgClass(entry.status)
                            const description = getStatusDescription(entry.status)

                            return (
                                <div
                                    key={entry.id}
                                    className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/athlete/entries/${entry.id}`}
                                                    prefetch={true}
                                                    className="font-semibold text-base hover:text-primary transition-colors"
                                                >
                                                    {entry.event_title}
                                                </Link>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bgClass}`}>
                                                    {label}
                                                </span>
                                            </div>
                                            {entry.category_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    Category: <span className="font-medium text-foreground">{entry.category_name}</span>
                                                </p>
                                            )}
                                            {entry.location && (
                                                <p className="text-xs text-muted-foreground">
                                                    Venue: {entry.location}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {entry.status === 'approved' && (
                                                <IdCardDownload entryId={entry.id} size="sm" variant="outline" label="Download ID Card" />
                                            )}
                                            <Link
                                                href={`/athlete/entries/${entry.id}`}
                                                prefetch={true}
                                                className="text-xs text-primary font-medium hover:underline inline-flex items-center"
                                            >
                                                View Timeline →
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Status explanation notice */}
                                    <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                                        <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-foreground">{description}</p>
                                            {entry.coach_notes && (
                                                <p className="mt-1 text-amber-700 dark:text-amber-400">
                                                    Coach note: {entry.coach_notes}
                                                </p>
                                            )}
                                            {entry.rejection_reason && (
                                                <p className="mt-1 text-rose-700 dark:text-rose-400">
                                                    Reason: {entry.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
