'use client'

import { CoachOverview } from "./coach-overview"
import { CoachEntriesList, normalizeCoachStatus } from "./coach-entries-list"
import { CoachAddStudentDialog } from "./coach-add-student-dialog"
import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RegistrationDeadline } from "@/components/events/registration-deadline"
import { formatDateRangeStable } from "@/lib/date"

interface CoachDashboardProps {
    event: any
    eventType?: string | null
    stats: any
    entries: any[]
    students: any[]
    eventDays: any[]
    dojos: any[]
    isPastEvent?: boolean
    isRegistrationClosed?: boolean
    initialStatus?: string
}

export function CoachDashboard({
    event,
    eventType,
    stats,
    entries,
    students,
    eventDays,
    dojos,
    isPastEvent = false,
    isRegistrationClosed = false,
    initialStatus,
}: CoachDashboardProps) {
    const existingStudentIds = useMemo(() => new Set(entries.map(e => e.student_id)), [entries])

    // No ?status= and nothing waiting for the coach → open on "All" instead of an empty list.
    const [currentStatus, setCurrentStatus] = useState<string>(() =>
        !initialStatus && !entries.some((e) => e.status === 'draft' || e.status === 'pending_coach')
            ? 'all'
            : normalizeCoachStatus(initialStatus)
    )
    const [addStudentOpen, setAddStudentOpen] = useState(false)
    const entriesRef = useRef<HTMLDivElement | null>(null)

    const selectStatus = useCallback((nextStatus: string) => {
        const mapped = normalizeCoachStatus(nextStatus)
        setCurrentStatus(mapped)
        // Jump user straight to the entries table.
        entriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])



    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
                            {isPastEvent && (
                                <span className="rounded-full border border-black/10 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:border-white/10">
                                    Event Ended
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-base text-muted-foreground">
                            {formatDateRangeStable(event.start_date, event.end_date)}
                            {event.location ? ` · ${event.location}` : ''}
                            {isPastEvent ? ' · This event has ended' : ''}
                        </p>
                        <RegistrationDeadline event={event} className="mt-1" />
                    </div>
                </div>
            </div>

            <CoachOverview stats={stats} entries={entries} activeStatus={currentStatus} onSelectStatus={selectStatus} />

            <div ref={entriesRef}>
                <CoachEntriesList
                    entries={entries}
                    eventDays={eventDays}
                    dojos={dojos}
                    eventType={eventType}
                    statusPreset={currentStatus}
                    onStatusChange={setCurrentStatus}
                    isReadOnly={isPastEvent}
                    isRegistrationClosed={isRegistrationClosed}
                    eventId={event.id}
                    approvedCount={stats.approved}
                    onAddStudent={() => setAddStudentOpen(true)}
                />
            </div>

            {!isPastEvent && (
                <CoachAddStudentDialog
                    open={addStudentOpen}
                    onOpenChange={setAddStudentOpen}
                    event={event}
                    eventType={eventType}
                    eventDays={eventDays}
                    dojos={dojos}
                    students={students}
                    existingStudentIds={existingStudentIds}
                />
            )}
        </div>
    )
}
