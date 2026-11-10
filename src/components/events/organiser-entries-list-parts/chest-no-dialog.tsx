'use client'

// Assign chest number dialog — moved verbatim from organiser-entries-list.tsx.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserChestNoDialog({ vm }: { vm: OrganiserEntriesListVM }) {
    const { handleSaveChestNo, isActionPending, chestDialogOpen, setChestDialogOpen, targetEntryForChest, chestInputValue, setChestInputValue } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* 4. ASSIGN CHEST NUMBER DIALOG                                             */}
            {/* ========================================================================= */}
            <Dialog open={chestDialogOpen} onOpenChange={setChestDialogOpen}>
                <DialogContent className="sm:max-w-xs bg-card border-border text-foreground rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground">
                            Assign Chest Number
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Athlete: <b className="text-foreground">{targetEntryForChest?.student_name}</b>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            type="number"
                            placeholder="e.g. 12"
                            value={chestInputValue}
                            onChange={(e) => setChestInputValue(e.target.value)}
                            className="bg-background dark:bg-card border-border text-primary font-bold text-center text-xl h-12 rounded-xl focus:border-primary"
                        />
                        <p className="text-[11px] text-muted-foreground text-center mt-2">
                            Leave empty or clear to unassign.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setChestDialogOpen(false)}
                            className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isActionPending}
                            onClick={handleSaveChestNo}
                            className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-[#26bfa2] text-white dark:text-primary-foreground font-bold rounded-xl text-xs"
                        >
                            {isActionPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            Save Chest #
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
