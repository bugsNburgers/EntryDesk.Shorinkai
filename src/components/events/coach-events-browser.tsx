import { ApplyButton } from '@/components/events/apply-button'
import Link from 'next/link'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, ArrowRight, FolderOpen, CheckCircle2, Clock, XCircle } from 'lucide-react'
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

interface CoachEventsBrowserProps {
    user: { id: string }
    searchParams?: { page?: string }
}

export async function CoachEventsBrowser({ user, searchParams }: CoachEventsBrowserProps) {
    const page = Math.max(1, Number(searchParams?.page) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    const [events, countResult, applications] = await Promise.all([
        sql<Event[]>`
            SELECT * FROM events
            WHERE is_public = true
            ORDER BY start_date ASC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count
            FROM events
            WHERE is_public = true
        `,
        sql<{ event_id: string; status: string }[]>`
            SELECT event_id, status
            FROM event_applications
            WHERE coach_id = ${user.id}
        `,
    ])

    const count = countResult[0]?.count ?? 0
    const appMap = new Map<string, string>()
    applications?.forEach((app) => {
        appMap.set(app.event_id, app.status)
    })

    const today = new Date().toISOString().slice(0, 10)
    const upcomingEvents = (events ?? []).filter((event) => toIsoDate(event.end_date) >= today)
    const pastEvents = (events ?? []).filter((event) => toIsoDate(event.end_date) < today)

    // Approved section: only events where coach has approved application
    const approvedUpcomingEvents = upcomingEvents.filter((event) => appMap.get(event.id) === 'approved')

    // Active events section: only upcoming events that coach has NOT yet been approved for
    const activeUpcomingEvents = upcomingEvents.filter((event) => appMap.get(event.id) !== 'approved')

    const totalPages = Math.ceil(count / limit)

    const getStatusIcon = (status: string | undefined) => {
        if (status === 'approved') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        if (status === 'pending') return <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        if (status === 'rejected') return <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
        return null
    }

    const getStatusText = (status: string | undefined) => {
        if (status === 'approved') return 'Approved'
        if (status === 'pending') return 'Pending'
        if (status === 'rejected') return 'Rejected'
        return null
    }

    return (
        <div className="space-y-6">
            <DashboardPageHeader
                title="Events"
                description="View active, approved, and past events."
            />

            {/* ========================================================================= */}
            {/* 1. APPROVED EVENTS SECTION (Always visible)                              */}
            {/* ========================================================================= */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-sm font-semibold">Approved Events</h2>
                    {approvedUpcomingEvents.length > 0 && (
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                            {approvedUpcomingEvents.length}
                        </span>
                    )}
                </div>
                <div className="dashboard-surface">
                    {approvedUpcomingEvents.length > 0 ? (
                        <div className="dashboard-list">
                            {approvedUpcomingEvents.map((event) => {
                                return (
                                    <Link
                                        key={event.id}
                                        href={`/dashboard/events/${event.id}/entries`}
                                        className="dashboard-list-item group flex items-center justify-between gap-4 p-3.5 transition-all cursor-pointer select-none hover:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.07]"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 group-hover:scale-105 transition-transform">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                                        {event.title}
                                                    </span>
                                                    <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">
                                                        {event.event_type}
                                                    </Badge>
                                                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Approved
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                    <span>
                                                        {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                    </span>
                                                    {event.location && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <MapPin className="h-3 w-3 shrink-0" />
                                                                {event.location}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="h-8 px-3.5 rounded-xl text-xs font-semibold bg-[#0d9488] group-hover:bg-[#0f766e] text-white dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] dark:text-[#04231e] inline-flex items-center gap-1.5 shadow-2xs transition">
                                                <span>Entries</span>
                                                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <p className="text-sm font-medium">No approved events</p>
                            <p className="mt-1 text-xs text-muted-foreground">When an event application is approved, it will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. ACTIVE EVENTS SECTION (Only visible if coach has unapproved active events) */}
            {/* ========================================================================= */}
            {activeUpcomingEvents.length > 0 && (
                <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold">Active Events</h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                            {activeUpcomingEvents.length}
                        </span>
                    </div>
                    <div className="dashboard-surface">
                        <div className="dashboard-list">
                            {activeUpcomingEvents.map((event) => {
                                const status = appMap.get(event.id)
                                return (
                                    <div
                                        key={event.id}
                                        className="dashboard-list-item flex items-center justify-between gap-4 p-3.5"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc] truncate">
                                                        {event.title}
                                                    </span>
                                                    <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">
                                                        {event.event_type}
                                                    </Badge>
                                                    {status && (
                                                        <span className="flex items-center gap-0.5 text-[10px] font-medium">
                                                            {getStatusIcon(status)}
                                                            <span className={
                                                                status === 'pending'
                                                                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                                                    : status === 'rejected'
                                                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                                                    : 'text-muted-foreground'
                                                            }>
                                                                {getStatusText(status)}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                    <span>
                                                        {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                    </span>
                                                    {event.location && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <MapPin className="h-3 w-3 shrink-0" />
                                                                {event.location}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <ApplyButton eventId={event.id} status={status} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. PAST EVENTS SECTION                                                    */}
            {/* ========================================================================= */}
            {pastEvents.length > 0 && (
                <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold">Past Events</h2>
                    </div>
                    <div className="dashboard-surface">
                        <div className="dashboard-list">
                            {pastEvents
                                .slice()
                                .sort((a, b) => (a.end_date < b.end_date ? 1 : -1))
                                .map((event) => {
                                    const status = appMap.get(event.id)
                                    const isApproved = status === 'approved'

                                    if (isApproved) {
                                        return (
                                            <Link
                                                key={event.id}
                                                href={`/dashboard/events/${event.id}/entries`}
                                                className="dashboard-list-item group flex items-center justify-between gap-4 p-3.5 transition-all cursor-pointer select-none hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:scale-105 transition-transform">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                                                {event.title}
                                                            </span>
                                                            <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">
                                                                {event.event_type}
                                                            </Badge>
                                                            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Approved
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                            <span>
                                                                {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                            </span>
                                                            {event.location && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="flex items-center gap-0.5 truncate">
                                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                                        {event.location}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="h-8 px-3 rounded-xl text-xs font-semibold border border-[#ded8cb] dark:border-[#2a3b57] text-[#57534e] dark:text-[#8a99ab] group-hover:border-[#0d9488] group-hover:text-[#0d9488] dark:group-hover:border-[#2dd4b4] dark:group-hover:text-[#2dd4b4] inline-flex items-center gap-1 shadow-2xs transition">
                                                        <span>Entries</span>
                                                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    }

                                    return (
                                        <div
                                            key={event.id}
                                            className="dashboard-list-item flex items-center justify-between gap-4 p-3.5 opacity-70"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc] truncate">
                                                            {event.title}
                                                        </span>
                                                        <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">
                                                            {event.event_type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                        <span>
                                                            {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                                                        </span>
                                                        {event.location && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-0.5 truncate">
                                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                                    {event.location}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-muted-foreground font-medium">Ended</span>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                </div>
            )}

            {totalPages > 1 && (
                <div className="pt-2">
                    <PaginationControls totalPages={totalPages} page={page} />
                </div>
            )}
        </div>
    )
}
