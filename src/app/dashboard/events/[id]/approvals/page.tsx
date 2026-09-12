import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApprovalButtons } from '@/components/approvals/approval-buttons'
import { notFound } from 'next/navigation'
import sql from '@/lib/db'

export default async function EventApprovalsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams?: Promise<{ status?: string }>
}) {
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })
    const { id } = await params

    // Verify ownership of event
    const events = await sql<{ id: string; title: string; organizer_id: string }[]>`
        SELECT id, title, organizer_id FROM events WHERE id = ${id} LIMIT 1
    `

    if (events.length === 0 || (role !== 'admin' && events[0].organizer_id !== user.id)) {
        return notFound()
    }

    const sp = await searchParams
    const statusParam = sp?.status
    const status = statusParam === 'pending' || statusParam === 'approved' || statusParam === 'rejected'
        ? statusParam
        : 'pending'

    const applications = await sql<
        {
            id: string
            event_id: string
            coach_id: string
            status: string
            created_at: string
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
            u.full_name AS coach_name,
            u.email AS coach_email
        FROM event_applications a
        JOIN users u ON a.coach_id = u.id
        WHERE a.event_id = ${id}
          AND a.status = ${status}
        ORDER BY a.created_at DESC
    `

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>
                                {status === 'pending'
                                    ? 'Pending Requests'
                                    : status === 'approved'
                                        ? 'Approved Coaches'
                                        : 'Rejected Requests'}
                            </CardTitle>
                            <CardDescription>{applications.length} requests.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {applications.length > 0 ? (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Coach</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Email</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">{status === 'pending' ? 'Actions' : 'Status'}</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {applications.map((app) => (
                                        <tr key={app.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle font-medium">
                                                {app.coach_name || app.coach_email.split('@')?.[0] || '—'}
                                            </td>
                                            <td className="p-4 align-middle">{app.coach_email}</td>
                                            <td className="p-4 align-middle">{new Date(app.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 align-middle text-right">
                                                {status === 'pending' ? (
                                                    <ApprovalButtons applicationId={app.id} />
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                                                        {status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No {status} requests for this event.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
