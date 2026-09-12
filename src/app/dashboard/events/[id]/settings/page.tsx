import { requireRole } from '@/lib/auth/require-role'
import { notFound } from 'next/navigation'
import { EventSettingsForm } from '@/components/events/event-settings-form'
import sql from '@/lib/db'

export default async function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })

    const events = await sql<
        {
            id: string
            title: string
            location: string | null
            is_registration_open: boolean
            organizer_id: string
        }[]
    >`
        SELECT id, title, location, is_registration_open, organizer_id
        FROM events
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
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Event Settings</h2>
                <p className="text-sm text-muted-foreground">
                    Manage your event configurations, registration status, and danger zone actions.
                </p>
            </div>

            <EventSettingsForm event={event} />
        </div>
    )
}
