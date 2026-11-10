import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createOrganizerEvent, createStaff, setOrganizerEventCreation, setStaffAccess } from './actions'
import { RingFlowDownload } from './ringflow-download'

const notices: Record<string, string> = {
    'invalid-staff': 'Enter a name, Gmail address and staff role.',
    'staff-created': 'Login created. The staff member can now sign in with Google.',
    'email-exists': 'That email already has an account. Check its role and access below.',
    'reason-required': 'Enter a reason of up to 500 characters.',
    'invalid-event': 'Could not create the event. Check the organiser, title and dates.',
    'event-created': 'The event draft is ready.',
}

export default async function AdminPage({ searchParams }: {
    searchParams: Promise<{ q?: string; notice?: string; page?: string }>
}) {
    await requireRole('admin', { redirectTo: '/dashboard' })
    const { q, notice, page } = await searchParams
    const search = q?.trim().slice(0, 150) ?? ''
    const index = Math.max(1, Math.min(10000, Number.parseInt(page ?? '', 10) || 1))
    const offset = (index - 1) * 25
    const [people, athletes, organizers, events, days] = await Promise.all([
        sql<{ id: string; email: string; full_name: string | null; role: string; is_active: boolean; can_create_events: boolean }[]>`
            SELECT id, email, full_name, role, is_active, can_create_events FROM users
            WHERE concat_ws(' ', full_name, email) ILIKE ${'%' + search + '%'}
            ORDER BY email, id LIMIT 25 OFFSET ${offset}
        `,
        sql<{ id: string; name: string; registration_no: string | null; dojo_name: string }[]>`
            SELECT s.id, s.name, s.registration_no, d.name AS dojo_name
            FROM students s JOIN dojos d ON d.id = s.dojo_id
            WHERE concat_ws(' ', s.name, s.registration_no, d.name) ILIKE ${'%' + search + '%'}
            ORDER BY s.name, s.id LIMIT 25 OFFSET ${offset}
        `,
        sql<{ id: string; email: string }[]>`
            SELECT id, email FROM users WHERE role = 'organizer' AND is_active ORDER BY email
        `,
        sql<{ id: string; title: string; email: string }[]>`
            SELECT e.id, e.title, u.email FROM events e JOIN users u ON u.id = e.organizer_id
            WHERE concat_ws(' ', e.title, u.email) ILIKE ${'%' + search + '%'}
            ORDER BY e.start_date DESC, e.id LIMIT 25 OFFSET ${offset}
        `,
        sql<{ id: string; name: string; event_id: string }[]>`
            SELECT id, name, event_id FROM event_days
            WHERE event_id IN (
                SELECT e.id FROM events e JOIN users u ON u.id = e.organizer_id
                WHERE concat_ws(' ', e.title, u.email) ILIKE ${'%' + search + '%'}
                ORDER BY e.start_date DESC, e.id LIMIT 25 OFFSET ${offset}
            )
            ORDER BY date
        `,
    ])
    const pageHref = (number: number) => `/admin?q=${encodeURIComponent(search)}&page=${number}`

    return (
        <main className="mx-auto max-w-6xl space-y-8 p-6">
            <header>
                <Link className="underline" href="/dashboard">Dashboard</Link>
                <h1 className="text-3xl font-bold">EntryDesk admin</h1>
                {notice && Object.hasOwn(notices, notice) && <p role="status">{notices[notice]}</p>}
            </header>
            <div className="grid gap-6 md:grid-cols-2">
                <form action={createStaff} className="space-y-3 rounded-lg border p-4">
                    <h2 className="text-xl font-semibold">Create an organiser or coach login</h2>
                    <p>Enter their Gmail address. They can then select Sign in with Google. Organisers can manage their events immediately. Enable event creation separately.</p>
                    <label className="block">Name<Input name="name" required maxLength={150} /></label>
                    <label className="block">Gmail address<Input name="email" type="email" required maxLength={254} /></label>
                    <label className="block">Role <select name="role"><option value="organizer">Organiser</option><option value="coach">Coach</option></select></label>
                    <Button>Create login</Button>
                </form>
                <form action={createOrganizerEvent} className="space-y-3 rounded-lg border p-4">
                    <h2 className="text-xl font-semibold">Create event</h2>
                    <p>Choose who will manage the event. It starts private with registration closed.</p>
                    <label className="block">Organiser <select name="organizer_id" required defaultValue="">
                        <option value="" disabled>Select organiser</option>
                        {organizers.map((person) => <option key={person.id} value={person.id}>{person.email}</option>)}
                    </select></label>
                    <label className="block">Title<Input name="title" required maxLength={150} /></label>
                    <label className="block">Start date<Input name="start_date" type="date" required /></label>
                    <label className="block">End date<Input name="end_date" type="date" required /></label>
                    <label className="block">Type <select name="event_type"><option value="tournament">Tournament</option><option value="seminar">Seminar</option><option value="test">Test</option></select></label>
                    <Button disabled={!organizers.length}>Create event draft</Button>
                </form>
            </div>
            <form className="flex gap-2">
                <Input name="q" aria-label="Search people, athletes and events" placeholder="Search people, athletes and events" defaultValue={search} />
                <Button>Search</Button>
            </form>
            <section className="space-y-2">
                <h2 className="text-xl font-semibold">People</h2>
                {!people.length && <p>No people found.</p>}
                {people.map((person) => (
                    <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2">
                        <p>{person.full_name || person.email} · {person.email} · {person.role} · {person.is_active ? 'Access on' : 'Access off'}</p>
                        {['coach', 'organizer'].includes(person.role) && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Link className="underline" href={`/admin/support?staff=${person.id}`}>View assigned entries</Link>
                                <form action={person.role === 'organizer' ? setOrganizerEventCreation : setStaffAccess} className="flex items-center gap-2">
                                    <input type="hidden" name="id" value={person.id} />
                                    {person.role === 'organizer'
                                        ? <input type="hidden" name="enabled" value={String(!person.can_create_events)} />
                                        : <input type="hidden" name="active" value={String(!person.is_active)} />}
                                    <Input name="reason" aria-label="Reason for access change" placeholder="Reason" required maxLength={500} />
                                    <Button variant="outline">{person.role === 'organizer'
                                            ? (person.can_create_events ? 'Disable event creation' : 'Enable event creation')
                                            : (person.is_active ? 'Turn off access' : 'Turn on access')}</Button>
                                </form>
                            </div>
                        )}
                    </div>
                ))}
            </section>
            <section className="space-y-2">
                <h2 className="text-xl font-semibold">Athletes</h2>
                {!athletes.length && <p>No athletes found.</p>}
                {athletes.map((athlete) => <p key={athlete.id}>{athlete.name} · {athlete.registration_no || 'Pending number'} · {athlete.dojo_name}</p>)}
            </section>
            <section className="space-y-2">
                <h2 className="text-xl font-semibold">Events</h2>
                {!events.length && <p>No events found.</p>}
                {events.map((event) => (
                    <div key={event.id} className="space-y-1 border-b py-2">
                        <Link className="underline" href={`/dashboard/events/${event.id}/entries`}>{event.title}</Link>
                        <p>{event.email}</p>
                        <RingFlowDownload eventId={event.id} days={days.filter((day) => day.event_id === event.id)} />
                    </div>
                ))}
            </section>
            <nav className="flex gap-4" aria-label="Admin results pages">
                {index > 1 && <Link className="underline" href={pageHref(index - 1)}>Previous</Link>}
                <span>Page {index}</span>
                {[people, athletes, events].some((list) => list.length === 25) && <Link className="underline" href={pageHref(index + 1)}>Next</Link>}
            </nav>
        </main>
    )
}
