'use client'

import React, { useState, useTransition } from 'react'
import { Calendar, Check, ChevronDown, Loader2 } from 'lucide-react'
import { updateParentEntryDay } from '@/app/parent/entry-actions'
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
        const dateObj = new Date(d)
        if (isNaN(dateObj.getTime())) return d
        return dateObj.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        })
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
                <span className="text-[14px] text-[#57534e] dark:text-[#8a99ab] shrink-0 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#0d9488] dark:text-[#2dd4b4]" />
                    <span>Participation Day</span>
                </span>

                <div className="flex items-center gap-2">
                    <b className="text-[15.5px] font-semibold text-right break-words text-[#1c1917] dark:text-[#e8eef5]">
                        {displayName}
                        {displayDate && (
                            <span className="text-xs font-normal text-[#57534e] dark:text-[#8a99ab] ml-1.5">
                                ({formatDayDate(displayDate)})
                            </span>
                        )}
                    </b>

                    {isEditable && eventDays.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            className="text-xs font-semibold text-[#0d9488] dark:text-[#2dd4b4] hover:underline cursor-pointer ml-1"
                        >
                            Change
                        </button>
                    )}
                </div>
            </div>

            {/* Change Day Dialog */}
            {isEditable && eventDays.length > 1 && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-[#1c1917] dark:text-[#e8eef5] flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-[#0d9488] dark:text-[#2dd4b4]" />
                                <span>Choose Participation Day</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-[#57534e] dark:text-[#8a99ab]">
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
                                                ? 'border-[#0d9488] dark:border-[#2dd4b4] ring-2 ring-[#0d9488]/20 bg-[#0d9488]/5 dark:bg-[#2dd4b4]/10'
                                                : 'border-[#ded8cb] dark:border-[#1f2b40] bg-white dark:bg-[#111a2b] hover:border-[#0d9488]/40'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-[#1c1917] dark:text-[#e8eef5]">
                                                {day.name}
                                            </p>
                                            <p className="text-xs text-[#57534e] dark:text-[#8a99ab] mt-0.5">
                                                {formatDayDate(day.date)}
                                            </p>
                                        </div>

                                        <div
                                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                    ? 'border-[#0d9488] bg-[#0d9488] dark:border-[#2dd4b4] dark:bg-[#2dd4b4] text-white dark:text-[#04231e]'
                                                    : 'border-muted-foreground/30'
                                            }`}
                                        >
                                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ded8cb] dark:border-[#1f2b40]">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={isPending}
                                className="rounded-xl border-[#ded8cb] dark:border-[#1f2b40]"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isPending || !selectedDayId}
                                className="rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] dark:text-[#04231e] font-semibold"
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
