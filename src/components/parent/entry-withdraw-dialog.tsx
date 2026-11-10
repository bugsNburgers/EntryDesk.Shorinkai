'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AlertCircle, Edit3, ArrowRight, RotateCcw } from 'lucide-react'
import { withdrawParentEntry } from '@/app/athlete/entry-actions'

interface EntryWithdrawDialogProps {
    entryId: string
    studentId: string
    eventId: string
    studentName: string
    eventTitle: string
    status: string
    canReapply?: boolean
}

export function EntryWithdrawSection({
    entryId,
    studentId,
    eventId,
    studentName,
    eventTitle,
    status,
    canReapply = false,
}: EntryWithdrawDialogProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
    const [withdrawReason, setWithdrawReason] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Only allow parent withdrawal if not approved by organiser yet
    // ('pending_coach', 'submitted', 'correction_needed')
    const canWithdraw = ['pending_coach', 'submitted', 'correction_needed'].includes(status)
    const canEdit = status === 'correction_needed'
    const isApproved = status === 'approved'
    const isWithdrawn = status === 'withdrawn'

    const handleOpenModal = () => {
        setWithdrawReason('')
        setError(null)
        setIsWithdrawOpen(true)
    }

    const handleFinalWithdraw = async () => {
        setError(null)
        startTransition(async () => {
            const res = await withdrawParentEntry(entryId, withdrawReason.trim() || 'Withdrawn by parent')
            if (res.error) {
                setError(res.error)
            } else {
                setIsWithdrawOpen(false)
                setWithdrawReason('')
                router.refresh()
            }
        })
    }

    return (
        <div className="pt-2 space-y-3">
            {isApproved && (
                <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                    <p className="text-base">
                        <b>Want to cancel?</b> Only your coach can cancel an accepted entry. Please ask your coach.
                    </p>
                </div>
            )}

            {canEdit && (
                <Link
                    href={`/athlete/${studentId}/register?event=${eventId}`}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                    <Edit3 className="h-5 w-5" aria-hidden="true" />
                    <span>Fix and send again</span>
                </Link>
            )}

            {isWithdrawn && canReapply && (
                <div className="space-y-2">
                    <Link
                        href={`/athlete/${studentId}/register?event=${eventId}`}
                        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                        <RotateCcw className="h-5 w-5" aria-hidden="true" />
                        <span>Enter this tournament again</span>
                    </Link>
                    <p className="text-center text-[15px] text-muted-foreground">Entries are still open, so you can enter again.</p>
                </div>
            )}

            {canWithdraw && (
                <>
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        className="flex min-h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-border bg-card text-base font-semibold text-destructive hover:bg-muted"
                    >
                        Cancel this entry
                    </button>

                    <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                        <DialogContent className="max-w-[420px] rounded-2xl p-6">
                            <DialogHeader className="text-left space-y-1.5">
                                <DialogTitle className="text-xl font-bold">Cancel this entry?</DialogTitle>
                                <DialogDescription className="text-base leading-snug">
                                    <span className="font-semibold text-foreground">{studentName}</span> will be taken out of{' '}
                                    <span className="font-semibold text-foreground">{eventTitle}</span>. You can enter again before the last day.
                                </DialogDescription>
                            </DialogHeader>

                            {error && (
                                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[15px] text-destructive">
                                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <label className="flex flex-col gap-1.5 text-left text-[15px] font-semibold">
                                Why? (you can leave this empty)
                                <Input
                                    value={withdrawReason}
                                    onChange={(e) => setWithdrawReason(e.target.value)}
                                    placeholder="e.g. Not well, cannot come"
                                    className="h-12 text-base font-normal"
                                />
                            </label>

                            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
                                <button
                                    type="button"
                                    onClick={handleFinalWithdraw}
                                    disabled={isPending}
                                    className="min-h-12 w-full rounded-xl bg-destructive text-base font-semibold text-white disabled:opacity-50"
                                >
                                    {isPending ? 'Cancelling…' : 'Yes, cancel the entry'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsWithdrawOpen(false)}
                                    disabled={isPending}
                                    className="min-h-12 w-full rounded-xl border-[1.5px] border-border bg-card text-base font-semibold"
                                >
                                    No, keep it
                                </button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    )
}
