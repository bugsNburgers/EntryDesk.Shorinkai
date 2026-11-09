'use client'

// ============================================================================
// EntryDesk — Coach Athlete Registration Modal
// Clean, focused single-column form with segmented controls, authentic belt styling,
// live computed division banner, and 1-click WhatsApp pass delivery.
// ============================================================================


import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useCoachAddStudentDialog } from './coach-add-student-dialog-parts/use-coach-add-student-dialog'
import { AddStudentHeader } from './coach-add-student-dialog-parts/header'
import { AddStudentSuccess } from './coach-add-student-dialog-parts/success-screen'
import { AddStudentAthleteSection } from './coach-add-student-dialog-parts/athlete-section'
import { AddStudentDisciplineSection } from './coach-add-student-dialog-parts/discipline-section'
import { AddStudentGuardianSection } from './coach-add-student-dialog-parts/guardian-section'
import { AddStudentFooter } from './coach-add-student-dialog-parts/footer'
import type { CoachAddStudentDialogProps } from './coach-add-student-dialog-parts/shared'

export function CoachAddStudentDialog(props: CoachAddStudentDialogProps) {
    const vm = useCoachAddStudentDialog(props)
    const { open, onOpenChange, successResult } = vm
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[94vw] sm:max-w-2xl max-h-[92vh] p-0 overflow-hidden border border-border/70 rounded-3xl shadow-2xl bg-background/95 backdrop-blur-xl flex flex-col">
                <AddStudentHeader vm={vm} />

                {/* ── Main Content Area ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {successResult ? (
                        /* ── Success Screen ── */
                        <AddStudentSuccess vm={vm} />
                    ) : (
                        /* ── Single-Column Registration Form ── */
                        <div className="space-y-6">
                            <AddStudentAthleteSection vm={vm} />

                            <AddStudentDisciplineSection vm={vm} />

                            <AddStudentGuardianSection vm={vm} />
                        </div>
                    )}
                </div>

                <AddStudentFooter vm={vm} />
            </DialogContent>
        </Dialog>
    )
}
