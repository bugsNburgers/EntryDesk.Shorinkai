'use client'

// Athlete detail modal — moved verbatim from organiser-entries-list.tsx.

import { SafeAvatar } from '@/components/ui/safe-avatar'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserEntryDetailDialog({ vm }: { vm: OrganiserEntriesListVM }) {
    const { entries, detailDialogOpen, setDetailDialogOpen, selectedDetailEntry } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* 5. ATHLETE DETAIL MODAL                                                    */}
            {/* ========================================================================= */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Entry Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDetailEntry && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-muted border-2 border-primary flex items-center justify-center font-bold text-primary text-lg">
                                    {selectedDetailEntry.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-foreground">
                                        {selectedDetailEntry.student_name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Reg: {selectedDetailEntry.student_registration_no || '—'} · {selectedDetailEntry.student_gender}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs bg-background dark:bg-card border border-border rounded-xl p-3">
                                <div>
                                    <span className="text-muted-foreground">Dojo:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.dojo_name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Coach:</span>
                                    <p className="font-semibold text-foreground mt-0.5 flex items-center gap-2">
                                        <SafeAvatar
                                            src={selectedDetailEntry.coach_avatar}
                                            name={selectedDetailEntry.coach_name || selectedDetailEntry.coach_email}
                                            size={32}
                                            enlargeable
                                            subtitle={selectedDetailEntry.coach_email}
                                        />
                                        {selectedDetailEntry.coach_name || selectedDetailEntry.coach_email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Rank / Belt:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.student_rank || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Weight:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight
                                            ? `${selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight} kg`
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Category:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.category_name || 'Standard'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Chest Number:</span>
                                    <p className="font-bold text-primary mt-0.5">
                                        {selectedDetailEntry.chest_no ? `#${selectedDetailEntry.chest_no}` : 'Not assigned'}
                                    </p>
                                </div>
                            </div>

                            {selectedDetailEntry.rejection_reason && (
                                <div className="text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-700 dark:text-rose-300">
                                    <span className="font-bold">Rejection Note: </span>
                                    {selectedDetailEntry.rejection_reason}
                                </div>
                            )}

                            {selectedDetailEntry.coach_notes && (
                                <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-800 dark:text-amber-300">
                                    <span className="font-bold">Coach Note: </span>
                                    {selectedDetailEntry.coach_notes}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {selectedDetailEntry?.status === 'approved' && (
                            <Link
                                href={`/athlete/entries/${selectedDetailEntry.id}/id-card`}
                                target="_blank"
                                className="w-full sm:w-auto"
                            >
                                <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-[#26bfa2] text-white dark:text-primary-foreground font-bold text-xs">
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    Open ID Card Pass
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setDetailDialogOpen(false)}
                            className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
