'use client'

// Registration complete screen — moved verbatim from coach-add-student-dialog.tsx.

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, CheckCircle2, Share2, Copy, Check } from 'lucide-react'
import type { CoachAddStudentDialogVM } from './use-coach-add-student-dialog'

export function AddStudentSuccess({ vm }: { vm: CoachAddStudentDialogVM }) {
    const { onOpenChange, event, resetForm, statusUrl, whatsappShareUrl, handleCopyLink, copied } = vm
    // Only rendered when successResult is set (see CoachAddStudentDialog).
    const successResult = vm.successResult!
    return (
        <>
                        <div className="py-6 max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="h-9 w-9" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black tracking-tight text-foreground">
                                    Registration Complete!
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-foreground">{successResult.studentName}</strong> has been enrolled in <strong className="text-foreground">{event.title}</strong>.
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 text-left space-y-2.5 shadow-sm">
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Assigned Division</span>
                                    <span className="font-bold text-foreground">{successResult.categoryName}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Entry Status</span>
                                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {successResult.status === 'submitted' ? 'Submitted to Organizer' : 'Saved as Draft'}
                                    </span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Parent Credential & Live Pass Link
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={statusUrl}
                                            className="text-xs font-mono bg-muted/40 h-9 rounded-md"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyLink}
                                            className="h-9 rounded-md shrink-0 gap-1.5 font-medium"
                                        >
                                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Button */}
                            <div className="space-y-2">
                                <a
                                    href={whatsappShareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <Button className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold gap-2 h-11 rounded-md shadow-lg shadow-emerald-500/15 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                                        <Share2 className="h-4 w-4" />
                                        Send Digital Pass via WhatsApp
                                    </Button>
                                </a>
                                <p className="text-[11px] text-muted-foreground">
                                    Parents receive their child's digital credential card & tournament check-in pass.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-md h-11 font-medium"
                                    onClick={resetForm}
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add Another Athlete
                                </Button>
                                <Button
                                    className="flex-1 rounded-md h-11 font-bold"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
        </>
    )
}
