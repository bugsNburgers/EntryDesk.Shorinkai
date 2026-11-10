'use client'

// Dialog footer — moved verbatim from coach-add-student-dialog.tsx.

import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import type { CoachAddStudentDialogVM } from './use-coach-add-student-dialog'

export function AddStudentFooter({ vm }: { vm: CoachAddStudentDialogVM }) {
    const { onOpenChange, event, handleSubmit, isSubmitting, successResult } = vm
    return (
        <>
                {/* ── Footer ── */}
                {!successResult && (
                    <div className="p-4 px-6 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                        <p className="text-[11px] text-muted-foreground hidden sm:block">
                            Athlete will be enrolled into <strong className="text-foreground">{event.title}</strong>
                        </p>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none h-10 rounded-md text-xs text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none h-10 rounded-md font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md shadow-primary/20 text-xs sm:text-sm"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Save entry for payment review
                            </Button>
                        </div>
                    </div>
                )}
        </>
    )
}
