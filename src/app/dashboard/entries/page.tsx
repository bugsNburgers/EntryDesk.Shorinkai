import { requireRole } from '@/lib/auth/require-role'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, ArrowRight, CheckCircle2, MapPin, ClipboardList } from 'lucide-react'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
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
    if (d instanceof Date) {
        return d.toISOString().slice(0, 10)
    }
    return String(d).slice(0, 10)
}

    const totalCount = countResult[0]?.count ?? 0
    const todayIso = new Date().toISOString().slice(0, 10)
    const activeEvents = (approvedEvents ?? []).filter((event) => toIsoDate(event.end_date) >= todayIso)
    const pastEvents = (approvedEvents ?? []).filter((event) => toIsoDate(event.end_date) < todayIso)
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-4">
            <DashboardPageHeader
                title="Entries"
                description="Select an event to manage your team's participation."
            />

            {approvedEvents.length > 0 ? (
                <div className="space-y-4">
                    <div className="dashboard-surface">
                        <div className="border-b border-black/5 px-4 py-2.5 dark:border-white/10">
                            <h3 className="text-sm font-medium">Active Events</h3>
                        </div>
                        {activeEvents.length > 0 ? (
                            <div className="dashboard-list">
                                {activeEvents.map((event) => (
                                    <Link
                                        key={event.id}
                                        href={`/dashboard/entries/${event.id}`}
                                        className="dashboard-list-item group flex items-center justify-between gap-4 p-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium truncate">{event.title}</span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Approved</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-0.5">
                                                        <Calendar className="h-2.5 w-2.5" />
                                                        {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                    </span>
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
                                        <Button size="sm" className="h-7 text-xs">
                                            Manage Entries
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-sm text-muted-foreground">No active approved events.</div>
                        )}
                    </div>

                    {pastEvents.length > 0 && (
                        <div className="dashboard-surface">
                            <div className="border-b border-black/5 px-4 py-2.5 dark:border-white/10">
                                <h3 className="text-sm font-medium">Past Events</h3>
                            </div>
                            <div className="dashboard-list">
                                {pastEvents.map((event) => (
                                    <Link
                                        key={event.id}
                                        href={`/dashboard/entries/${event.id}`}
                                        className="dashboard-list-item group flex items-center justify-between gap-4 p-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium truncate">{event.title}</span>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-7 text-xs">
                                            View Entries
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="dashboard-surface p-8 text-center">
                    <ClipboardList className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium">No approved events yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Browse events and apply to participate. Once approved by the organizer, you can submit entries here.
                    </p>
                    <div className="mt-4">
                        <Link href="/dashboard/events-browser">
                            <Button size="sm">Browse Events</Button>
                        </Link>
                    </div>
                </div>
            )}

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
