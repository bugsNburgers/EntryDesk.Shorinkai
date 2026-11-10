'use client'

// Search bar and action buttons — moved verbatim from coach-entries-list.tsx.

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Search, X, Printer } from 'lucide-react'
import { AthleteIcon } from '@/components/ui/athlete-icon'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachEntriesToolbar({ vm }: { vm: CoachEntriesListVM }) {
    const { isReadOnly, isRegistrationClosed, approvedCount, onAddStudent, eventId, searchQuery, setSearchQuery } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* 1. SEARCH BAR & ACTION BUTTONS (IN LINE)                                  */}
            {/* ========================================================================= */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Single white search box (stretches to fill available space until buttons) */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search student, dojo, belt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary shadow-xs transition"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground p-1 cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Print Team Cards & Add Student to the right side of print */}
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    {approvedCount && approvedCount > 0 && eventId && (
                        <Link href={`/dashboard/events/${eventId}/print`} target="_blank" className="flex-1 sm:flex-initial">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto h-11 px-4 gap-1.5 rounded-xl font-semibold border-primary/40 text-primary hover:bg-primary/5 bg-card shadow-xs cursor-pointer"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print Team Cards ({approvedCount})</span>
                            </Button>
                        </Link>
                    )}

                    {onAddStudent && !isReadOnly && !isRegistrationClosed && (
                        <Button
                            onClick={onAddStudent}
                            size="sm"
                            className="flex-1 sm:flex-initial h-11 px-4 gap-2 font-semibold shadow-xs rounded-xl bg-primary hover:bg-primary/90 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground cursor-pointer"
                        >
                            <AthleteIcon size={16} className="shrink-0" />
                            <span>Add Student</span>
                        </Button>
                    )}
                </div>
            </div>
        </>
    )
}
