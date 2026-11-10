import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { returnEntryToCoach } from '../actions'
import type { EntryStatus } from '@/types/database'

export default async function SupportPage({ searchParams }: {
    searchParams: Promise<{ staff?: string; page?: string }>
}) {
    await requireRole('admin', { redirectTo: '/dashboard' })
    const { staff, page } = await searchParams
    if (!staff || !/^[a-f0-9-]{36}$/i.test(staff)) notFound()
    const [person] = await sql<{ email: string; role: string }[]>`
        SELECT email, role FROM users WHERE id = ${staff} AND role IN ('coach', 'organizer')
    `
    if (!person) notFound()

    const index = Math.max(1, Math.min(10000, Number.parseInt(page ?? '', 10) || 1))
    const entries = await sql<{ id: string; name: string; title: string; status: EntryStatus; generic_checked: boolean }[]>`
        SELECT e.id, COALESCE(e.snap_name, s.name) AS name, ev.title, e.status, e.generic_checked
        FROM entries e JOIN students s ON s.id = e.student_id JOIN events ev ON ev.id = e.event_id
        WHERE ${person.role === 'coach'
            ? sql`e.coach_id = ${staff}`
            : sql`ev.organizer_id = ${staff} AND e.status IN ('submitted', 'approved', 'rejected', 'correction_needed')`}
        ORDER BY e.updated_at DESC, e.id LIMIT 25 OFFSET ${(index - 1) * 25}
    `

    return (
        <main className="mx-auto max-w-5xl space-y-4 p-6">
            <Link className="underline" href="/admin">Back to admin</Link>
            <h1 className="text-2xl font-bold">Support view for {person.email}</h1>
            <p>Entries assigned to this coach or owned by this organiser. Changes are recorded under your admin account.</p>
            {!entries.length && <p>No entries on this page.</p>}
            {entries.map((entry) => (
                <div key={entry.id} className="space-y-2 border-b py-3">
                    <p>{entry.name} · {entry.title} · <StatusBadge status={entry.status} /> · {entry.generic_checked ? 'Paid' : 'Payment unmarked'}</p>
                    {entry.status === 'submitted' && (
                        <form action={returnEntryToCoach} className="flex flex-wrap gap-2">
                            <input type="hidden" name="entry_id" value={entry.id} />
                            <Input className="w-auto" name="reason" aria-label="Reason for returning entry" placeholder="Reason" required maxLength={500} />
                            <Button variant="outline">Return to coach as admin</Button>
                        </form>
                    )}
                </div>
            ))}
            <nav className="flex gap-4" aria-label="Support results pages">
                {index > 1 && <Link href={`?staff=${staff}&page=${index - 1}`}>Previous</Link>}
                {entries.length === 25 && <Link href={`?staff=${staff}&page=${index + 1}`}>Next</Link>}
            </nav>
        </main>
    )
}
