'use client'

// Fixed selection footer — moved verbatim from organiser-entries-list.tsx.

import { Loader2, Check, X } from 'lucide-react'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserEntriesFooter({ vm }: { vm: OrganiserEntriesListVM }) {
    const { counts, handleOpenRejectBulk, handleBulkApprove, handleApproveAllPending, selectedIds, setSelectedIds, isActionPending } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* FIXED FOOTER (Desktop & Mobile) — Fixed above mobile nav on mobile        */}
            {/* ========================================================================= */}
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 dark:bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-12px_28px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_30px_rgba(10,18,32,0.95)]">
                {/* Desktop View */}
                <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-3.5 items-center justify-between">
                    {selectedIds.size > 0 ? (
                        <>
                            <div className="text-[15px] text-foreground">
                                <b className="font-bold">{selectedIds.size} ticked</b> &nbsp;·&nbsp;
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-primary font-semibold cursor-pointer hover:underline ml-1"
                                >
                                    Deselect all
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkApprove}
                                    disabled={isActionPending}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                    Accept {selectedIds.size} ticked
                                </button>
                                <button
                                    onClick={handleOpenRejectBulk}
                                    disabled={isActionPending}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] border-[1.5px] border-rose-400 dark:border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition disabled:opacity-40 cursor-pointer"
                                >
                                    <X className="h-4 w-4 mr-1 inline" />
                                    Don&apos;t accept {selectedIds.size} ticked
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[14.5px] text-muted-foreground">
                                <b className="text-foreground font-bold">{counts.pending}</b> to accept &nbsp;·&nbsp; {counts.approved} accepted &nbsp;·&nbsp; {counts.rejected} not accepted
                            </div>
                            <button
                                onClick={handleApproveAllPending}
                                disabled={isActionPending || counts.pending === 0}
                                className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Accept all {counts.pending}
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile View */}
                <div className="block lg:hidden px-4 py-3 space-y-2">
                    {selectedIds.size > 0 ? (
                        <>
                            <div className="flex justify-between items-center text-[14px] text-foreground">
                                <b className="font-bold">{selectedIds.size} ticked</b>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-primary font-semibold cursor-pointer hover:underline"
                                >
                                    Deselect all
                                </button>
                            </div>
                            <button
                                onClick={handleBulkApprove}
                                disabled={isActionPending}
                                className="h-[48px] w-full text-[15px] font-bold bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Accept {selectedIds.size} ticked
                            </button>
                            <button
                                onClick={handleOpenRejectBulk}
                                disabled={isActionPending}
                                className="h-[42px] w-full text-[14px] font-bold border-[1.5px] border-rose-400 dark:border-rose-500/50 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition disabled:opacity-40 cursor-pointer"
                            >
                                Don&apos;t accept {selectedIds.size} ticked
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-[13.5px] text-muted-foreground">
                                <b className="text-foreground font-bold">{counts.pending}</b> to accept · {counts.approved} accepted
                            </div>
                            <button
                                onClick={handleApproveAllPending}
                                disabled={isActionPending || counts.pending === 0}
                                className="h-[48px] w-full text-[15.5px] font-bold bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Accept all {counts.pending}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
