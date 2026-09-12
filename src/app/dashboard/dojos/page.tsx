import { requireRole } from '@/lib/auth/require-role'
import { Button } from '@/components/ui/button'
import { Plus, LayoutGrid, Users, ShieldAlert } from 'lucide-react'
import { DojoDialog } from '@/components/dojos/dojo-dialog'
import { DojoActions } from '@/components/dojos/dojo-actions'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { PaginationControls } from '@/components/ui/pagination-controls'
import Link from 'next/link'
import sql from '@/lib/db'

export default async function DojosPage({
    searchParams,
}: {
    searchParams?: Promise<{ page?: string }>
}) {
    const { user } = await requireRole('coach', { redirectTo: '/dashboard' })
    const sp = await searchParams
    const page = Math.max(1, Number(sp?.page) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    // Fetch coach's owned and shared dojos with student count and collaborator data
    const [dojos, countResult, allCollaborators] = await Promise.all([
        sql<
            {
                id: string
                name: string
                coach_id: string
                created_at: string
                student_count: number
                my_permission: string
            }[]
        >`
            SELECT 
                d.id, 
                d.name, 
                d.coach_id,
                d.created_at, 
                COUNT(DISTINCT s.id)::int AS student_count,
                CASE 
                    WHEN d.coach_id = ${user.id} THEN 'owner'
                    ELSE COALESCE(dc.permission, 'read')
                END AS my_permission
            FROM dojos d
            LEFT JOIN students s ON d.id = s.dojo_id
            LEFT JOIN dojo_collaborators dc ON d.id = dc.dojo_id AND dc.user_id = ${user.id}
            WHERE d.coach_id = ${user.id} OR dc.user_id = ${user.id}
            GROUP BY d.id, d.name, d.coach_id, d.created_at, dc.permission
            ORDER BY d.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(DISTINCT d.id)::int AS count
            FROM dojos d
            LEFT JOIN dojo_collaborators dc ON d.id = dc.dojo_id AND dc.user_id = ${user.id}
            WHERE d.coach_id = ${user.id} OR dc.user_id = ${user.id}
        `,
        sql<
            {
                dojo_id: string
                user_id: string
                permission: 'read' | 'write'
                email: string
                full_name: string | null
            }[]
        >`
            SELECT 
                dc.dojo_id,
                dc.user_id,
                dc.permission,
                u.email,
                u.full_name
            FROM dojo_collaborators dc
            JOIN users u ON dc.user_id = u.id
        `,
    ])

    const totalCount = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    // Group collaborators by dojo_id
    const collaboratorsByDojo: Record<string, any[]> = {}
    for (const c of allCollaborators) {
        if (!collaboratorsByDojo[c.dojo_id]) {
            collaboratorsByDojo[c.dojo_id] = []
        }
        collaboratorsByDojo[c.dojo_id].push({
            user_id: c.user_id,
            permission: c.permission,
            profiles: {
                email: c.email,
                full_name: c.full_name,
            },
        })
    }

    return (
        <div className="space-y-4">
            <DashboardPageHeader
                title="Dojos"
                description="Manage your schools and training locations."
                actions={
                    <DojoDialog>
                        <Button size="sm">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Dojo
                        </Button>
                    </DojoDialog>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dojos && dojos.length > 0 ? (
                    dojos.map((dojo) => {
                        const isOwner = dojo.coach_id === user.id
                        const collaborators = collaboratorsByDojo[dojo.id] || []

                        return (
                            <div
                                key={dojo.id}
                                className="dashboard-surface dashboard-list-item group relative p-3"
                            >
                                <Link
                                    href={{ pathname: '/dashboard/students', query: { dojo: dojo.name } }}
                                    className="absolute inset-0 z-10"
                                >
                                    <span className="sr-only">View students for {dojo.name}</span>
                                </Link>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="pointer-events-none relative z-20 flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                                            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium">{dojo.name}</span>
                                                {!isOwner && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-normal">
                                                        Shared ({dojo.my_permission})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Users className="h-2.5 w-2.5" />
                                                <span>{dojo.student_count || 0} students</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative z-20">
                                        <DojoActions 
                                            dojo={dojo} 
                                            studentCount={dojo.student_count}
                                            isOwner={isOwner}
                                            collaborators={collaborators}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="dashboard-empty col-span-full py-8 text-center">
                        <LayoutGrid className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">No dojos yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Create your first dojo to start adding students.</p>
                        <div className="mt-3">
                            <DojoDialog>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                    Create your first dojo
                                </Button>
                            </DojoDialog>
                        </div>
                    </div>
                )}
            </div>

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
