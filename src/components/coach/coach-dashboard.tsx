'use client'

import { CoachOverview } from "./coach-overview"
import { CoachEntriesList } from "./coach-entries-list"
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
}

export function CoachDashboard({ event, eventType, stats, entries, students, eventDays, dojos, isPastEvent = false, isRegistrationClosed = false }: CoachDashboardProps) {
    const existingStudentIds = useMemo(() => new Set(entries.map(e => e.student_id)), [entries])

    const [currentStatus, setCurrentStatus] = useState<string>('pending_submission')
    const [addStudentOpen, setAddStudentOpen] = useState(false)
    const entriesRef = useRef<HTMLDivElement | null>(null)

    const selectStatus = useCallback((nextStatus: string) => {
        setCurrentStatus(nextStatus)
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
                        <div className="flex items-center gap-2">
                            {!isPastEvent && !isRegistrationClosed && (
                                <Button
                                    onClick={() => setAddStudentOpen(true)}
                                    className="gap-2 font-semibold shadow-sm rounded-xl"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Add Student
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CoachOverview stats={stats} entries={entries} onSelectStatus={selectStatus} />

            <div ref={entriesRef} className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">Entries</h3>
                        <p className="text-xs text-muted-foreground">Filter, review, and manage your team athletes.</p>
                    </div>
                    {stats.approved > 0 && (
                        <Link href={`/dashboard/entries/${event.id}/print`} target="_blank">
                            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/5">
                                <Printer className="h-4 w-4" />
                                Print Team Cards ({stats.approved})
                            </Button>
                        </Link>
                    )}
                </div>
                <CoachEntriesList
                    entries={entries}
                    eventDays={eventDays}
                    dojos={dojos}
                    eventType={eventType}
                    statusPreset={currentStatus}
                    onStatusChange={setCurrentStatus}
                    isReadOnly={isPastEvent}
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
