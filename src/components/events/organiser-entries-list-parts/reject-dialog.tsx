'use client'

// Reject dialog — moved verbatim from organiser-entries-list.tsx.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserRejectDialog({ vm }: { vm: OrganiserEntriesListVM }) {
    const { entries, handleConfirmReject, selectedIds, isActionPending, rejectDialogOpen, setRejectDialogOpen, targetEntryForReject, rejectReason, setRejectReason, isBulkReject } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* 3. REJECT DIALOG MODAL                                                    */}
            {/* ========================================================================= */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            {isBulkReject
                                ? `Don't accept ${selectedIds.size} ticked entries?`
                                : `Don't accept ${targetEntryForReject?.student_name}?`}
                        </DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground">
                            The coach and parent will see this. Pick or write a reason.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Quick Reason Chips */}
                        <div className="space-y-1.5">
                            <span className="text-sm font-semibold text-muted-foreground">
                                Common reasons
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Category full',
                                    'Weight too high',
                                    'Belt does not match',
                                    'Registration fee pending',
                                    'Details missing',
                                ].map((chip) => (
                                    <button
                                        key={chip}
                                        type="button"
                                        onClick={() => setRejectReason(chip)}
                                        className={`text-sm min-h-10 px-3 rounded-lg border transition cursor-pointer ${
                                            rejectReason === chip
                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/50'
                                                : 'bg-background dark:bg-muted text-muted-foreground border-border hover:text-foreground'
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Reason Input */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Specific Note / Reason
                            </span>
                            <Input
                                placeholder="Why? The coach and parent will see this."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="bg-card border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setRejectDialogOpen(false)}
                            className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isActionPending}
                            onClick={handleConfirmReject}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                        >
                            {isActionPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            ) : null}
                            Don&apos;t accept
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
