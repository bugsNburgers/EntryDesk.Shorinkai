'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Ban, Edit3, Loader2, ArrowRight } from 'lucide-react'
import { withdrawParentEntry } from '@/app/parent/entry-actions'

interface EntryActionsClientProps {
    entryId: string
    studentId: string
    eventId: string
    status: string
    studentName: string
    eventTitle: string
}

export function EntryActionsClient({
    entryId,
    studentId,
    eventId,
    status,
    studentName,
    eventTitle,
}: EntryActionsClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
    const [withdrawReason, setWithdrawReason] = useState('')
    const [error, setError] = useState<string | null>(null)

    const canWithdraw = ['pending_coach', 'submitted', 'correction_needed'].includes(status)
    const canEdit = status === 'correction_needed'

    const handleWithdraw = async () => {
        setError(null)
        startTransition(async () => {
            const res = await withdrawParentEntry(entryId, withdrawReason || 'Withdrawn by parent')
            if (res.error) {
                setError(res.error)
            } else {
                setIsWithdrawOpen(false)
                router.refresh()
            }
        })
    }

    if (!canWithdraw && !canEdit) {
        return null
    }

    return (
        <div className="flex flex-wrap items-center gap-3 pt-2">
            {canEdit && (
                <Link href={`/athlete/${studentId}/register?event=${eventId}`}>
                    <Button className="rounded-xl gap-2 font-semibold">
                        <Edit3 className="h-4 w-4" />
                        Update Registration
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            )}

            {canWithdraw && (
                <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-xl gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                            <Ban className="h-4 w-4" />
                            Withdraw Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Withdraw Tournament Entry</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to withdraw <span className="font-semibold text-foreground">{studentName}</span> from <span className="font-semibold text-foreground">{eventTitle}</span>?
                            </DialogDescription>
                        </DialogHeader>

                        {error && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2 py-2">
                            <Label htmlFor="withdraw-reason" className="text-xs font-medium text-muted-foreground">
                                Reason for withdrawal (optional)
                            </Label>
                            <Input
                                id="withdraw-reason"
                                placeholder="e.g. Schedule conflict, injury, travel"
                                value={withdrawReason}
                                onChange={(e) => setWithdrawReason(e.target.value)}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="ghost"
                                onClick={() => setIsWithdrawOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleWithdraw}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Withdrawing...
                                    </>
                                ) : (
                                    'Confirm Withdrawal'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
