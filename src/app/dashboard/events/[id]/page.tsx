import { requireRole } from '@/lib/auth/require-role'
import { Button } from "@/components/ui/button"
import { ChevronRight, Printer, Settings } from "lucide-react"
import { ExportEntries } from "@/components/events/export-entries"
import { toOrganiserTab } from "@/components/events/organiser-entries-list-parts/tabs"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import sql from '@/lib/db'
import { OrganiserEntriesList } from "@/components/events/organiser-entries-list"

export default async function EventOverviewPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ status?: string }>
}) {
    const { id } = await params
    const { status } = await searchParams
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })

    // Security check: owner, a collaborator on this event, or admin (same rule the old entries page used)
    const eventRows = await sql<{ id: string; title: string }[]>`
        SELECT id, title FROM events
        WHERE id = ${id}
          ${role !== 'admin' ? sql`AND (organizer_id = ${user.id} OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_id = ${id} AND user_id = ${user.id}))` : sql``}
        LIMIT 1
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
                coach_avatar: string | null
                student_name: string
                student_gender: string
                student_rank: string | null
                student_weight: number | null
                student_dob: string | null
                student_school_or_city: string | null
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
                p.avatar_url AS coach_avatar,
                s.id AS student_id,
                COALESCE(e.snap_name, s.name) AS student_name,
                COALESCE(e.snap_gender, s.gender) AS student_gender,
                COALESCE(e.snap_rank, s.rank) AS student_rank,
                COALESCE(e.declared_weight_kg, s.weight) AS student_weight,
                COALESCE(e.snap_dob, s.date_of_birth)::text AS student_dob,
                COALESCE(e.snap_school_or_city, s.school_or_city) AS student_school_or_city,
                s.photo_url AS student_photo,
                s.registration_no AS student_registration_no,
                d.id AS dojo_id,
                d.name AS dojo_name,
                COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
                ed.name AS event_day_name
            FROM entries e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN event_days ed ON e.event_day_id = ed.id
            JOIN users p ON e.coach_id = p.id
            WHERE e.event_id = ${id}
              AND e.status IN ('submitted', 'approved', 'rejected')
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

    const numbers: Array<[string, string | number]> = [
        ['athletes', totalEntries],
        [distinctDojosCount === 1 ? 'dojo' : 'dojos', distinctDojosCount],
        ['Kata', totalKata],
        ['Kumite', totalKumite],
        ['Team events', teamKata + teamKumite],
        ['boys · girls', `${genderStats.male} · ${genderStats.female}`],
    ]

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                {statusStats.approved > 0 && (
                    <Button asChild className="min-h-12 gap-2 text-base">
                        <Link href={`/dashboard/events/${id}/print`} target="_blank">
                            <Printer className="h-5 w-5" aria-hidden="true" />
                            Print ID cards ({statusStats.approved})
                        </Link>
                    </Button>
                )}
                <ExportEntries eventId={id} searchParams={{}} />
                <Button asChild variant="outline" className="min-h-12 gap-2 text-base">
                    <Link href={`/dashboard/events/${id}/settings`}>
                        <Settings className="h-5 w-5" aria-hidden="true" />
                        Event settings
                    </Link>
                </Button>
            </div>

            {pendingApprovals > 0 && (
                <Link
                    href={`/dashboard/events/${id}/approvals?status=pending`}
                    className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--status-pending)]/40 bg-[var(--status-pending-bg)] px-5 py-3"
                >
                    <span className="flex-1 text-base font-semibold">
                        {pendingApprovals === 1 ? '1 coach wants to join this event' : `${pendingApprovals} coaches want to join this event`}
                    </span>
                    <span className="text-[15px] font-semibold">See requests</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
            )}

            <section aria-label="Numbers" className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border bg-card px-5 py-4">
                {numbers.map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                        <span className="text-xl font-bold tabular-nums">{value}</span>
                        <span className="text-sm text-muted-foreground">{label}</span>
                    </div>
                ))}
                <span className="text-sm text-muted-foreground sm:ml-auto">
                    {approvedCoaches} {approvedCoaches === 1 ? 'coach' : 'coaches'} approved
                    {topDojos[0] ? ` · Largest dojo: ${topDojos[0][0]} (${topDojos[0][1]})` : ''}
                </span>
            </section>

            <OrganiserEntriesList
                entries={entries}
                eventId={id}
                eventTitle={eventRows[0].title}
                initialTab={toOrganiserTab(status)}
            />
        </div>
    )
}
