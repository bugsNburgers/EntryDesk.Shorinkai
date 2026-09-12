import { requireRole } from '@/lib/auth/require-role'
import { notFound } from 'next/navigation'
import { EventSettingsForm } from '@/components/events/event-settings-form'
import { EventSharingSection } from '@/components/events/event-sharing-section'
import sql from '@/lib/db'

export default async function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { user, role } = await requireRole(['organizer', 'admin'], { redirectTo: '/dashboard' })

    const [events, collaborators, entryCountResult] = await Promise.all([
        sql<
            {
                id: string
                title: string
                location: string | null
                event_type: string
                level: string
                is_registration_open: boolean
                is_public: boolean
                organizer_id: string
                temporary_registration_closes_at: string | null
                registration_close_date: string | null
            }[]
        >`
            SELECT 
                id, 
                title, 
                location, 
                event_type, 
                level, 
                is_registration_open, 
                is_public, 
                organizer_id, 
                temporary_registration_closes_at,
                registration_close_date
            FROM events
            WHERE id = ${id}
            LIMIT 1
        `,
        sql<
            {
                user_id: string
                permission: 'read' | 'write'
                email: string
                full_name: string | null
            }[]
        >`
            SELECT 
                ec.user_id,
                ec.permission,
                u.email,
                u.full_name
            FROM event_collaborators ec
            JOIN users u ON ec.user_id = u.id
            WHERE ec.event_id = ${id}
        `,
        sql<{ count: string }[]>`
            SELECT count(*) AS count
            FROM entries
            WHERE event_id = ${id} AND (status = 'approved' OR chest_no IS NOT NULL)
        `,
    ])

    if (events.length === 0) {
        notFound()
    }

    const event = events[0]
    const isOwner = event.organizer_id === user.id
    const formattedCollaborators = collaborators.map(c => ({
        user_id: c.user_id,
        permission: c.permission,
        profiles: {
            email: c.email,
            full_name: c.full_name,
        }
    }))

    // Authorization: owner, admin, or write collaborator
    if (role !== 'admin' && !isOwner) {
        const myCollaboration = collaborators.find((c) => c.user_id === user.id)
        if (!myCollaboration || myCollaboration.permission !== 'write') {
            notFound()
        }
    }

    const entryCount = parseInt(entryCountResult[0]?.count || '0', 10)

    const eventData = {
        ...event,
        event_level: event.level,
        event_collaborators: formattedCollaborators,
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Event Settings</h2>
                <p className="text-sm text-muted-foreground">
                    Manage your event configurations, registration status, and danger zone actions.
                </p>
            </div>

            <EventSettingsForm event={eventData as any} entryCount={entryCount} />

            {isOwner && (
                <div className="pt-6">
                    <EventSharingSection event={eventData as any} collaborators={formattedCollaborators as any} />
                </div>
            )}
        </div>
    )
}
