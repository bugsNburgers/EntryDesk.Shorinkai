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
    const [step, setStep] = useState<1 | 2>(1)
    const [withdrawReason, setWithdrawReason] = useState('')
    const [confirmText, setConfirmText] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Only allow parent withdrawal if not approved by organiser yet
    // ('pending_coach', 'submitted', 'correction_needed')
    const canWithdraw = ['pending_coach', 'submitted', 'correction_needed'].includes(status)
    const canEdit = status === 'correction_needed'
    const isApproved = status === 'approved'
    const isWithdrawn = status === 'withdrawn'

    const handleOpenModal = () => {
        setStep(1)
        setWithdrawReason('')
        setConfirmText('')
        setError(null)
        setIsWithdrawOpen(true)
    }

    const handleProceedToStep2 = () => {
        setError(null)
        setConfirmText('')
        setStep(2)
    }

    const handleFinalWithdraw = async () => {
        if (confirmText.trim().toLowerCase() !== 'confirm') {
            setError('Please type "confirm" to proceed with the withdrawal.')
            return
        }

        setError(null)
        startTransition(async () => {
            const res = await withdrawParentEntry(
                entryId,
                withdrawReason.trim() || 'Withdrawn by parent'
            )
            if (res.error) {
                setError(res.error)
            } else {
                setIsWithdrawOpen(false)
                setStep(1)
                setWithdrawReason('')
                setConfirmText('')
                router.refresh()
            }
        })
    }

    const isConfirmWordMatched = confirmText.trim().toLowerCase() === 'confirm'

    return (
        <div className="pt-2 space-y-3">
            {/* If approved by organiser: notice to contact coach */}
            {isApproved && (
                <div className="bg-white border border-border dark:bg-card dark:border-border rounded-[16px] p-4 text-[13.5px] text-muted-foreground flex items-start gap-3 shadow-xs">
                    <span className="text-amber-500 dark:text-amber-400 font-bold text-base leading-none mt-0.5">ℹ</span>
                    <div className="leading-[1.45]">
                        <span className="font-semibold text-foreground block mb-0.5">
                            Approved by Organiser
                        </span>
                        This entry has been approved by the organiser. To withdraw, please contact your coach. Coaches can withdraw entries from the organiser before the tournament deadline.
                    </div>
                </div>
            )}

            {/* If correction requested by coach */}
            {canEdit && (
                <Link
                    href={`/athlete/${studentId}/register?event=${eventId}`}
                    className="w-full h-[48px] rounded-[14px] bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
                >
                    <Edit3 className="w-4 h-4" />
                    <span>Update Registration</span>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            )}

            {/* If withdrawn and deadline is still open: Allow re-applying */}
            {isWithdrawn && canReapply && (
                <div className="space-y-2">
                    <Link
                        href={`/athlete/${studentId}/register?event=${eventId}`}
                        className="w-full h-[44px] rounded-md bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Apply Again for Tournament</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="text-[12.5px] text-muted-foreground text-center">
                        Registration is still open. You can apply again before the deadline.
                    </p>
                </div>
            )}

            {/* If eligible to withdraw (not approved by organiser yet) */}
            {canWithdraw && (
                <>
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        className="w-full h-[44px] rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-[rgba(248,113,113,0.45)] dark:text-[#f87171] dark:hover:bg-[#f87171]/10 text-[15px] font-semibold flex items-center justify-center transition-all duration-150 active:scale-[0.99] cursor-pointer"
                    >
                        Withdraw entry
                    </button>

                    <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                        <DialogContent className="max-w-[400px] bg-white border-border text-foreground dark:bg-card dark:border-border dark:text-foreground p-5 rounded-lg shadow-2xl">
                            {step === 1 ? (
                                /* ─── STEP 1: Reason Input (Optional) ─── */
                                <>
                                    <DialogHeader className="text-left space-y-1.5">
                                        <DialogTitle className="text-[19px] font-bold text-foreground">
                                            Withdraw Tournament Entry
                                        </DialogTitle>
                                        <DialogDescription className="text-[13.5px] text-muted-foreground leading-snug">
                                            Are you sure you want to withdraw{' '}
                                            <span className="font-semibold text-foreground">
                                                {studentName}
                                            </span>{' '}
                                            from{' '}
                                            <span className="font-semibold text-foreground">
                                                {eventTitle}
                                            </span>
                                            ? You can apply again before the registration deadline.
                                        </DialogDescription>
                                    </DialogHeader>

                                    {error && (
                                        <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="space-y-1.5 py-1 text-left">
                                        <label className="text-[12px] font-medium text-muted-foreground">
                                            Reason (optional)
                                        </label>
                                        <Input
                                            value={withdrawReason}
                                            onChange={(e) => setWithdrawReason(e.target.value)}
                                            placeholder="e.g. Schedule conflict, illness"
                                            className="bg-white border-border text-foreground placeholder:text-muted-foreground/50 dark:bg-background dark:border-border dark:text-foreground text-[14px] rounded-md h-10 dark:placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-emerald-500 dark:focus-visible:ring-primary"
                                        />
                                    </div>

                                    <DialogFooter className="flex-row gap-2 mt-2 sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsWithdrawOpen(false)}
                                            className="flex-1 h-[40px] rounded-md border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-[#ece6db] dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground text-[14px] font-semibold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleProceedToStep2}
                                            className="flex-1 h-[40px] rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            Confirm
                                        </button>
                                    </DialogFooter>
                                </>
                            ) : (
                                /* ─── STEP 2: Type "confirm" to verify ─── */
                                <>
                                    <DialogHeader className="text-left space-y-1.5">
                                        <DialogTitle className="text-[19px] font-bold text-rose-600 dark:text-rose-400">
                                            Confirm Withdrawal
                                        </DialogTitle>
                                        <DialogDescription className="text-[13.5px] text-muted-foreground leading-snug">
                                            To prevent accidental withdrawal, please type{' '}
                                            <span className="font-bold text-foreground bg-muted dark:text-foreground dark:bg-muted px-1.5 py-0.5 rounded">
                                                confirm
                                            </span>{' '}
                                            below to complete the request:
                                        </DialogDescription>
                                    </DialogHeader>

                                    {error && (
                                        <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="space-y-1.5 py-2 text-left">
                                        <label className="text-[12px] font-medium text-muted-foreground">
                                            Type confirm to proceed
                                        </label>
                                        <Input
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder='Type "confirm"'
                                            autoFocus
                                            className="bg-white border-border text-foreground placeholder:text-muted-foreground/50 dark:bg-background dark:border-border dark:text-foreground text-[14px] rounded-md h-10 dark:placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-rose-500 font-mono"
                                        />
                                    </div>

                                    <DialogFooter className="flex-row gap-2 mt-2 sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            disabled={isPending}
                                            className="flex-1 h-[40px] rounded-md border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-[#ece6db] dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground text-[14px] font-semibold transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleFinalWithdraw}
                                            disabled={!isConfirmWordMatched || isPending}
                                            className="flex-1 h-[40px] rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isPending ? 'Withdrawing...' : 'Withdraw Entry'}
                                        </button>
                                    </DialogFooter>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    )
}
