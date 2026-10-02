'use client'

import { CoachOverview } from "./coach-overview"
import { CoachEntriesList, normalizeCoachStatus } from "./coach-entries-list"
import { CoachAddStudentDialog } from "./coach-add-student-dialog"
import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RegistrationDeadline } from "@/components/events/registration-deadline"
import Link from "next/link"
import { Printer, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

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

    const [currentStatus, setCurrentStatus] = useState<string>(() => normalizeCoachStatus(initialStatus))
    const [addStudentOpen, setAddStudentOpen] = useState(false)
    const entriesRef = useRef<HTMLDivElement | null>(null)

    const selectStatus = useCallback((nextStatus: string) => {
        const mapped = normalizeCoachStatus(nextStatus)
        setCurrentStatus(mapped)
        // Jump user straight to the entries table.
        entriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])



    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
                            {isPastEvent && (
                                <span className="rounded-full border border-black/10 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:border-white/10">
                                    Event Ended
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground">
                            {isPastEvent
                                ? "This event has ended. You can view entries and details."
                                : isRegistrationClosed
                                    ? "Registration for this event has ended. You can still view entries and details."
                                    : "Manage your team's participation."}
                        </p>
                        <RegistrationDeadline event={event} className="animate-pulse-gentle mt-1.5 text-sm sm:hidden" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <RegistrationDeadline event={event} className="animate-pulse-gentle text-sm hidden sm:flex" />
                    </div>
                </div>
            </div>

            <CoachOverview stats={stats} entries={entries} onSelectStatus={selectStatus} />

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
