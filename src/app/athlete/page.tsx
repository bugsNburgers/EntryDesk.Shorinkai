// ============================================================================
// EntryDesk — Parent home: "My children"
// src/app/athlete/page.tsx
// One card per child: photo, name, belt, age → each tournament entry with ONE status word and
// ONE big button for the next step (Download ID card / Fix and send again / Enter a tournament).
// Layout: "EntryDesk UX Fixes" design canvas (09/11/2026).
// ============================================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ChevronRight, Download, Pencil, Plus, Trophy } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { calculateAge, formatDateRangeStable } from '@/lib/date'
import { JoinDojoHandler } from '@/components/parent/join-dojo-handler'
import { SafeAvatar } from '@/components/ui/safe-avatar'
import { StatusBadge } from '@/components/ui/status-badge'

export const metadata: Metadata = {
    title: 'My children — EntryDesk',
}

type Child = {
    id: string
    name: string
    rank: string | null
    date_of_birth: string | null
    photo_url: string | null
    dojo_name: string | null
    coach_name: string | null
}

type ChildEntry = {
    id: string
    student_id: string
    status: string
    chest_no: number | null
    coach_notes: string | null
    rejection_reason: string | null
    event_title: string
    start_date: string
    end_date: string
    location: string | null
}

function beltText(rank: string | null) {
    if (!rank) return null
    const r = rank.replace(/\bbelts?\b/gi, '').trim()
    return r ? `${r.charAt(0).toUpperCase()}${r.slice(1)} belt` : null
}

export default async function ParentHome({ searchParams }: { searchParams: Promise<{ joinedDojo?: string }> }) {
    const { user } = await requireRole('parent', { redirectTo: '/login' })
    const { joinedDojo } = await searchParams
    const cookieStore = await cookies()
    const activeDojoSlug = joinedDojo || cookieStore.get('parent_dojo_slug')?.value || ''
    const addAthleteHref = activeDojoSlug ? `/athlete/new?dojo=${encodeURIComponent(activeDojoSlug)}` : '/athlete/new'

    const children = await sql<Child[]>`
        SELECT s.id, s.name, s.rank, s.date_of_birth::text, s.photo_url, d.name AS dojo_name, cu.full_name AS coach_name
        FROM students s
        LEFT JOIN dojos d ON s.dojo_id = d.id
        LEFT JOIN users cu ON cu.id = d.coach_id
        WHERE s.parent_id = ${user.id} AND s.membership_status = 'active'
        ORDER BY s.created_at ASC
    `

    // Entries for upcoming events (plus anything accepted recently), newest event first per child.
    const entries = children.length
        ? await sql<ChildEntry[]>`
            SELECT e.id, e.student_id, e.status, e.chest_no, e.coach_notes, e.rejection_reason,
                   ev.title AS event_title, ev.start_date::text, ev.end_date::text, ev.location
            FROM entries e
            JOIN events ev ON e.event_id = ev.id
            WHERE e.student_id = ANY(${children.map((c) => c.id)})
              AND e.status <> 'draft'
              AND ev.end_date >= (CURRENT_DATE - INTERVAL '7 days')
            ORDER BY ev.start_date ASC
        `
        : []

    const entriesByChild = new Map<string, ChildEntry[]>()
    for (const e of entries) {
        const list = entriesByChild.get(e.student_id) ?? []
        list.push(e)
        entriesByChild.set(e.student_id, list)
    }

    const coachLine = children.find((c) => c.dojo_name)
    const firstName = (n: string) => n.split(' ')[0]

    return (
        <div className="space-y-4">
            {joinedDojo && <JoinDojoHandler dojoSlug={joinedDojo} />}

            <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">My children</h1>
                {coachLine && (
                    <p className="mt-0.5 text-[15px] text-muted-foreground">
                        {coachLine.coach_name ? `Coach: ${coachLine.coach_name} · ` : ''}
                        {coachLine.dojo_name}
                    </p>
                )}
            </div>

            {children.length === 0 ? (
                <section className="mx-auto max-w-md rounded-2xl border border-border bg-card px-5 py-10 text-center">
                    <h2 className="text-xl font-bold">Add your child</h2>
                    <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">
                        Add your child&apos;s name, photo, belt and weight. Then you can enter them in tournaments.
                    </p>
                    <Link
                        href={addAthleteHref}
                        className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                        Add a child
                    </Link>
                </section>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {children.map((child) => {
                        const list = entriesByChild.get(child.id) ?? []
                        const age = calculateAge(child.date_of_birth)
                        return (
                            <article key={child.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                                <Link href={`/athlete/${child.id}`} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50">
                                    <SafeAvatar src={child.photo_url} name={child.name} size={60} rounded="lg" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-lg font-bold leading-tight">{child.name}</span>
                                        <span className="block text-[15px] text-muted-foreground">
                                            {[beltText(child.rank), age].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" aria-label="Open profile" />
                                </Link>

                                {list.length === 0 ? (
                                    <div className="border-t border-border px-4 py-3.5">
                                        <Link
                                            href={`/athlete/${child.id}/register`}
                                            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                                        >
                                            <Trophy className="h-5 w-5" aria-hidden="true" />
                                            Enter a tournament
                                        </Link>
                                    </div>
                                ) : (
                                    list.map((e) => (
                                        <div key={e.id} className="flex flex-col gap-2.5 border-t border-border px-4 py-3.5">
                                            <div>
                                                <p className="font-bold leading-snug">{e.event_title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDateRangeStable(e.start_date, e.end_date)}
                                                    {e.location ? ` · ${e.location}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <StatusBadge status={e.status} />
                                                {e.status === 'approved' && e.chest_no ? (
                                                    <span className="text-[15px] font-semibold">Chest number {e.chest_no}</span>
                                                ) : null}
                                            </div>
                                            {e.status === 'correction_needed' && e.coach_notes && (
                                                <p className="rounded-lg bg-background px-3 py-2 text-[15px]">
                                                    <b>Coach says:</b> “{e.coach_notes}”
                                                </p>
                                            )}
                                            {(e.status === 'rejected' || e.status === 'coach_declined') && e.rejection_reason && (
                                                <p className="rounded-lg bg-background px-3 py-2 text-[15px]">
                                                    <b>Reason:</b> “{e.rejection_reason}”
                                                </p>
                                            )}
                                            {e.status === 'approved' ? (
                                                <Link
                                                    href={`/athlete/entries/${e.id}/id-card`}
                                                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Download className="h-5 w-5" aria-hidden="true" />
                                                    Download ID card
                                                </Link>
                                            ) : e.status === 'correction_needed' ? (
                                                <Link
                                                    href={`/athlete/entries/${e.id}`}
                                                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Pencil className="h-5 w-5" aria-hidden="true" />
                                                    Fix and send again
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/athlete/entries/${e.id}`}
                                                    className="inline-flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-border bg-card px-4 text-base font-semibold hover:bg-muted"
                                                >
                                                    See {firstName(child.name)}&apos;s entry
                                                </Link>
                                            )}
                                        </div>
                                    ))
                                )}
                            </article>
                        )
                    })}
                </div>
            )}

            {children.length > 0 && (
                <Link
                    href={addAthleteHref}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-border bg-card text-base font-semibold hover:bg-muted"
                >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    Add another child
                </Link>
            )}
        </div>
    )
}
