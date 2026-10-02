import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Shield, Swords, Medal, Building2, XCircle, Settings } from "lucide-react"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import sql from '@/lib/db'
import { OrganiserEntriesList } from "@/components/events/organiser-entries-list"

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
                id: string
                entry_id: string
                event_id: string
                status: string
                participation_type: string | null
                chest_no: number | null
                declared_weight_kg: number | null
                coach_notes: string | null
                rejection_reason: string | null
                created_at: string
                coach_id: string
                coach_name: string | null
                coach_email: string
                student_id: string
                student_name: string
                student_gender: string
                student_rank: string | null
                student_weight: number | null
                student_dob: string | null
                student_photo: string | null
                student_registration_no: string | null
                dojo_id: string | null
                dojo_name: string | null
                category_name: string | null
                event_day_name: string | null
            }[]
        >`
            SELECT 
                e.id,
                e.id AS entry_id,
                e.event_id,
                e.status,
                e.participation_type,
                e.chest_no,
                e.declared_weight_kg,
                e.coach_notes,
                e.rejection_reason,
                e.created_at::text,
                e.coach_id,
                p.full_name AS coach_name,
                p.email AS coach_email,
                s.id AS student_id,
                s.name AS student_name,
                s.gender AS student_gender,
                s.rank AS student_rank,
                s.weight AS student_weight,
                s.date_of_birth::text AS student_dob,
                s.photo_url AS student_photo,
                s.registration_no AS student_registration_no,
                d.id AS dojo_id,
                d.name AS dojo_name,
                c.name AS category_name,
                ed.name AS event_day_name
            FROM entries e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN event_days ed ON e.event_day_id = ed.id
            JOIN users p ON e.coach_id = p.id
            WHERE e.event_id = ${id}
              AND e.status != 'draft'
            ORDER BY e.created_at DESC
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
        rejected: entries.filter((e) => e.status === 'rejected').length,
    }

    // =========================================================================
    // Disciplines & Participation Breakdown
    // =========================================================================
    let totalKata = 0
    let totalKumite = 0
    let teamKata = 0
    let teamKumite = 0
    let optedBoth = 0
    let optedOnlyKata = 0
    let optedOnlyKumite = 0

    entries.forEach((e) => {
        const rawType = (e.participation_type || '').toLowerCase().trim()
        const catName = (e.category_name || '').toLowerCase().trim()
        const typeParts = rawType.split(',').map((s) => s.trim())

        // Check Team Events
        const isTeamKata =
            typeParts.includes('team_kata') ||
            typeParts.includes('team kata') ||
            catName.includes('team kata')

        const isTeamKumite =
            typeParts.includes('team_kumite') ||
            typeParts.includes('team kumite') ||
            catName.includes('team kumite')

        if (isTeamKata) teamKata++
        if (isTeamKumite) teamKumite++

        // Check Individual Events
        const isBothExplicit =
            typeParts.includes('both') ||
            rawType === 'both' ||
            (typeParts.includes('kata') && typeParts.includes('kumite')) ||
            (catName.includes('kata') && catName.includes('kumite'))

        const hasIndividualKata =
            isBothExplicit ||
            typeParts.includes('kata') ||
            rawType.includes('kata') ||
            (catName.includes('kata') && !isTeamKata) ||
            (!rawType && !catName) // fallback default for traditional karate

        const hasIndividualKumite =
            isBothExplicit ||
            typeParts.includes('kumite') ||
            rawType.includes('kumite') ||
            (catName.includes('kumite') && !isTeamKumite) ||
            (!rawType && !catName) // fallback default for traditional karate

        // Total participation across any form
        if (hasIndividualKata || isTeamKata) totalKata++
        if (hasIndividualKumite || isTeamKumite) totalKumite++

        // Opted Distribution Breakdown
        if (hasIndividualKata && hasIndividualKumite) {
            optedBoth++
        } else if (hasIndividualKata && !hasIndividualKumite && !isTeamKumite) {
            optedOnlyKata++
        } else if (hasIndividualKumite && !hasIndividualKata && !isTeamKata) {
            optedOnlyKumite++
        } else if (isBothExplicit) {
            optedBoth++
        } else if (hasIndividualKata) {
            optedOnlyKata++
        } else if (hasIndividualKumite) {
            optedOnlyKumite++
        } else if (isTeamKata) {
            optedOnlyKata++
        } else if (isTeamKumite) {
            optedOnlyKumite++
        }
    })

    const genderStats = {
        male: entries.filter((e) => (e.student_gender || '').toLowerCase() === 'male').length,
        female: entries.filter((e) => (e.student_gender || '').toLowerCase() === 'female').length,
    }
    const femalePct = totalEntries ? (genderStats.female / totalEntries) * 100 : 0
    const malePct = totalEntries ? (genderStats.male / totalEntries) * 100 : 0
    const bothPct = totalEntries ? (optedBoth / totalEntries) * 100 : 0
    const onlyKataPct = totalEntries ? (optedOnlyKata / totalEntries) * 100 : 0
    const onlyKumitePct = totalEntries ? (optedOnlyKumite / totalEntries) * 100 : 0

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
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <Link href={`/dashboard/events/${id}/entries`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-[#ded8cb] bg-white shadow-xs transition-all group-hover:-translate-y-1 group-hover:bg-[#faf8f3] group-hover:shadow-md group-hover:border-[#0d9488]/40 dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40 dark:group-hover:border-[#2dd4b4]/40 dark:group-hover:bg-[#15233c]">
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
                    <Card className="h-full cursor-pointer border border-[#ded8cb] bg-white shadow-xs transition-all group-hover:-translate-y-1 group-hover:bg-[#faf8f3] group-hover:shadow-md group-hover:border-[#0d9488]/40 dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40 dark:group-hover:border-[#2dd4b4]/40 dark:group-hover:bg-[#15233c]">
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
                    <Card className="h-full cursor-pointer border border-[#ded8cb] bg-white shadow-xs transition-all group-hover:-translate-y-1 group-hover:bg-[#faf8f3] group-hover:shadow-md group-hover:border-[#0d9488]/40 dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40 dark:group-hover:border-[#2dd4b4]/40 dark:group-hover:bg-[#15233c]">
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
                    <Card className="h-full cursor-pointer border border-[#ded8cb] bg-white shadow-xs transition-all group-hover:-translate-y-1 group-hover:bg-[#faf8f3] group-hover:shadow-md group-hover:border-[#0d9488]/40 dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40 dark:group-hover:border-[#2dd4b4]/40 dark:group-hover:bg-[#15233c]">
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

                <Link href={`/dashboard/events/${id}/entries?status=rejected`} className="group block h-full focus:outline-none">
                    <Card className="h-full cursor-pointer border border-[#ded8cb] bg-white shadow-xs transition-all group-hover:-translate-y-1 group-hover:bg-[#faf8f3] group-hover:shadow-md group-hover:border-[#0d9488]/40 dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40 dark:group-hover:border-[#2dd4b4]/40 dark:group-hover:bg-[#15233c]">
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
                <Card className="col-span-4 border border-[#ded8cb] bg-white shadow-xs transition-all hover:shadow-md dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="text-base font-bold">Overview</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Total {totalEntries} {totalEntries === 1 ? 'athlete' : 'athletes'} registered
                            </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/25">
                            {totalEntries} Total
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Participation & Disciplines */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Swords className="h-3.5 w-3.5 text-primary" /> Participation Disciplines
                                </h4>

                                {/* 4-Box Discipline Counter Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-[#ded8cb] bg-[#faf8f3] dark:border-[#1f2b40] dark:bg-[#0f1828] p-2.5 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">Total Kata</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">Kata</span>
                                        </div>
                                        <div className="text-xl font-bold mt-1 text-foreground">{totalKata}</div>
                                    </div>

                                    <div className="rounded-xl border border-[#ded8cb] bg-[#faf8f3] dark:border-[#1f2b40] dark:bg-[#0f1828] p-2.5 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">Total Kumite</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">Kumite</span>
                                        </div>
                                        <div className="text-xl font-bold mt-1 text-foreground">{totalKumite}</div>
                                    </div>

                                    <div className="rounded-xl border border-[#ded8cb] bg-[#faf8f3] dark:border-[#1f2b40] dark:bg-[#0f1828] p-2.5 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">Team Kata</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Team</span>
                                        </div>
                                        <div className="text-xl font-bold mt-1 text-foreground">{teamKata}</div>
                                    </div>

                                    <div className="rounded-xl border border-[#ded8cb] bg-[#faf8f3] dark:border-[#1f2b40] dark:bg-[#0f1828] p-2.5 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">Team Kumite</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">Team</span>
                                        </div>
                                        <div className="text-xl font-bold mt-1 text-foreground">{teamKumite}</div>
                                    </div>
                                </div>

                                {/* Selection Breakdown Bars (Opted for Both, Only Kata, Only Kumite) */}
                                <div className="space-y-3 pt-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Opted Distribution
                                    </span>

                                    {/* Both */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                Both (Kata &amp; Kumite)
                                            </span>
                                            <span className="font-bold text-foreground">
                                                {optedBoth} <span className="text-muted-foreground font-normal">({bothPct.toFixed(0)}%)</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${bothPct}%` }} />
                                        </div>
                                    </div>

                                    {/* Only Kata */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                Only Kata
                                            </span>
                                            <span className="font-bold text-foreground">
                                                {optedOnlyKata} <span className="text-muted-foreground font-normal">({onlyKataPct.toFixed(0)}%)</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${onlyKataPct}%` }} />
                                        </div>
                                    </div>

                                    {/* Only Kumite */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                Only Kumite
                                            </span>
                                            <span className="font-bold text-foreground">
                                                {optedOnlyKumite} <span className="text-muted-foreground font-normal">({onlyKumitePct.toFixed(0)}%)</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${onlyKumitePct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Demographics */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-primary" /> Demographics &amp; Gender
                                </h4>

                                <div className="space-y-4 pt-1">
                                    {/* Female */}
                                    <div className="space-y-2 p-3 rounded-xl border border-pink-500/20 bg-pink-500/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-500 font-bold text-sm">
                                                    F
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold text-foreground">Female</span>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {femalePct.toFixed(0)}% of total athletes
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xl font-bold text-pink-500">{genderStats.female}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-pink-500/10">
                                            <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${femalePct}%` }} />
                                        </div>
                                    </div>

                                    {/* Male */}
                                    <div className="space-y-2 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 font-bold text-sm">
                                                    M
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold text-foreground">Male</span>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {malePct.toFixed(0)}% of total athletes
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xl font-bold text-blue-500">{genderStats.male}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-blue-500/10">
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${malePct}%` }} />
                                        </div>
                                    </div>

                                    {/* Total Athletes Summary Card */}
                                    <div className="rounded-xl border border-[#ded8cb] bg-[#faf8f3] dark:border-[#1f2b40] dark:bg-[#0f1828] p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-semibold text-muted-foreground">Total Athletes</span>
                                        </div>
                                        <span className="text-base font-bold text-foreground">{totalEntries}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Dojos */}
                <Card className="col-span-3 border border-[#ded8cb] bg-white shadow-xs transition-all hover:shadow-md dark:border-[#1f2b40] dark:bg-[#111a2b] dark:shadow-black/40">
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
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f2eee5] dark:bg-[#16233a] text-xs font-bold text-foreground">
                                            {i + 1}
                                        </div>
                                        <div className="font-semibold text-sm">{name}</div>
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

            {/* Organiser Tournament Entries Table Matching Coach View */}
            <div className="pt-2">
                <OrganiserEntriesList
                    entries={entries}
                    eventId={id}
                    eventTitle={eventRows[0].title}
                />
            </div>

            <div className="flex justify-end pt-4">
                <Link href={`/dashboard/events/${id}/settings`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    <Settings className="h-3 w-3" /> Event Settings
                </Link>
            </div>
        </div>
    )
}
