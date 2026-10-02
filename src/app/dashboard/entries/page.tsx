import { redirect } from 'next/navigation'

export default function EntriesRedirectPage() {
    redirect('/dashboard/events')
}
