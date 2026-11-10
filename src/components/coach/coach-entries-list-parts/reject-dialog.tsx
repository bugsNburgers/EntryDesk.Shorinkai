'use client'

// Reject entry confirmation modal — moved verbatim from coach-entries-list.tsx.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { MenuRejectSvg } from './shared'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachRejectDialog({ vm }: { vm: CoachEntriesListVM }) {
    const { handleConfirmReject, rejectDialogOpen, setRejectDialogOpen, entryToReject, setEntryToReject, isRejecting } = vm
    return (
        <>
            {/* Reject Entry Confirmation Modal */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-2xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                            <MenuRejectSvg />
                            Reject Tournament Entry
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Are you sure you want to reject the entry for{' '}
                            <strong className="text-foreground">
                                {entryToReject?.students?.name || 'this athlete'}
                            </strong>
                            ? This athlete will be removed from your tournament entry list.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectDialogOpen(false)
                                setEntryToReject(null)
                            }}
                            className="h-9 px-4 rounded-xl border-border bg-background dark:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmReject}
                            disabled={isRejecting}
                            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-xs"
                        >
                            {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
