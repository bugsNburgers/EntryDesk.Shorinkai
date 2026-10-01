import { requireRole } from '@/lib/auth/require-role'
import { StudentDialog } from '@/components/students/student-dialog'
import { StudentBulkUpload } from '@/components/students/student-bulk-upload'
import { StudentDataTable } from '@/components/students/student-data-table'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'
import sql from '@/lib/db'

export default async function StudentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { user } = await requireRole('coach', { redirectTo: '/dashboard' })

    // URL Params
    const resolvedSearchParams = await searchParams
    const page = Math.max(1, Number(resolvedSearchParams['page']) || 1)

    const dojoParamRaw = resolvedSearchParams['dojo']
    const dojoParam = Array.isArray(dojoParamRaw) ? dojoParamRaw[0] : dojoParamRaw
    const limit = 50
    const offset = (page - 1) * limit

    // Fetch coach's dojos for filter dropdown and dialogs
    const dojos = await sql<{ id: string; name: string }[]>`
        SELECT id, name
        FROM dojos
        WHERE coach_id = ${user.id}
        ORDER BY name ASC
    `

    const selectedDojo = dojoParam ? dojos.find((d) => d.name === dojoParam) : undefined
    const selectedDojoId = selectedDojo?.id

    // Fetch students strictly filtered by coach's dojos
    const [students, countResult] = await Promise.all([
        sql<
            {
                id: string
                name: string
                gender: string
                rank: string | null
                weight: number | null
                date_of_birth: string | null
                dojo_id: string
                registration_no: string | null
                generic_checked: boolean
                photo_url: string | null
                parent_id: string | null
                parent: {
                    name: string | null
                    email: string | null
                    phone: string | null
                } | null
                created_at: string
                dojos: { name: string }
            }[]
        >`
            SELECT 
                s.id,
                s.name,
                s.gender,
                s.rank,
                s.weight,
                s.date_of_birth,
                s.dojo_id,
                s.registration_no,
                s.generic_checked,
                s.photo_url,
                s.parent_id,
                CASE 
                    WHEN p.id IS NOT NULL THEN json_build_object(
                        'name', p.full_name,
                        'email', p.email,
                        'phone', s.phone
                    )
                    ELSE NULL
                END AS parent,
                s.created_at,
                json_build_object('name', d.name) AS dojos
            FROM students s
            JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN users p ON s.parent_id = p.id
            WHERE d.coach_id = ${user.id}
              ${selectedDojoId ? sql`AND s.dojo_id = ${selectedDojoId}` : sql``}
            ORDER BY s.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql<{ count: number }[]>`
            SELECT count(*)::int AS count
            FROM students s
            JOIN dojos d ON s.dojo_id = d.id
            WHERE d.coach_id = ${user.id}
              ${selectedDojoId ? sql`AND s.dojo_id = ${selectedDojoId}` : sql``}
        `,
    ])

    const totalCount = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-5">
            <DashboardPageHeader
                title="Athletes"
                description="Manage your athletes across all your dojos."
                actions={
                    <>
                        <StudentBulkUpload dojos={dojos || []} initialDojoId={selectedDojoId} />
                        <StudentDialog dojos={dojos || []} initialDojoId={selectedDojoId} />
                    </>
                }
            />

            <div className="dashboard-surface p-4 sm:p-5">
                {(students || []).length === 0 && !selectedDojoId ? (
                    <EmptyState
                        icon={<Users />}
                        title="No athletes yet"
                        description="Add your first athlete manually, or upload a CSV to import your entire roster at once."
                        actions={
                            <>
                                <StudentBulkUpload dojos={dojos || []} initialDojoId={selectedDojoId} />
                                <StudentDialog dojos={dojos || []} initialDojoId={selectedDojoId} />
                            </>
                        }
                    />
                ) : (
                    <StudentDataTable data={students || []} dojos={dojos || []} initialDojoFilter={selectedDojo?.name} />
                )}
            </div>

            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    )
}
