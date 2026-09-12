import { requireRole } from '@/lib/auth/require-role'
import { CreateEventDialog } from '@/components/events/create-event-dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, ArrowRight, Globe, Lock } from 'lucide-react'
import { PaginationControls } from '@/components/ui/pagination-controls'
import sql from '@/lib/db'
import type { Event } from '@/types/database'

function toIsoDate(d: string | Date | null | undefined): string {
    if (!d) return ''
    if (d instanceof Date) {
        return d.toISOString().slice(0, 10)
    }
    return String(d).slice(0, 10)
}

export default async function EventsPage({
    searchParams,
}: {
    searchParams?: Promise<{ page?: string }>
}) {
    const { user } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })
    const sp = await searchParams
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
        <div className="space-y-5">
            <DashboardPageHeader
                title="Events"
                description="Create, publish, and manage your events."
                actions={<CreateEventDialog />}
            />

            <div className="dashboard-surface p-2 sm:p-3">
                {activeEvents.length > 0 ? (
                    <div className="dashboard-list space-y-2">
                        {activeEvents.map((event) => (
                            <Link
                                key={event.id}
                                href={`/dashboard/events/${event.id}`}
                                className="dashboard-list-item group flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-gradient-to-b from-background/90 to-background/50 p-3.5 shadow-md shadow-black/5 transition-all hover:-translate-y-0.5 hover:bg-background/70 hover:shadow-lg hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate">{event.title}</span>
                                            <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">{event.event_type}</Badge>
                                            {event.is_public ? (
                                                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-500">
                                                    <Globe className="h-2.5 w-2.5" /> Public
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                                    <Lock className="h-2.5 w-2.5" /> Private
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <span>{new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}</span>
                                            {event.location && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-0.5">
                                                        <MapPin className="h-2.5 w-2.5" />
                                                        {event.location}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                                        Manage
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <Calendar className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium">No active events</p>
                        <p className="mt-1 text-xs text-muted-foreground">Create a new event to get started.</p>
                    </div>
                )}
            </div>

            <div className="pt-2">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past Events</h3>
                <div className="dashboard-surface p-2 sm:p-3">
                    {pastEvents.length > 0 ? (
                        <div className="dashboard-list space-y-2">
                            {pastEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/dashboard/events/${event.id}`}
                                    className="dashboard-list-item group flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-gradient-to-b from-background/90 to-background/50 p-3.5 shadow-md shadow-black/5 transition-all hover:-translate-y-0.5 hover:bg-background/70 hover:shadow-lg hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium truncate">{event.title}</span>
                                                <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">{event.event_type}</Badge>
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                                <span>{new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}</span>
                                                {event.location && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-0.5">
                                                            <MapPin className="h-2.5 w-2.5" />
                                                            {event.location}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                                            Manage
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            No past events.
                        </div>
                    )}
                </div>
            </div>

            <PaginationControls page={page} totalPages={totalPages} totalCount={count} />
        </div>
    )
}
