import { daysLeftText, formatDateRangeStable, formatDateStable } from '@/lib/date'
import { getUserProfile } from '@/lib/auth/require-role'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, ChevronRight, Clock, Plus } from 'lucide-react'
import { ParentLinkBanner } from '@/components/dashboard/parent-link-banner'
import { StageFilterTiles } from '@/components/ui/stage-filter-tiles'
import sql from '@/lib/db'

// ============================================================================
// Home for coach and organiser. "What to do now" comes first, then events.
// Layout: "EntryDesk UX Fixes" design canvas (09/11/2026).
// ============================================================================

type PublicEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location: string | null
    registration_close_date: string | null
}

type ApprovedEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location: string | null
    registration_close_date: string | null
}

type OrganizerEvent = {
    id: string
    title: string
    start_date: string
    end_date: string
    location: string | null
    registration_close_date: string | null
    to_review: number
    accepted: number
    total: number
}

type CoachPrimaryDojo = {
    id: string
    name: string
    slug: string | null
    join_code: string | null
    join_link_enabled: boolean
}

type StageCount = { event_id: string; status: string; count: number }

function toIsoDate(d: string | Date | null | undefined): string {
    if (!d) return ''
    if (d instanceof Date) return d.toISOString().slice(0, 10)
    return String(d).slice(0, 10)
}

function LastDay({ date }: { date: string | null }) {
    if (!date) return null
    const left = daysLeftText(date)
    return (
        <p className="mt-1 text-[15px] font-semibold text-[var(--status-pending-fg)]">
            Last day to enter: {formatDateStable(date)}
            {left ? ` · ${left}` : ''}
        </p>
    )
}

function RowLink({ href, label, count }: { href: string; label: string; count?: number }) {
    return (
        <Link href={href} className="flex min-h-14 items-center gap-3 border-t border-border px-1 first:border-t-0 hover:bg-muted/50">
            <span className="flex-1 text-base font-semibold">{label}</span>
            {typeof count === 'number' && <span className="text-base text-muted-foreground">{count}</span>}
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </Link>
    )
}

