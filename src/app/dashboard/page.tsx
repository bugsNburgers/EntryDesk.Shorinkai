import { getUserProfile } from '@/lib/auth/require-role'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, Users, ClipboardList, LayoutGrid, CheckSquare, FolderOpen, ListTodo, MapPin, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CoachActiveEventsCards } from '@/components/dashboard/coach-active-events-cards'
import { formatDateRangeStable } from '@/lib/date'
import sql from '@/lib/db'

type PublicEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location: string | null
    event_type: string | null
    description?: string | null
    is_public: boolean
}

type ApprovedEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location: string | null
    event_type: string | null
}

type OrganizerEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location: string | null
    event_type: string | null
}

export default async function DashboardPage() {
    const { user, profile, role } = await getUserProfile()

    const name = profile?.full_name || user.email
    const isOrganizer = role === 'organizer'
    const today = new Date().toISOString().slice(0, 10)

    let eventsCount = 0
    let pendingApprovalsCount = 0
    let dojosCount = 0
    let studentsCount = 0
    let entriesCount = 0
    let organizerActiveEvents: OrganizerEvent[] = []
    let publicEvents: PublicEvent[] = []
    let applications: Array<{ event_id: string; status: string }> = []
    let approvedEvents: ApprovedEvent[] = []

    if (isOrganizer) {
        const [eventsCountRes, activeEventsRes, pendingCountRes] = await Promise.all([
            sql<{ count: number }[]>`
                SELECT count(*)::int AS count FROM events WHERE organizer_id = ${user.id}
            `,
            sql<OrganizerEvent[]>`
                SELECT id, title, start_date, end_date, location, event_type
                FROM events
                WHERE organizer_id = ${user.id} AND end_date >= ${today}
                ORDER BY start_date ASC
            `,
            sql<{ count: number }[]>`
                SELECT count(*)::int AS count
                FROM event_applications a
                JOIN events ev ON a.event_id = ev.id
                WHERE ev.organizer_id = ${user.id} AND a.status = 'pending'
            `,
        ])

        eventsCount = eventsCountRes[0]?.count ?? 0
        organizerActiveEvents = activeEventsRes
        pendingApprovalsCount = pendingCountRes[0]?.count ?? 0
    } else {
        const [dojosCountRes, studentsCountRes, entriesCountRes, publicEventsRes, appsRes, approvedEventsRes] = await Promise.all([
            sql<{ count: number }[]>`
                SELECT count(*)::int AS count FROM dojos WHERE coach_id = ${user.id}
            `,
            sql<{ count: number }[]>`
                SELECT count(*)::int AS count 
                FROM students s 
                JOIN dojos d ON s.dojo_id = d.id 
                WHERE d.coach_id = ${user.id}
            `,
            sql<{ count: number }[]>`
                SELECT count(*)::int AS count 
                FROM entries e
                JOIN events ev ON e.event_id = ev.id
                WHERE e.coach_id = ${user.id} AND ev.end_date >= ${today}
            `,
            sql<PublicEvent[]>`
                SELECT id, title, start_date, end_date, location, event_type, description, is_public
                FROM events
                WHERE is_public = true
                ORDER BY start_date ASC
            `,
            sql<{ event_id: string; status: string }[]>`
                SELECT event_id, status FROM event_applications WHERE coach_id = ${user.id}
            `,
            sql<ApprovedEvent[]>`
                SELECT ev.id, ev.title, ev.start_date, ev.end_date, ev.location, ev.event_type
                FROM event_applications a
                JOIN events ev ON a.event_id = ev.id
                WHERE a.coach_id = ${user.id} AND a.status = 'approved' AND ev.end_date >= ${today}
                ORDER BY ev.start_date ASC
            `,
        ])

        dojosCount = dojosCountRes[0]?.count ?? 0
        studentsCount = studentsCountRes[0]?.count ?? 0
        entriesCount = entriesCountRes[0]?.count ?? 0
        publicEvents = publicEventsRes
        applications = appsRes
        approvedEvents = approvedEventsRes
    }

function toIsoDate(d: string | Date | null | undefined): string {
    if (!d) return ''
    if (d instanceof Date) {
        return d.toISOString().slice(0, 10)
    }
    return String(d).slice(0, 10)
}

    const activePublicEvents = (publicEvents ?? []).filter((event) => toIsoDate(event.end_date) >= today)
    const statusByEventId = Object.fromEntries(applications.map((app) => [app.event_id, app.status])) as Record<string, string>

    return (
        <div className="space-y-8">
            <DashboardPageHeader
                title={`Welcome back, ${name}`}
                description={
                    isOrganizer
                        ? 'Manage your events, approve coach requests, and view registrations.'
                        : 'Manage your students, view events, and submit entries.'
                }
            />

            {/* Quick Stats Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {isOrganizer ? (
                    <>
                        <Link href="/dashboard/events" className="group">
                            <div className="dashboard-surface dashboard-list-item p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">My Events</span>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight">{eventsCount}</span>
                                    <span className="text-xs text-muted-foreground">total created</span>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/approvals" className="group">
                            <div className="dashboard-surface dashboard-list-item p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Pending Approvals</span>
                                    <CheckSquare className="h-4 w-4 text-amber-500" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight text-amber-500">{pendingApprovalsCount}</span>
                                    <span className="text-xs text-muted-foreground">coach requests</span>
                                </div>
                            </div>
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/dashboard/dojos" className="group">
                            <div className="dashboard-surface dashboard-list-item p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Dojos</span>
                                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight">{dojosCount}</span>
                                    <span className="text-xs text-muted-foreground">locations</span>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/students" className="group">
                            <div className="dashboard-surface dashboard-list-item p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Students</span>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight">{studentsCount}</span>
                                    <span className="text-xs text-muted-foreground">athletes</span>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/entries" className="group">
                            <div className="dashboard-surface dashboard-list-item p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Active Entries</span>
                                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight">{entriesCount}</span>
                                    <span className="text-xs text-muted-foreground">submitted</span>
                                </div>
                            </div>
                        </Link>
                    </>
                )}
            </div>

            {/* Role-Specific Content */}
            {isOrganizer ? (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Active Events */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Active Events</h2>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                <Link href="/dashboard/events">View All</Link>
                            </Button>
                        </div>

                        <div className="dashboard-surface">
                            {organizerActiveEvents.length > 0 ? (
                                <div className="dashboard-list">
                                    {organizerActiveEvents.map((event) => (
                                        <Link
                                            key={event.id}
                                            href={`/dashboard/events/${event.id}`}
                                            className="dashboard-list-item group flex items-center justify-between gap-4 p-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium truncate">{event.title}</span>
                                                        <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">{event.event_type}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
                                            <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                                                Manage
                                                <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                    No active events right now.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                                <ListTodo className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
                        </div>
                        <div className="grid gap-3">
                            <Link href="/dashboard/events" className="group">
                                <div className="dashboard-surface dashboard-list-item p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-sm">Create New Event</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">Set up a tournament, seminar, or test.</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </Link>
                            <Link href="/dashboard/approvals" className="group">
                                <div className="dashboard-surface dashboard-list-item p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-sm">Review Approvals</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">Process coach requests to participate in your events.</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Active Events */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                    <FolderOpen className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Active Events</h2>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                <Link href="/dashboard/events-browser">Browse All</Link>
                            </Button>
                        </div>

                        {activePublicEvents.length > 0 ? (
                            <CoachActiveEventsCards
                                events={activePublicEvents}
                                statusByEventId={statusByEventId}
                            />
                        ) : (
                            <div className="dashboard-surface py-6 text-center text-xs text-muted-foreground">
                                No active events right now.
                            </div>
                        )}
                    </div>

                    {/* Approved Events */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Approved Events</h2>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                <Link href="/dashboard/entries">View Entries</Link>
                            </Button>
                        </div>

                        <div className="dashboard-surface">
                            {approvedEvents.length > 0 ? (
                                <div className="dashboard-list">
                                    {approvedEvents.map((event) => (
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
                                                        <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">{event.event_type}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
                                            <Button size="sm" className="h-7 text-xs">
                                                Manage Entries
                                                <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                    No approved events yet. Apply to an active event above to get started.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
