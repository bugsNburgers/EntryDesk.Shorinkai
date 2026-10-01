import { requireRole } from '@/lib/auth/require-role'
import { ApprovalButtons } from '@/components/approvals/approval-buttons'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckCircle2, Clock, Users } from 'lucide-react'
import { PaginationControls } from '@/components/ui/pagination-controls'
import sql from '@/lib/db'

export default async function ApprovalsPage({
    searchParams,
}: {
    searchParams?: Promise<{ page?: string }>
}) {
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })
    const sp = await searchParams
    const page = Math.max(1, Number(sp?.page) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    const [applications, countResult] = await Promise.all([
        sql<
            {
                id: string
                event_id: string
                coach_id: string
                status: string
                created_at: string
                event_title: string
                coach_name: string | null
                coach_email: string
            }[]
        >`
            SELECT 
                a.id,
                a.event_id,
                a.coach_id,
                a.status,
                a.created_at,
                ev.title AS event_title,
                u.full_name AS coach_name,
                u.email AS coach_email
            FROM event_applications a
            JOIN events ev ON a.event_id = ev.id
            JOIN users u ON a.coach_id = u.id
            WHERE a.status = 'pending'
              ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
            ORDER BY a.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count
            FROM event_applications a
            JOIN events ev ON a.event_id = ev.id
            WHERE a.status = 'pending'
              ${role !== 'admin' ? sql`AND ev.organizer_id = ${user.id}` : sql``}
        `,
    ])

    const totalCount = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-5">
            <DashboardPageHeader
                title="Approvals"
                description={
                    totalCount > 0
                        ? `${totalCount} pending coach request${totalCount !== 1 ? 's' : ''} — review and approve or decline each one.`
                        : 'Review coach requests to participate in your events.'
                }
            />

            {applications && applications.length > 0 ? (
                <>
                    {/* ─── Desktop: Table view ─── */}
                    <div className="dashboard-surface hidden sm:block">
                        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3.5 dark:border-white/[0.06]">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <h2 className="text-sm font-semibold">Pending Requests</h2>
                            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                                {totalCount}
                            </span>
                        </div>

                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b border-border/30 bg-muted/30 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/[0.04]">
                            <span>Coach</span>
                            <span>Requesting to Join</span>
                            <span>Actions</span>
                        </div>

                        <div className="divide-y divide-border/30 dark:divide-white/[0.04]">
                            {applications.map((app) => (
                                <div key={app.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/30">
                                    {/* Coach info */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold border border-border/50">
                                                {(app.coach_name || app.coach_email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {app.coach_name || '—'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {app.coach_email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Event + date */}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{app.event_title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Requested {new Date(app.created_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="shrink-0">
                                        <ApprovalButtons applicationId={app.id} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Mobile: Card view ─── */}
                    <div className="space-y-3 sm:hidden">
                        <div className="flex items-center gap-2 px-1">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-semibold">Pending Requests</span>
                            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                                {totalCount}
                            </span>
                        </div>

                        {applications.map((app) => (
                            <div
                                key={app.id}
                                className="dashboard-surface p-4 space-y-3"
                            >
                                {/* Coach avatar + name */}
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold border border-border/50">
                                        {(app.coach_name || app.coach_email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{app.coach_name || '—'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{app.coach_email}</p>
                                    </div>
                                </div>

                                {/* Event info */}
                                <div className="rounded-lg bg-muted/40 px-3 py-2.5 dark:bg-white/[0.03]">
                                    <p className="text-xs text-muted-foreground mb-0.5">Requesting to join</p>
                                    <p className="text-sm font-medium">{app.event_title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Full-width action buttons */}
                                <div className="pt-1">
                                    <ApprovalButtons applicationId={app.id} fullWidth />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="dashboard-surface">
                    <EmptyState
                        icon={<CheckCircle2 />}
                        title="All clear!"
                        description="No pending approvals right now. When coaches apply to your events, their requests will appear here."
                    />
                </div>
            )}

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
