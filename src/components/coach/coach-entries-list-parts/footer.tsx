'use client'

// Fixed selection footer — moved verbatim from coach-entries-list.tsx.

import { Loader2 } from 'lucide-react'
import { ButtonCheckmarkSvg } from './shared'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachEntriesFooter({ vm }: { vm: CoachEntriesListVM }) {
    const { countPaid, countNotPaid, selectedCount, handleClearSelection, handleForwardAllPaid, handleForwardSelected, isSubmitting } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* FIXED FOOTER (Desktop & Mobile) — Fixed above mobile nav on mobile        */}
            {/* ========================================================================= */}
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 dark:bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-12px_28px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_30px_rgba(10,18,32,0.95)]">
                {/* Desktop View */}
                <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-3.5 items-center justify-between">
                    {selectedCount > 0 ? (
                        <>
                            <div className="text-[15px] text-foreground">
                                <b className="font-bold">{selectedCount} ticked</b> &nbsp;·&nbsp;
                                <button
                                    onClick={handleClearSelection}
                                    className="text-primary font-semibold cursor-pointer hover:underline ml-1"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleForwardAllPaid}
                                    disabled={isSubmitting || countPaid === 0}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] border-[1.5px] border-primary text-primary hover:bg-primary/10 transition disabled:opacity-40 cursor-pointer"
                                >
                                    {countPaid === 0 ? 'Mark entries as paid to send them' : `Send all ${countPaid} paid to organiser`}
                                </button>
                                <button
                                    onClick={handleForwardSelected}
                                    disabled={isSubmitting || selectedCount === 0}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                    Send {selectedCount} ticked to organiser
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[14.5px] text-muted-foreground">
                                <b className="text-foreground font-bold">{countPaid} paid</b> and ready &nbsp;·&nbsp; {countNotPaid} not paid yet
                            </div>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                {countPaid === 0 ? 'Mark entries as paid to send them' : `Send all ${countPaid} paid to organiser`}
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile View */}
                <div className="block lg:hidden px-4 py-3 space-y-2">
                    {selectedCount > 0 ? (
                        <>
                            <div className="flex justify-between items-center text-[14px] text-foreground">
                                <b className="font-bold">{selectedCount} ticked</b>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-primary font-semibold cursor-pointer hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                            <button
                                onClick={handleForwardSelected}
                                disabled={isSubmitting || selectedCount === 0}
                                className="h-[48px] w-full text-[15px] font-bold bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                Send {selectedCount} ticked to organiser
                            </button>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[48px] w-full text-[15px] font-bold border-[1.5px] border-primary text-primary rounded-xl hover:bg-primary/10 transition disabled:opacity-40 cursor-pointer"
                            >
                                {countPaid === 0 ? 'Mark entries as paid to send them' : `Send all ${countPaid} paid to organiser`}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-[15px] text-muted-foreground text-center">
                                <b className="text-foreground font-bold">{countPaid} paid</b> and ready · {countNotPaid} not paid yet
                            </div>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[52px] w-full text-base font-bold bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                {countPaid === 0 ? 'Mark entries as paid to send them' : `Send all ${countPaid} paid to organiser`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
