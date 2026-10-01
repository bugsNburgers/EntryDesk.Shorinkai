import { getUserProfile } from '@/lib/auth/require-role'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, Users, ClipboardList, LayoutGrid, CheckSquare, FolderOpen, ListTodo, MapPin, CheckCircle2, AlertTriangle, Clock, TrendingUp, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CoachActiveEventsCards } from '@/components/dashboard/coach-active-events-cards'
import { ParentLinkBanner } from '@/components/dashboard/parent-link-banner'
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

type CoachPrimaryDojo = {
    id: string
    name: string
    slug: string | null
    join_code: string | null
    join_link_enabled: boolean
}

export default async function DashboardPage() {
    const { user, profile, role } = await getUserProfile()

    const firstName = profile?.full_name?.split(' ')[0] || profile?.full_name || user.email
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
    let primaryDojo: CoachPrimaryDojo | null = null
    let parentCount = 0
    let pendingParentEntriesCount = 0

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
        const [
            dojosCountRes,
            studentsCountRes,
            entriesCountRes,
            publicEventsRes,
            appsRes,
            approvedEventsRes,
            coachDojoRes,
            parentCountRes,
            pendingParentEntriesRes,
        ] = await Promise.all([
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
            sql<CoachPrimaryDojo[]>`
                SELECT id, name, slug, join_code, COALESCE(join_link_enabled, TRUE) AS join_link_enabled
                FROM dojos
                WHERE coach_id = ${user.id}
                ORDER BY created_at ASC
                LIMIT 1
            `,
            sql<{ count: number }[]>`
                SELECT COUNT(DISTINCT s.parent_id)::int AS count
                FROM students s
                JOIN dojos d ON s.dojo_id = d.id
                WHERE d.coach_id = ${user.id} AND s.parent_id IS NOT NULL
            `,
            sql<{ count: number }[]>`
                SELECT COUNT(DISTINCT e.id)::int AS count
                FROM entries e
                JOIN students s ON e.student_id = s.id
                JOIN dojos d ON s.dojo_id = d.id
                WHERE d.coach_id = ${user.id} AND e.status = 'pending_coach'
            `,
        ])

        dojosCount = dojosCountRes[0]?.count ?? 0
        studentsCount = studentsCountRes[0]?.count ?? 0
        entriesCount = entriesCountRes[0]?.count ?? 0
        publicEvents = publicEventsRes
        applications = appsRes
        approvedEvents = approvedEventsRes
        primaryDojo = coachDojoRes[0] || null
        parentCount = parentCountRes[0]?.count ?? 0
        pendingParentEntriesCount = pendingParentEntriesRes[0]?.count ?? 0
    }

    function toIsoDate(d: string | Date | null | undefined): string {
        if (!d) return ''
        if (d instanceof Date) return d.toISOString().slice(0, 10)
        return String(d).slice(0, 10)
    }

    const activePublicEvents = (publicEvents ?? []).filter((event) => toIsoDate(event.end_date) >= today)
    const statusByEventId = Object.fromEntries(applications.map((app) => [app.event_id, app.status])) as Record<string, string>

    // Coach next-step messaging
    const pendingCount = applications.filter(a => a.status === 'pending').length
    const approvedCount = applications.filter(a => a.status === 'approved').length

    return (
        <div className="space-y-7">
            <DashboardPageHeader
                title={`Welcome back, ${firstName} 👋`}
                description={
                    isOrganizer
                        ? 'Manage your events, approve coach requests, and view registrations.'
                        : 'Manage your athletes, view events, and submit entries.'
                }
            />

            {/* ─── COACH: Parent Link Banner ─── */}
            {!isOrganizer && primaryDojo && (
                <ParentLinkBanner
                    dojo={primaryDojo}
                    coachName={profile?.full_name || 'Coach'}
                    parentCount={parentCount}
                    pendingEntriesCount={pendingParentEntriesCount}
                />
            )}

            {/* ─── ORGANIZER: Urgent Pending Approvals Banner ─── */}
            {isOrganizer && pendingApprovalsCount > 0 && (
                <Link href="/dashboard/approvals" className="block group">
                    <div className="attention-banner flex items-center justify-between gap-4 transition-all hover:brightness-[0.97] dark:hover:brightness-105">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                    {pendingApprovalsCount} coach request{pendingApprovalsCount !== 1 ? 's' : ''} waiting for review
                                </p>
                                <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                                    Coaches are waiting to participate in your events — don't leave them hanging.
                                </p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-black gap-1.5">
                            Review Now
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </Link>
            )}

            {/* ─── COACH: Get Started Banner (no dojos yet) ─── */}
            {!isOrganizer && dojosCount === 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 dark:border-blue-800/40 dark:bg-blue-950/30 px-5 py-4 flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 mt-0.5">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Let's get you set up</p>
                        <p className="text-xs text-blue-700/80 dark:text-blue-400/70 mt-0.5">
                            Create your first dojo, then add your athletes to start applying to events.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <Button asChild size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white">
                                <Link href="/dashboard/dojos">Create Dojo</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}



            {/* ─── Stats Grid ─── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {isOrganizer ? (
                    <>
                        <Link href="/dashboard/events" className="group">
                            <div className="dashboard-surface dashboard-list-item p-5 h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">My Events</p>
                                        <p className="mt-2 text-3xl font-bold tracking-tight">{eventsCount}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">total created</p>
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/approvals" className="group">
                            <div className="dashboard-surface dashboard-list-item p-5 h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Approvals</p>
                                        <p className={`mt-2 text-3xl font-bold tracking-tight ${pendingApprovalsCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                            {pendingApprovalsCount}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">coach requests</p>
                                    </div>
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pendingApprovalsCount > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                                        <CheckSquare className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/dashboard/dojos" className="group">
                            <div className="dashboard-surface dashboard-list-item p-5 h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dojos</p>
                                        <p className="mt-2 text-3xl font-bold tracking-tight">{dojosCount}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">locations</p>
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                                        <LayoutGrid className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/students" className="group">
                            <div className="dashboard-surface dashboard-list-item p-5 h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Athletes</p>
                                        <p className="mt-2 text-3xl font-bold tracking-tight">{studentsCount}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">registered</p>
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                        <Users className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/entries" className="group">
                            <div className="dashboard-surface dashboard-list-item p-5 h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Entries</p>
                                        <p className="mt-2 text-3xl font-bold tracking-tight">{entriesCount}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">submitted</p>
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                        <ClipboardList className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </>
                )}
            </div>

            {/* ─── COACH: Next step guidance ─── */}
            {!isOrganizer && dojosCount > 0 && studentsCount === 0 && (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-5 py-4 flex items-center gap-4 dark:border-white/10">
                    <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                        You have a dojo set up. <Link href="/dashboard/students" className="text-primary font-medium hover:underline">Add your athletes</Link> to start applying to events.
                    </p>
                </div>
            )}

            {!isOrganizer && studentsCount > 0 && activePublicEvents.length > 0 && approvedCount === 0 && pendingCount === 0 && (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-5 py-4 flex items-center gap-4 dark:border-white/10">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                        Events are open. <Link href="/dashboard/events-browser" className="text-primary font-medium hover:underline">Browse events</Link> and apply to participate with your team.
                    </p>
                </div>
            )}

            {!isOrganizer && approvedCount > 0 && entriesCount === 0 && (
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-800/30 dark:bg-emerald-950/20 px-5 py-4 flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">
                        You&apos;re approved for {approvedCount} event{approvedCount !== 1 ? 's' : ''}!{' '}
                        <Link href="/dashboard/entries" className="font-semibold underline underline-offset-2">Submit your entries now</Link>.
                    </p>
                </div>
            )}

            {/* ─── Role-Specific Main Content ─── */}
            {isOrganizer ? (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Active Events */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <h2 className="text-base font-semibold tracking-tight">Active Events</h2>
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
                                            className="dashboard-list-item group flex items-center justify-between gap-4 p-3.5"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Live dot for active events */}
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted relative">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="live-dot absolute -top-0.5 -right-0.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium truncate">{event.title}</span>
                                                        <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">{event.event_type}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        <span>{new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}</span>
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
                                            <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                                                Manage
                                                <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center">
                                    <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">No active events</p>
                                    <p className="mt-1 text-xs text-muted-foreground/70">Create an event to get started</p>
                                    <Button asChild size="sm" className="mt-4 h-8">
                                        <Link href="/dashboard/events">Create Event</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                <ListTodo className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-semibold tracking-tight">Quick Actions</h2>
                        </div>
                        <div className="grid gap-3">
                            <Link href="/dashboard/events" className="group">
                                <div className="dashboard-surface dashboard-list-item p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold">Create New Event</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">Set up a tournament, seminar, or grading test.</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </Link>
                            <Link href="/dashboard/approvals" className="group">
                                <div className="dashboard-surface dashboard-list-item p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold">Review Approvals</h3>
                                                {pendingApprovalsCount > 0 && (
                                                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                        {pendingApprovalsCount}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">Process coach requests to participate in your events.</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-7">
                    {/* Active Events for coach */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                    <FolderOpen className="h-4 w-4" />
                                </div>
                                <h2 className="text-base font-semibold tracking-tight">Open Events</h2>
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
                            <div className="dashboard-surface py-10 text-center">
                                <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">No open events right now</p>
                                <p className="mt-1 text-xs text-muted-foreground/70">Check back soon for upcoming tournaments</p>
                            </div>
                        )}
                    </div>

                    {/* Approved Events */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <h2 className="text-base font-semibold tracking-tight">Approved Events</h2>
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
                                            className="dashboard-list-item group flex items-center justify-between gap-4 p-3.5"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium truncate">{event.title}</span>
                                                        <Badge className="capitalize text-[10px] px-1.5 py-0" variant="secondary">{event.event_type}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        <span>{new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}</span>
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
                                            <Button size="sm" className="h-7 text-xs shrink-0">
                                                Manage Entries
                                                <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center">
                                    <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">No approved events yet</p>
                                    <p className="mt-1 text-xs text-muted-foreground/70">Apply to an open event above — the organizer will approve your request.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