export default async function DashboardPage() {
    const { user, profile, role } = await getUserProfile()

    const firstName = profile?.full_name?.split(' ')[0] || profile?.full_name || user.email
    const isOrganizer = role === 'organizer' || role === 'admin'
    const today = new Date().toISOString().slice(0, 10)

    // ─── ORGANISER ────────────────────────────────────────────────────────────
    if (isOrganizer) {
        const [activeEvents, pendingCountRes] = await Promise.all([
            sql<OrganizerEvent[]>`
                SELECT ev.id, ev.title, ev.start_date, ev.end_date, ev.location, ev.registration_close_date,
                       COUNT(e.id) FILTER (WHERE e.status = 'submitted')::int AS to_review,
                       COUNT(e.id) FILTER (WHERE e.status = 'approved')::int AS accepted,
                       COUNT(e.id) FILTER (WHERE e.status IN ('submitted','approved','rejected','correction_needed'))::int AS total
                FROM events ev
                LEFT JOIN entries e ON e.event_id = ev.id
                WHERE ev.organizer_id = ${user.id} AND ev.end_date >= ${today}
                GROUP BY ev.id
                ORDER BY ev.start_date ASC
            `,
            sql<{ count: number }[]>`
                SELECT count(*)::int AS count
                FROM event_applications a
                JOIN events ev ON a.event_id = ev.id
                WHERE ev.organizer_id = ${user.id} AND a.status = 'pending'
            `,
        ])
        const pendingApprovalsCount = pendingCountRes[0]?.count ?? 0
        const toReview = activeEvents.reduce((n, e) => n + e.to_review, 0)

        return (
            <div className="space-y-6">
                {role === 'admin' && <Link className="underline" href="/admin">Admin portal</Link>}
                <DashboardPageHeader
                    title={`Hello, ${firstName}`}
                    actions={
                        <Button asChild className="min-h-11 gap-2 text-base">
                            <Link href="/dashboard/events">
                                <Plus className="h-5 w-5" aria-hidden="true" />
                                New event
                            </Link>
                        </Button>
                    }
                />

                {(pendingApprovalsCount > 0 || toReview > 0) && (
                    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--status-pending)]/40 bg-[var(--status-pending-bg)] p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-pending-fg)] text-[var(--status-pending-bg)]">
                                <Clock className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold">Waiting for you</h2>
                                <ul className="mt-1 text-base">
                                    {toReview > 0 && <li>{toReview === 1 ? '1 entry to accept' : `${toReview} entries to accept`}</li>}
                                    {pendingApprovalsCount > 0 && (
                                        <li>{pendingApprovalsCount === 1 ? '1 coach wants to join an event' : `${pendingApprovalsCount} coaches want to join events`}</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {toReview > 0 && activeEvents.find((e) => e.to_review > 0) && (
                                <Button asChild className="min-h-12 gap-2 bg-foreground text-base text-background hover:bg-foreground/90">
                                    <Link href={`/dashboard/events/${activeEvents.find((e) => e.to_review > 0)!.id}?status=submitted`}>
                                        Accept entries <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                    </Link>
                                </Button>
                            )}
                            {pendingApprovalsCount > 0 && (
                                <Button asChild variant="outline" className="min-h-12 text-base">
                                    <Link href="/dashboard/approvals">See coach requests</Link>
                                </Button>
                            )}
                        </div>
                    </section>
                )}

                <section className="space-y-3">
                    <h2 className="text-lg font-bold">Your events</h2>
                    {activeEvents.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
                            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                            <p className="text-base font-medium">No upcoming events</p>
                            <Button asChild className="mt-4 min-h-11 text-base">
                                <Link href="/dashboard/events">Create an event</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {activeEvents.map((ev) => (
                                <article key={ev.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                                    <div>
                                        <h3 className="text-xl font-bold leading-tight">{ev.title}</h3>
                                        <p className="mt-0.5 text-[15px] text-muted-foreground">
                                            {formatDateRangeStable(ev.start_date, ev.end_date)}
                                            {ev.location ? ` · ${ev.location}` : ''}
                                        </p>
                                        <LastDay date={ev.registration_close_date} />
                                    </div>
                                    <StageFilterTiles
                                        columnsClassName="grid-cols-2"
                                        hrefFor={(k) => `/dashboard/events/${ev.id}?status=${k}`}
                                        tiles={[
                                            { key: 'submitted', label: 'To accept', count: ev.to_review, attention: true },
                                            { key: 'approved', label: 'Accepted', count: ev.accepted },
                                        ]}
                                    />
                                    <Button asChild variant="outline" className="min-h-12 text-base">
                                        <Link href={`/dashboard/events/${ev.id}`}>Open event</Link>
                                    </Button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        )
    }

    // ─── COACH ────────────────────────────────────────────────────────────────
    const [
        dojosCountRes,
        studentsCountRes,
        publicEvents,
        applications,
        approvedEvents,
        coachDojoRes,
        parentCountRes,
    ] = await Promise.all([
        sql<{ count: number }[]>`SELECT count(*)::int AS count FROM dojos WHERE coach_id = ${user.id}`,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count FROM students s JOIN dojos d ON s.dojo_id = d.id WHERE d.coach_id = ${user.id}
        `,
        sql<PublicEvent[]>`
            SELECT id, title, start_date, end_date, location, registration_close_date
            FROM events WHERE is_public = true AND end_date >= ${today}
            ORDER BY start_date ASC
        `,
        sql<{ event_id: string; status: string }[]>`
            SELECT event_id, status FROM event_applications WHERE coach_id = ${user.id}
        `,
        sql<ApprovedEvent[]>`
            SELECT ev.id, ev.title, ev.start_date, ev.end_date, ev.location, ev.registration_close_date
            FROM event_applications a
            JOIN events ev ON a.event_id = ev.id
            WHERE a.coach_id = ${user.id} AND a.status = 'approved' AND ev.end_date >= ${today}
            ORDER BY ev.start_date ASC
        `,
        sql<CoachPrimaryDojo[]>`
            SELECT id, name, slug, join_code, COALESCE(join_link_enabled, TRUE) AS join_link_enabled
            FROM dojos WHERE coach_id = ${user.id} ORDER BY created_at ASC LIMIT 1
        `,
        sql<{ count: number }[]>`
            SELECT COUNT(DISTINCT s.parent_id)::int AS count
            FROM students s JOIN dojos d ON s.dojo_id = d.id
            WHERE d.coach_id = ${user.id} AND s.parent_id IS NOT NULL
        `,
    ])

    const approvedIds = approvedEvents.map((e) => e.id)
    const stageRows = approvedIds.length
        ? await sql<StageCount[]>`
            SELECT e.event_id, e.status, COUNT(DISTINCT e.id)::int AS count
            FROM entries e
            JOIN students s ON e.student_id = s.id
            JOIN dojos d ON s.dojo_id = d.id
            WHERE (d.coach_id = ${user.id} OR e.coach_id = ${user.id}) AND e.event_id = ANY(${approvedIds})
            GROUP BY e.event_id, e.status
        `
        : []

    const dojosCount = dojosCountRes[0]?.count ?? 0
    const studentsCount = studentsCountRes[0]?.count ?? 0
    const primaryDojo = coachDojoRes[0] || null
    const parentCount = parentCountRes[0]?.count ?? 0
    const statusByEventId = Object.fromEntries(applications.map((a) => [a.event_id, a.status])) as Record<string, string>

    const countFor = (eventId: string, statuses: string[]) =>
        stageRows.filter((r) => r.event_id === eventId && statuses.includes(r.status)).reduce((n, r) => n + r.count, 0)
    const WITH_COACH = ['pending_coach', 'draft']
    const waitingTotal = approvedIds.reduce((n, id) => n + countFor(id, WITH_COACH), 0)
    const firstWaitingEvent = approvedEvents.find((e) => countFor(e.id, WITH_COACH) > 0)
    const otherOpenEvents = publicEvents.filter((e) => statusByEventId[e.id] !== 'approved' && toIsoDate(e.end_date) >= today)

    return (
        <div className="space-y-5">
            <DashboardPageHeader title={`Hello, ${firstName}`} />

            {dojosCount === 0 ? (
                <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                    <h2 className="text-lg font-bold">First, create your dojo</h2>
                    <p className="text-base text-muted-foreground">
                        Your dojo gets a link you can send to parents. Then they add their children themselves.
                    </p>
                    <Button asChild className="min-h-12 self-start text-base">
                        <Link href="/dashboard/dojos">Create my dojo</Link>
                    </Button>
                </section>
            ) : waitingTotal > 0 && firstWaitingEvent ? (
                <section className="flex flex-col gap-3 rounded-2xl border border-[var(--status-pending)]/40 bg-[var(--status-pending-bg)] p-5 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-pending-fg)] text-[var(--status-pending-bg)]">
                            <Clock className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="text-lg font-bold">
                                {waitingTotal === 1 ? '1 entry is waiting for you' : `${waitingTotal} entries are waiting for you`}
                            </h2>
                            <p className="text-[15px] text-[var(--status-pending-fg)]">
                                {waitingTotal === 1 ? 'Check it and send it to the organiser.' : 'Check them and send them to the organiser.'}
                            </p>
                        </div>
                    </div>
                    <Button asChild className="min-h-12 gap-2 bg-foreground text-base text-background hover:bg-foreground/90">
                        <Link href={`/dashboard/events/${firstWaitingEvent.id}/entries?status=pending_coach`}>
                            Check entries now <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                    </Button>
                </section>
            ) : null}

            <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-5">
                    {approvedEvents.length > 0 ? (
                        approvedEvents.map((ev) => (
                            <section key={ev.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                                <div>
                                    <p className="text-sm font-semibold text-muted-foreground">Your event</p>
                                    <h2 className="text-xl font-bold leading-tight">{ev.title}</h2>
                                    <p className="mt-0.5 text-[15px] text-muted-foreground">
                                        {formatDateRangeStable(ev.start_date, ev.end_date)}
                                        {ev.location ? ` · ${ev.location}` : ''}
                                    </p>
                                    <LastDay date={ev.registration_close_date} />
                                </div>
                                <StageFilterTiles
                                    hrefFor={(k) => `/dashboard/events/${ev.id}/entries?status=${k}`}
                                    tiles={[
                                        { key: 'pending_coach', label: 'With coach', count: countFor(ev.id, WITH_COACH), attention: true },
                                        { key: 'submitted', label: 'With organiser', count: countFor(ev.id, ['submitted']) },
                                        { key: 'approved', label: 'Accepted', count: countFor(ev.id, ['approved']) },
                                        { key: 'correction_needed', label: 'Needs a fix', count: countFor(ev.id, ['correction_needed']) },
                                    ]}
                                />
                                <Button asChild variant="outline" className="min-h-12 text-base">
                                    <Link href={`/dashboard/events/${ev.id}/entries?status=all`}>Open all entries</Link>
                                </Button>
                            </section>
                        ))
                    ) : (
                        <section className="rounded-2xl border border-border bg-card p-5">
                            <h2 className="text-lg font-bold">No events yet</h2>
                            <p className="mt-1 text-base text-muted-foreground">
                                Ask to join an event. When the organiser says yes, it shows here.
                            </p>
                            <Button asChild className="mt-3 min-h-12 text-base">
                                <Link href="/dashboard/events-browser">Find events</Link>
                            </Button>
                        </section>
                    )}

                    {otherOpenEvents.length > 0 && (
                        <section className="rounded-2xl border border-border bg-card p-5">
                            <h2 className="text-lg font-bold">Other events open now</h2>
                            <ul className="mt-2">
                                {otherOpenEvents.slice(0, 3).map((ev) => (
                                    <li key={ev.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-3 first:border-t-0">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold">{ev.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDateRangeStable(ev.start_date, ev.end_date)}
                                                {ev.location ? ` · ${ev.location}` : ''}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-muted-foreground">
                                            {statusByEventId[ev.id] === 'pending' ? 'Request sent' : statusByEventId[ev.id] === 'rejected' ? 'Not accepted' : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <Button asChild variant="outline" className="mt-2 min-h-11 text-base">
                                <Link href="/dashboard/events-browser">See all events</Link>
                            </Button>
                        </section>
                    )}
                </div>

                <div className="space-y-5">
                    {primaryDojo && (
                        <ParentLinkBanner dojo={primaryDojo} coachName={profile?.full_name || 'Coach'} parentCount={parentCount} />
                    )}
                    <nav aria-label="Your dojo" className="rounded-2xl border border-border bg-card px-4 py-1">
                        <RowLink href="/dashboard/students" label="My athletes" count={studentsCount} />
                        <RowLink href="/dashboard/dojos" label="My dojos" count={dojosCount} />
                        <RowLink href="/dashboard/events-browser" label="Find more events" />
                    </nav>
                </div>
            </div>
        </div>
    )
}
