'use client'

// Dialog header + mode switcher — moved verbatim from coach-add-student-dialog.tsx.

import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Users } from 'lucide-react'
import { AthleteIcon } from '@/components/ui/athlete-icon'
import type { CoachAddStudentDialogVM } from './use-coach-add-student-dialog'

export function AddStudentHeader({ vm }: { vm: CoachAddStudentDialogVM }) {
    const { event, availableRosterStudents, mode, setMode, setSelectedStudentId, successResult } = vm
    return (
        <>
                {/* ── Header ── */}
                <div className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-muted/30 via-background to-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1.5 shadow-xs">
                            <AthleteIcon size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                    Athlete Registration
                                </DialogTitle>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                    Direct Entry
                                </span>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Enroll an athlete into <strong className="text-foreground">{event.title}</strong>
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    {!successResult && availableRosterStudents.length > 0 && (
                        <div className="flex items-center p-1 bg-muted/60 border border-border/70 rounded-md">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('manual')
                                    setSelectedStudentId('')
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    mode === 'manual'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <AthleteIcon size={16} />
                                New Athlete
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('roster')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    mode === 'roster'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Users className="h-3.5 w-3.5" />
                                Dojo Roster ({availableRosterStudents.length})
                            </button>
                        </div>
                    )}
                </div>
        </>
    )
}
