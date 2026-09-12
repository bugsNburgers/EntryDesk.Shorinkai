import { requireRole } from '@/lib/auth/require-role'
import { notFound } from 'next/navigation'
import sql from '@/lib/db'
import type { Event } from '@/types/database'

export default async function EventLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })

    const events = await sql<Event[]>`
        SELECT * FROM events
        WHERE id = ${id}
          ${role !== 'admin' ? sql`AND organizer_id = ${user.id}` : sql``}
        LIMIT 1
    `

    if (events.length === 0) {
        notFound()
    }

    const event = events[0]

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
                    <div className="flex text-sm text-muted-foreground gap-4">
                        <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        <span className="capitalize">{event.event_type}</span>
                    </div>
                </div>
            </div>

            {children}
        </div>
    )
}
