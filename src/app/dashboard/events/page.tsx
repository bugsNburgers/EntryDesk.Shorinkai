import { requireRole } from '@/lib/auth/require-role'
import { CreateEventDialog } from '@/components/events/create-event-dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, ArrowRight, Globe, Lock, History } from 'lucide-react'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { EmptyState } from '@/components/ui/empty-state'
import sql from '@/lib/db'
import type { Event } from '@/types/database'

function toIsoDate(d: string | Date | null | undefined): string {
    if (!d) return ''
    if (d instanceof Date) {
        return d.toISOString().slice(0, 10)
    }
    return String(d).slice(0, 10)
}

import { CoachEventsBrowser } from '@/components/events/coach-events-browser'

export default async function EventsPage({
    searchParams,
}: {
    searchParams?: Promise<{ page?: string }>
}) {
    const { user, role } = await requireRole(['coach', 'organizer', 'admin'], { redirectTo: '/dashboard' })
    const sp = await searchParams

    if (role === 'coach') {
        return <CoachEventsBrowser user={user} searchParams={sp} />
    }

    const page = Math.max(1, Number(sp?.page) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    const [events, countResult] = await Promise.all([
        sql<Event[]>`
            SELECT 
                id,
                organizer_id,
                title,
                description,
                event_type,
                location,
                is_public,
                is_registration_open,
                start_date::text AS start_date,
                end_date::text AS end_date,
                created_at
            FROM events
            WHERE organizer_id = ${user.id}
            ORDER BY start_date DESC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count
            FROM events
            WHERE organizer_id = ${user.id}
        `,
    ])

    const count = countResult[0]?.count ?? 0
    const today = new Date().toISOString().slice(0, 10)

    const activeEvents = (events ?? []).filter((event) => toIsoDate(event.end_date) >= today)
    const pastEvents = (events ?? []).filter((event) => toIsoDate(event.end_date) < today)
    const totalPages = Math.ceil(count / limit)

    return (
        <div className="space-y-6">
            <DashboardPageHeader
                title="Events"
                description="Create, publish, and manage your events."
                actions={<CreateEventDialog />}
            />

            {/* ─── Active Events ─── */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Events
                    </h2>
                    {activeEvents.length > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            {activeEvents.length}
                        </span>
                    )}
                </div>

                <div className="dashboard-surface p-2 sm:p-3">
                    {activeEvents.length > 0 ? (
                        <div className="space-y-2">
                            {activeEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/dashboard/events/${event.id}`}
                                    className="group flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-background to-emerald-50/30 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-emerald-950/50 dark:from-background dark:to-emerald-950/10 dark:hover:border-emerald-900"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Colored icon for active */}
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold truncate">{event.title}</span>
                                                <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">
                                                    {event.event_type}
                                                </Badge>
                                                {/* Public/Private */}
                                                {event.is_public ? (
                                                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-500">
                                                        <Globe className="h-2.5 w-2.5" /> Public
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                                        <Lock className="h-2.5 w-2.5" /> Private
                                                    </span>
                                                )}
                                                {/* Registration status */}
                                                {event.is_registration_open ? (
                                                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                                                        Registration Open
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                        Registration Closed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>
                                                    {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                </span>
                                                {event.location && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-0.5 truncate">
                                                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                                                            {event.location}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 shrink-0 rounded-full px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        Manage
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Calendar />}
                            title="No active events"
                            description="Create your first event to get started. Coaches will be able to find and apply to join."
                            actions={<CreateEventDialog />}
                        />
                    )}
                </div>
            </section>

            {/* ─── Past Events ─── */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Past Events
                    </h2>
                    {pastEvents.length > 0 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {pastEvents.length}
                        </span>
                    )}
                </div>

                <div className="dashboard-surface p-2 sm:p-3">
                    {pastEvents.length > 0 ? (
                        <div className="space-y-2">
                            {pastEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/dashboard/events/${event.id}`}
                                    className="group flex items-center justify-between gap-4 rounded-xl border border-black/6 bg-gradient-to-b from-background/80 to-background/50 p-3.5 opacity-60 shadow-sm transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:shadow-black/30"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium truncate">{event.title}</span>
                                                <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">
                                                    {event.event_type}
                                                </Badge>
                                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                    Ended
                                                </span>
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>
                                                    {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                </span>
                                                {event.location && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-0.5 truncate">
                                                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                                                            {event.location}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 shrink-0 rounded-full px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        View
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No past events yet.
                        </div>
                    )}
                </div>
            </section>

            <PaginationControls page={page} totalPages={totalPages} totalCount={count} />
        </div>
    )
}
