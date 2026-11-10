'use client'

import { formatDateStable, weekdayName } from '@/lib/date'
import React, { useState, useTransition } from 'react'
import { Calendar, Check, ChevronDown, Loader2 } from 'lucide-react'
import { updateParentEntryDay } from '@/app/athlete/entry-actions'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface EventDayItem {
    id: string
    date: string
    name: string
}

interface EntryDaySelectorProps {
    entryId: string
    currentEventDayId?: string | null
    currentEventDayName?: string | null
    currentEventDayDate?: string | null
    eventDays: EventDayItem[]
    isEditable?: boolean
}

export function EntryDaySelector({
    entryId,
    currentEventDayId,
    currentEventDayName,
    currentEventDayDate,
    eventDays = [],
    isEditable = false,
}: EntryDaySelectorProps) {
    const [open, setOpen] = useState(false)
    const [selectedDayId, setSelectedDayId] = useState<string | null>(currentEventDayId || null)
    const [isPending, startTransition] = useTransition()

    // Find current day display info
    const matchedDay = eventDays.find((d) => d.id === (selectedDayId || currentEventDayId))
    const displayName = matchedDay?.name || currentEventDayName || (eventDays.length > 0 ? eventDays[0].name : 'All Days')
    const displayDate = matchedDay?.date || currentEventDayDate

    const formatDayDate = (d?: string | null) => {
        if (!d) return ''
        const out = formatDateStable(d)
        const wd = weekdayName(d)
        return wd ? `${out}, ${wd}` : out
    }

    const handleSave = () => {
        if (!selectedDayId) return

        startTransition(async () => {
            const res = await updateParentEntryDay(entryId, selectedDayId)
            if (res?.error) {
                toast.error(res.error)
            } else {
                toast.success('Participation day updated successfully!')
                setOpen(false)
            }
        })
    }

    return (
        <>
            <div className="flex justify-between items-baseline gap-3.5 py-3">
                <span className="text-[14px] text-muted-foreground shrink-0 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Day</span>
                </span>

                <div className="flex items-center gap-2">
                    <b className="text-[15.5px] font-semibold text-right break-words text-foreground">
                        {displayName}
                        {displayDate && (
                            <span className="text-xs font-normal text-muted-foreground ml-1.5">
                                ({formatDayDate(displayDate)})
                            </span>
                        )}
                    </b>

                    {isEditable && eventDays.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer ml-1"
                        >
                            Change
                        </button>
                    )}
                </div>
            </div>

            {/* Change Day Dialog */}
            {isEditable && eventDays.length > 1 && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-md rounded-2xl bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                <span>Choose the day</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Select which tournament day the athlete will participate in.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2.5 my-3">
                            {eventDays.map((day) => {
                                const isSelected = selectedDayId === day.id

                                return (
                                    <div
                                        key={day.id}
                                        onClick={() => setSelectedDayId(day.id)}
                                        className={`rounded-xl border p-3.5 flex items-center justify-between cursor-pointer transition select-none ${
                                            isSelected
                                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                                                : 'border-border bg-card hover:border-primary/40'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                {day.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {formatDayDate(day.date)}
                                            </p>
                                        </div>

                                        <div
                                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                    ? 'border-primary bg-primary dark:border-primary dark:bg-primary text-white dark:text-primary-foreground'
                                                    : 'border-muted-foreground/30'
                                            }`}
                                        >
                                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={isPending}
                                className="rounded-xl border-border"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isPending || !selectedDayId}
                                className="rounded-xl bg-primary hover:bg-primary/90 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground font-semibold"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                        Saving...
                                    </>
                                ) : (
                                    'Update Day'
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
