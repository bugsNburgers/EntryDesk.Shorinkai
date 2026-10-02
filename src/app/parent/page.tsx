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
                    <h1 className="text-2xl font-bold text-[#1c1917] dark:text-[#e8eef5]">My Profile(s)</h1>
                    <p className="text-sm text-[#57534e] dark:text-[#8a99ab] mt-0.5">
                        {children.length === 0
                            ? 'Add yourself or your child to get started'
                            : `${children.length} ${children.length === 1 ? 'profile' : 'profiles'} registered`}
                    </p>
                </div>
                <Link href={addAthleteHref}>
                    <Button size="sm" className="gap-1.5 h-9 rounded-xl bg-[#0d9488] text-white hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:text-[#04231e] dark:hover:bg-[#25c4a5] font-bold shadow-xs">
                        <Plus className="h-4 w-4" />
                        Add profile
                    </Button>
                </Link>
            </div>

            {/* Empty state */}
            {children.length === 0 && (
                <div className="mx-auto max-w-md rounded-[20px] border border-dashed border-[#ded8cb] bg-white dark:border-[#1f2b40] dark:bg-[#111a2b] py-14 px-6 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f2eee5] border border-[#ded8cb] dark:bg-[#16233a] dark:border-[#1f2b40]">
                        <UserRound className="h-8 w-8 text-[#0d9488] dark:text-[#2dd4b4]" />
                    </div>
                    <h2 className="text-lg font-bold text-[#1c1917] dark:text-[#e8eef5] mb-1.5">No profiles added yet</h2>
                    <p className="text-sm text-[#57534e] dark:text-[#8a99ab] mb-6 max-w-sm mx-auto">
                        Add your or your child&apos;s details to register for tournaments and view live entry progress.
                    </p>
                    <Link href={addAthleteHref}>
                        <Button className="gap-2 rounded-xl bg-[#0d9488] text-white hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:text-[#04231e] dark:hover:bg-[#25c4a5] font-bold px-6 h-11 shadow-sm">
                            <Plus className="h-4 w-4" />
                            Add profile
                        </Button>
                    </Link>
                </div>
            )}

            {/* Child cards responsive grid */}
            {children.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 2xl:gap-6">
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
                                              status: latest.status,
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
                <p className="text-center text-xs text-[#57534e] dark:text-[#8a99ab] pt-2 pb-4">
                    Click any athlete profile to manage tournament entries and access official ID cards.
                </p>
            )}
        </div>
    )
}
