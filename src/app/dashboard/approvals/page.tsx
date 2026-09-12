import { requireRole } from '@/lib/auth/require-role'
import { ApprovalButtons } from '@/components/approvals/approval-buttons'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckSquare } from 'lucide-react'
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
        <div className="space-y-4">
            <DashboardPageHeader
                title="Approvals"
                description={`${totalCount} pending requests`}
            />

            <div className="dashboard-surface">
                {applications && applications.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Coach</TableHead>
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="hidden md:table-cell">Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {applications.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell className="font-medium text-xs">{app.event_title}</TableCell>
                                    <TableCell className="text-xs">{app.coach_name || app.coach_email || '—'}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{app.coach_email || '—'}</TableCell>
                                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <ApprovalButtons applicationId={app.id} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="py-8 text-center">
                        <CheckSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium">All clear</p>
                        <p className="mt-1 text-xs text-muted-foreground">No pending approvals right now.</p>
                    </div>
                )}
            </div>

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
