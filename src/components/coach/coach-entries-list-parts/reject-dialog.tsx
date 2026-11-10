'use client'

// "Remove from this event" confirmation + "Send back to fix" note dialog.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachRejectDialog({ vm }: { vm: CoachEntriesListVM }) {
    const {
        handleConfirmReject, rejectDialogOpen, setRejectDialogOpen, entryToReject, setEntryToReject, isRejecting,
        sendBackEntry, setSendBackEntry, sendBackNote, setSendBackNote, isSendingBack, handleConfirmSendBack,
    } = vm
    return (
        <>
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Remove from this event?</DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            <strong className="text-foreground">{entryToReject?.students?.name || 'This athlete'}</strong> will be taken off
                            your list for this event. The athlete stays in your dojo.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            className="min-h-12 text-base"
                            onClick={() => {
                                setRejectDialogOpen(false)
                                setEntryToReject(null)
                            }}
                        >
                            Keep it
                        </Button>
                        <Button variant="destructive" className="min-h-12 text-base" onClick={handleConfirmReject} disabled={isRejecting}>
                            {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sendBackEntry} onOpenChange={(o) => !o && setSendBackEntry(null)}>
                <DialogContent className="max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Send back to fix</DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            The parent of <strong className="text-foreground">{sendBackEntry?.students?.name || 'this athlete'}</strong> will
                            see your note, fix it, and send it again.
                        </DialogDescription>
                    </DialogHeader>
                    <label className="mt-2 flex flex-col gap-2 text-base font-semibold">
                        What should they fix?
                        <textarea
                            value={sendBackNote}
                            onChange={(e) => setSendBackNote(e.target.value)}
                            rows={3}
                            placeholder="e.g. Please upload a photo without a cap."
                            className="rounded-lg border border-input bg-background px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </label>
                    <DialogFooter className="mt-4 gap-2 sm:gap-2">
                        <Button variant="outline" className="min-h-12 text-base" onClick={() => setSendBackEntry(null)}>
                            Cancel
                        </Button>
                        <Button className="min-h-12 text-base" onClick={handleConfirmSendBack} disabled={isSendingBack}>
                            {isSendingBack ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Send back
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
