import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Shield, Medal, Building2, XCircle, Settings } from "lucide-react"
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
                {/* Main Stats Area - Clean & Minimalist */}
                <Card className="col-span-4 border border-[#ded8cb] bg-white shadow-xs dark:border-[#1f2b40] dark:bg-[#111a2b]">
                    <CardHeader className="pb-3 border-b border-[#ded8cb]/80 dark:border-[#1f2b40]">
                        <CardTitle className="text-base font-bold text-foreground">Overview</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {totalEntries} {totalEntries === 1 ? 'athlete' : 'athletes'} registered across {distinctDojosCount} {distinctDojosCount === 1 ? 'dojo' : 'dojos'}
                        </p>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-4">
                        {/* Disciplines Minimalist Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-[#ded8cb]/80 dark:border-[#1f2b40]">
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Total Kata</div>
                                <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{totalKata}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Total Kumite</div>
                                <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{totalKumite}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Team Kata</div>
                                <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{teamKata}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Team Kumite</div>
                                <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{teamKumite}</div>
                            </div>
                        </div>

                        {/* Breakdown Sub-grid: Participation Mix & Demographics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                            {/* Participation Breakdown */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Participation Mix
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-[#ded8cb]/40 dark:border-[#1f2b40]/40">
                                        <span className="text-foreground">Both (Kata &amp; Kumite)</span>
                                        <span className="font-semibold text-foreground">
                                            {optedBoth} <span className="text-muted-foreground font-normal">({bothPct.toFixed(0)}%)</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-[#ded8cb]/40 dark:border-[#1f2b40]/40">
                                        <span className="text-foreground">Only Kata</span>
                                        <span className="font-semibold text-foreground">
                                            {optedOnlyKata} <span className="text-muted-foreground font-normal">({onlyKataPct.toFixed(0)}%)</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-[#ded8cb]/40 dark:border-[#1f2b40]/40">
                                        <span className="text-foreground">Only Kumite</span>
                                        <span className="font-semibold text-foreground">
                                            {optedOnlyKumite} <span className="text-muted-foreground font-normal">({onlyKumitePct.toFixed(0)}%)</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Demographics & Gender */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Demographics
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-[#ded8cb]/40 dark:border-[#1f2b40]/40">
                                        <span className="text-foreground">Male</span>
                                        <span className="font-semibold text-foreground">
                                            {genderStats.male} <span className="text-muted-foreground font-normal">({malePct.toFixed(0)}%)</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-[#ded8cb]/40 dark:border-[#1f2b40]/40">
                                        <span className="text-foreground">Female</span>
                                        <span className="font-semibold text-foreground">
                                            {genderStats.female} <span className="text-muted-foreground font-normal">({femalePct.toFixed(0)}%)</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Clean single subtle proportion bar */}
                                {totalEntries > 0 && (
                                    <div className="pt-2">
                                        <div className="h-1.5 w-full rounded-full bg-[#ded8cb]/60 dark:bg-[#1f2b40] overflow-hidden flex">
                                            <div
                                                className="h-full bg-blue-500/80 transition-all"
                                                style={{ width: `${malePct}%` }}
                                                title={`Male: ${malePct.toFixed(0)}%`}
                                            />
                                            <div
                                                className="h-full bg-pink-500/80 transition-all"
                                                style={{ width: `${femalePct}%` }}
                                                title={`Female: ${femalePct.toFixed(0)}%`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Dojos - Clean & Minimalist */}
                <Card className="col-span-3 border border-[#ded8cb] bg-white shadow-xs dark:border-[#1f2b40] dark:bg-[#111a2b]">
                    <CardHeader className="pb-3 border-b border-[#ded8cb]/80 dark:border-[#1f2b40]">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" /> Top Dojos
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {distinctDojosCount} {distinctDojosCount === 1 ? 'dojo' : 'dojos'} participating
                        </p>
                    </CardHeader>
                    <CardContent className="pt-3">
                        <div className="space-y-2">
                            {topDojos.length > 0 ? topDojos.map(([name, count], i) => (
                                <div key={name} className="flex items-center justify-between text-xs py-1 border-b border-[#ded8cb]/40 dark:border-[#1f2b40]/40 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-muted-foreground font-mono text-[11px] w-4">{i + 1}.</span>
                                        <span className="font-medium text-foreground truncate">{name}</span>
                                    </div>
                                    <span className="font-semibold text-foreground ml-2 shrink-0">{count} {count === 1 ? 'entry' : 'entries'}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-muted-foreground py-4 text-center">No dojo entries recorded yet.</p>
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
