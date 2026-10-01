import { requireRole } from '@/lib/auth/require-role'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, ArrowRight, CheckCircle2, MapPin, ClipboardList, History } from 'lucide-react'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PaginationControls } from '@/components/ui/pagination-controls'
import sql from '@/lib/db'

type ApprovedEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location?: string | null
    description?: string | null
}

export default async function EntriesPage({
    searchParams,
}: {
    searchParams?: Promise<{ page?: string }>
}) {
    const { user } = await requireRole('coach', { redirectTo: '/dashboard' })
    const sp = await searchParams
    const page = Math.max(1, Number(sp?.page) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    const [approvedEvents, countResult] = await Promise.all([
        sql<ApprovedEvent[]>`
            SELECT 
                ev.id,
                ev.title,
                ev.start_date,
                ev.end_date,
                ev.location,
                ev.description
            FROM event_applications a
            JOIN events ev ON a.event_id = ev.id
            WHERE a.coach_id = ${user.id}
              AND a.status = 'approved'
            ORDER BY ev.start_date ASC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count
            FROM event_applications
            WHERE coach_id = ${user.id} AND status = 'approved'
        `,
    ])

    function toIsoDate(d: string | Date | null | undefined): string {
        if (!d) return ''
        if (d instanceof Date) return d.toISOString().slice(0, 10)
        return String(d).slice(0, 10)
    }

    const totalCount = countResult[0]?.count ?? 0
    const todayIso = new Date().toISOString().slice(0, 10)
    const activeEvents = (approvedEvents ?? []).filter((event) => toIsoDate(event.end_date) >= todayIso)
    const pastEvents = (approvedEvents ?? []).filter((event) => toIsoDate(event.end_date) < todayIso)
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-6">
            <DashboardPageHeader
                title="My Entries"
                description="Select an event to manage your team's participation entries."
            />

            {approvedEvents.length > 0 ? (
                <div className="space-y-6">
                    {/* Active Events */}
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

                        <div className="dashboard-surface">
                            {activeEvents.length > 0 ? (
                                <div className="dashboard-list">
                                    {activeEvents.map((event) => (
                                        <Link
                                            key={event.id}
                                            href={`/dashboard/entries/${event.id}`}
                                            className="dashboard-list-item group flex items-center justify-between gap-4 p-4"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 relative">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold truncate">{event.title}</span>
                                                        <span className="status-badge-approved">Approved</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        <span className="flex items-center gap-0.5">
                                                            <Calendar className="h-2.5 w-2.5" />
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
                                            <Button size="sm" className="h-8 text-xs shrink-0 gap-1">
                                                Manage Entries
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 px-4 text-sm text-muted-foreground text-center">
                                    No active approved events.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Past Events */}
                    {pastEvents.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <History className="h-3.5 w-3.5 text-muted-foreground" />
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Past Events
                                </h2>
                            </div>
                            <div className="dashboard-surface">
                                <div className="dashboard-list">
                                    {pastEvents.map((event) => (
                                        <Link
                                            key={event.id}
                                            href={`/dashboard/entries/${event.id}`}
                                            className="dashboard-list-item group flex items-center justify-between gap-4 p-4 opacity-65 hover:opacity-90 transition-opacity"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium truncate">{event.title}</span>
                                                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                            Ended
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                View Entries
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            ) : (
                <div className="dashboard-surface">
                    <EmptyState
                        icon={<ClipboardList />}
                        title="No approved events yet"
                        description="Browse open events and apply to participate. Once an organizer approves your request, you can submit your team's entries here."
                        actions={
                            <Link href="/dashboard/events-browser">
                                <Button size="sm" className="h-9">Browse Events</Button>
                            </Link>
                        }
                    />
                </div>
            )}

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
