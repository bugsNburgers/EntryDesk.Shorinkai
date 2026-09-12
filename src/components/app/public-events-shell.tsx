'use client'

import { useEffect, useState } from 'react'
import { PublicEventsSection } from '@/components/app/public-events-section'

type PublicEvent = {
    id: string
    title: string
    event_type: string | null
    event_level?: string | null
    start_date: string
    end_date?: string | null
    location: string | null
    description: string | null
    registration_close_date?: string | null
    is_registration_open?: boolean | null
}

type PublicEventsResponse = {
    events: PublicEvent[]
}

export function PublicEventsShell() {
    const [events, setEvents] = useState<PublicEvent[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const controller = new AbortController()

        const loadEvents = async () => {
            try {
                const response = await fetch('/api/public-events', {
                    signal: controller.signal,
                })

                if (!response.ok) {
                    throw new Error(`Failed to fetch public events: ${response.status}`)
                }

                const payload = (await response.json()) as PublicEventsResponse
                setEvents(payload.events ?? [])
            } catch {
                if (!controller.signal.aborted) {
                    setEvents([])
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            }
        }

        loadEvents()

        return () => controller.abort()
    }, [])

    if (isLoading) {
        return <PublicEventsSectionSkeleton />
    }

    return <PublicEventsSection events={events} todayIso={new Date().toISOString().slice(0, 10)} />
}

function PublicEventsSectionSkeleton() {
    return (
        <div className="space-y-12" aria-hidden>
            <section>
                <div className="mb-8 animate-pulse space-y-3 text-center">
                    <div className="mx-auto h-10 w-64 rounded-md bg-muted/45" />
                    <div className="mx-auto h-5 w-full max-w-xl rounded-md bg-muted/35" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={`upcoming-${index}`} className="h-56 rounded-xl border border-border/50 bg-muted/20" />
                    ))}
                </div>
            </section>

            <section>
                <div className="mb-8 animate-pulse space-y-3 text-center">
                    <div className="mx-auto h-10 w-56 rounded-md bg-muted/45" />
                    <div className="mx-auto h-5 w-full max-w-lg rounded-md bg-muted/35" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={`past-${index}`} className="h-56 rounded-xl border border-border/50 bg-muted/20" />
                    ))}
                </div>
            </section>
        </div>
    )
}
