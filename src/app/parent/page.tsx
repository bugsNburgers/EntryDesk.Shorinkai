// ============================================================================
// EntryDesk — Parent Portal Home: Kid Picker
// src/app/parent/page.tsx
// Shows all children linked to this parent. Entry point for all parent actions.
// Design: mobile-first, one primary CTA, plain-English status, no jargon.
// ============================================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { requireRole } from '@/lib/auth/require-role'
import { redirect } from 'next/navigation'
import sql from '@/lib/db'
import { getStatusLabel, getStatusBgClass } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Plus, UserRound } from 'lucide-react'
import { JoinDojoHandler } from '@/components/parent/join-dojo-handler'
import { ChildCardItem } from '@/components/parent/child-card-item'

export const metadata: Metadata = {
    title: 'My Profile(s) — EntryDesk',
}

interface ParentHomeProps {
    searchParams: Promise<{ joinedDojo?: string }>
}

export default async function ParentHome({ searchParams }: ParentHomeProps) {
    const { user } = await requireRole('parent', { redirectTo: '/login' })
    const { joinedDojo } = await searchParams
    const cookieStore = await cookies()
    const activeDojoSlug = joinedDojo || cookieStore.get('parent_dojo_slug')?.value || ''
    const addAthleteHref = activeDojoSlug ? `/athlete/new?dojo=${encodeURIComponent(activeDojoSlug)}` : '/athlete/new'

    // Fetch all registered athletes for this user with their latest entry status per event
    const children = await sql<{
        id: string
        name: string
        gender: string
        date_of_birth: string | null
        rank: string | null
        photo_url: string | null
        dojo_name: string | null
        dojo_id: string | null
        entry_count: number
        pending_count: number
        approved_count: number
    }[]>`
        SELECT
            s.id,
            s.name,
            s.gender,
            s.date_of_birth,
            s.rank,
            s.photo_url,
            d.name AS dojo_name,
            d.id AS dojo_id,
            COUNT(DISTINCT e.id)::int AS entry_count,
            COUNT(DISTINCT CASE WHEN e.status IN ('pending_coach','submitted','correction_needed') THEN e.id END)::int AS pending_count,
            COUNT(DISTINCT CASE WHEN e.status = 'approved' THEN e.id END)::int AS approved_count
        FROM students s
        LEFT JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN entries e ON e.student_id = s.id
        WHERE s.parent_id = ${user.id}
          AND s.membership_status = 'active'
        GROUP BY s.id, s.name, s.gender, s.date_of_birth, s.rank, s.photo_url, d.name, d.id
        ORDER BY s.created_at ASC
    `

    // Fetch latest entry status per child (for status pill on athlete card)
    const latestEntries = children.length > 0
        ? await sql<{ student_id: string; status: string; event_title: string }[]>`
            SELECT DISTINCT ON (e.student_id)
                e.student_id,
                e.status,
                ev.title AS event_title
            FROM entries e
            JOIN events ev ON e.event_id = ev.id
            WHERE e.student_id = ANY(${children.map((c) => c.id)})
            ORDER BY e.student_id, e.created_at DESC
        `
        : []

    const latestEntryByChild: Record<string, { status: string; event_title: string }> = {}
    for (const entry of latestEntries) {
        latestEntryByChild[entry.student_id] = entry
    }

    return (
        <div className="space-y-5">
            {/* Dojo join handler — client component that processes ?joinedDojo= param */}
            {joinedDojo && <JoinDojoHandler dojoSlug={joinedDojo} />}

            {/* Header */}
            <div className="flex items-center justify-between pt-1">
                <div>
                    <h1 className="text-xl font-bold">My Profile(s)</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {children.length === 0
                            ? 'Add yourself or your child to get started'
                            : `${children.length} ${children.length === 1 ? 'profile' : 'profiles'} registered`}
                    </p>
                </div>
                <Link href={addAthleteHref}>
                    <Button size="sm" className="gap-1.5 h-9">
                        <Plus className="h-3.5 w-3.5" />
                        Add profile
                    </Button>
                </Link>
            </div>

            {/* Empty state */}
            {children.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <UserRound className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h2 className="text-base font-semibold mb-1">No profiles added yet</h2>
                    <p className="text-sm text-muted-foreground mb-5 px-6">
                        Add your or your child&apos;s details to register for tournaments.
                    </p>
                    <Link href={addAthleteHref}>
                        <Button className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Add profile
                        </Button>
                    </Link>
                </div>
            )}

            {/* Child cards */}
            {children.length > 0 && (
                <div className="space-y-3">
                    {children.map((child) => {
                        const latest = latestEntryByChild[child.id]
                        const statusLabel = latest ? getStatusLabel(latest.status, 'parent') : null
                        const statusBg = latest ? getStatusBgClass(latest.status) : null

                        return (
                            <ChildCardItem
                                key={child.id}
                                child={child}
                                latestStatus={
                                    latest && statusLabel && statusBg
                                        ? {
                                              label: statusLabel,
                                              bgClass: statusBg,
                                              eventTitle: latest.event_title,
                                          }
                                        : null
                                }
                            />
                        )
                    })}
                </div>
            )}

            {/* Bottom hint */}
            {children.length > 0 && (
                <p className="text-center text-xs text-muted-foreground pb-4">
                    Tap any athlete to see registrations and download ID cards.
                </p>
            )}
        </div>
    )
}
