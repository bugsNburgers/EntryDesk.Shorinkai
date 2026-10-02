import { redirect } from 'next/navigation'

export default async function EventEntriesRedirectPage({
    params,
}: {
    params: Promise<{ eventId: string }>
}) {
    const { eventId } = await params
    redirect(`/dashboard/events/${eventId}/entries`)
}
