import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Shield, Swords, Medal, Building2, AlertCircle, XCircle, Settings } from "lucide-react"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import sql from '@/lib/db'

export default async function EventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { user } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })

    // Security check: verify this organizer owns this event
    const eventRows = await sql<{ id: string; title: string }[]>`
        SELECT id, title FROM events WHERE id = ${id} AND organizer_id = ${user.id} LIMIT 1
    `

    if (eventRows.length === 0) {
        redirect('/dashboard/events')
    }

    // Fetch valid entries via direct JOIN query (100% secure ownership enforced)
    const [entries, appCounts] = await Promise.all([
        sql<
            {
                entry_id: string
                event_id: string
                status: string
                participation_type: string | null
                coach_id: string
                coach_name: string | null
                coach_email: string
                student_gender: string
                dojo_name: string | null
            }[]
        >`
            SELECT 
                e.id AS entry_id,
                e.event_id,
                e.status,
                e.participation_type,
                e.coach_id,
                p.full_name AS coach_name,
                p.email AS coach_email,
                s.gender AS student_gender,
                d.name AS dojo_name
            FROM entries e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN dojos d ON s.dojo_id = d.id
            JOIN users p ON e.coach_id = p.id
            WHERE e.event_id = ${id}
              AND e.status != 'draft'
        `,
        sql<{ status: string; count: number }[]>`
            SELECT status, count(*)::int AS count
            FROM event_applications
            WHERE event_id = ${id}
            GROUP BY status
        `,
    ])

    const appMap = new Map<string, number>()
    appCounts.forEach((r) => appMap.set(r.status, r.count))
    const pendingApprovals = appMap.get('pending') || 0
    const approvedCoaches = appMap.get('approved') || 0

    // Compute Stats
    const totalEntries = entries.length

    const statusStats = {
        approved: entries.filter((e) => e.status === 'approved').length,
        submitted: entries.filter((e) => e.status === 'submitted').length,
        rejected: entries.filter((e) => e.status === 'rejected').length,
    }

    const submittedCoachesMap = new Map<string, string>()
    entries
        .filter((e) => e.status === 'submitted')
        .forEach((e) => {
            const coachId = e.coach_id
            const email = e.coach_email || ''
            const name = e.coach_name || email.split('@')?.[0] || email || '—'
            if (coachId && !submittedCoachesMap.has(coachId)) submittedCoachesMap.set(coachId, name)
        })

    const submittedCoachNames = Array.from(submittedCoachesMap.values())
    const submittedCoachPreview = submittedCoachNames.slice(0, 3)
    const submittedCoachMore = submittedCoachNames.length - submittedCoachPreview.length
    const submittedCoachSummary =
        submittedCoachPreview.length > 0
            ? `Coaches: ${submittedCoachPreview.join(', ')}${submittedCoachMore > 0 ? ` +${submittedCoachMore} more` : ''}`
            : 'No submissions yet'

    const typeStats = {
        kata: entries.filter((e) => e.participation_type === 'kata').length,
        kumite: entries.filter((e) => e.participation_type === 'kumite').length,
        both: entries.filter((e) => e.participation_type === 'both').length,
    }

    const genderStats = {
        male: entries.filter((e) => e.student_gender === 'male').length,
        female: entries.filter((e) => e.student_gender === 'female').length,
    }
    const femalePct = totalEntries ? (genderStats.female / totalEntries) * 100 : 0
    const malePct = totalEntries ? (genderStats.male / totalEntries) * 100 : 0

    // Top Dojos
    const dojoCounts: Record<string, number> = {}
    entries.forEach((e) => {
        const name = e.dojo_name || 'Unknown'
        dojoCounts[name] = (dojoCounts[name] || 0) + 1
    })

    const topDojos = Object.entries(dojoCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

    const distinctDojosCount = Object.keys(dojoCounts).length

    return (
        <div className="space-y-6">
            {/* Top-level Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <Link href={`/dashboard/events/${id}/entries`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all group-hover:-translate-y-1 group-hover:bg-background/70 group-hover:shadow-lg group-hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                        <CardHeader className="flex min-h-[52px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="min-w-0 whitespace-normal text-sm font-medium leading-snug">Total Entries</CardTitle>
                            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalEntries}</div>
                            <p className="text-xs text-muted-foreground">Across {distinctDojosCount} dojos</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/events/${id}/approvals?status=pending`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all group-hover:-translate-y-1 group-hover:bg-background/70 group-hover:shadow-lg group-hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                        <CardHeader className="flex min-h-[52px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="min-w-0 whitespace-normal text-sm font-medium leading-snug">Pending Approvals</CardTitle>
                            <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{pendingApprovals}</div>
                            <p className="text-xs text-muted-foreground">Coach requests</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/events/${id}/approvals?status=approved`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all group-hover:-translate-y-1 group-hover:bg-background/70 group-hover:shadow-lg group-hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                        <CardHeader className="flex min-h-[52px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="min-w-0 whitespace-normal text-sm font-medium leading-snug">Approved Coaches</CardTitle>
                            <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{approvedCoaches}</div>
                            <p className="text-xs text-muted-foreground">Cleared to enter</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/events/${id}/entries?status=approved`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all group-hover:-translate-y-1 group-hover:bg-background/70 group-hover:shadow-lg group-hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                        <CardHeader className="flex min-h-[52px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="min-w-0 whitespace-normal text-sm font-medium leading-snug">Approved Entries</CardTitle>
                            <Medal className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{statusStats.approved}</div>
                            <p className="text-xs text-muted-foreground">Ready for event</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/events/${id}/entries?status=submitted`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all group-hover:-translate-y-1 group-hover:bg-background/70 group-hover:shadow-lg group-hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                        <CardHeader className="flex min-h-[52px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="min-w-0 whitespace-normal text-sm font-medium leading-snug">Submitted</CardTitle>
                            <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{statusStats.submitted}</div>
                            <p className="text-xs text-muted-foreground truncate">{submittedCoachSummary}</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/events/${id}/entries?status=rejected`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all group-hover:-translate-y-1 group-hover:bg-background/70 group-hover:shadow-lg group-hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                        <CardHeader className="flex min-h-[52px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="min-w-0 whitespace-normal text-sm font-medium leading-snug">Rejected Entries</CardTitle>
                            <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{statusStats.rejected}</div>
                            <p className="text-xs text-muted-foreground">Needs changes</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Stats Area */}
                <Card className="col-span-4 border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all hover:-translate-y-0.5 hover:bg-background/70 hover:shadow-lg hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Swords className="h-4 w-4" /> Participation
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Both</span>
                                            <span className="font-medium">{typeStats.both}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-secondary/70">
                                            <div className="h-full bg-primary/80" style={{ width: `${totalEntries ? (typeStats.both / totalEntries) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Kata</span>
                                            <span className="font-medium">{typeStats.kata}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-secondary/70">
                                            <div className="h-full bg-primary/70" style={{ width: `${totalEntries ? (typeStats.kata / totalEntries) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Kumite</span>
                                            <span className="font-medium">{typeStats.kumite}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-secondary/70">
                                            <div className="h-full bg-primary/60" style={{ width: `${totalEntries ? (typeStats.kumite / totalEntries) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Demographics
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded bg-pink-500/15 text-pink-500 font-bold">F</div>
                                                <span className="text-sm">Female</span>
                                            </div>
                                            <span className="font-bold">{genderStats.female}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-secondary/70">
                                            <div className="h-full bg-pink-500" style={{ width: `${femalePct}%` }} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/15 text-blue-500 font-bold">M</div>
                                                <span className="text-sm">Male</span>
                                            </div>
                                            <span className="font-bold">{genderStats.male}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-secondary/70">
                                            <div className="h-full bg-blue-500" style={{ width: `${malePct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Dojos */}
                <Card className="col-span-3 border border-black/10 bg-gradient-to-b from-background/90 to-background/50 shadow-md shadow-black/5 transition-all hover:-translate-y-0.5 hover:bg-background/70 hover:shadow-lg hover:shadow-black/10 dark:border-white/10 dark:shadow-black/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" /> Top Dojos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topDojos.length > 0 ? topDojos.map(([name, count], i) => (
                                <div key={name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                            {i + 1}
                                        </div>
                                        <div className="font-medium text-sm">{name}</div>
                                    </div>
                                    <div className="text-sm font-bold">{count}</div>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground">No data yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Link href={`/dashboard/events/${id}/settings`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    <Settings className="h-3 w-3" /> Event Settings
                </Link>
            </div>
        </div>
    )
}
