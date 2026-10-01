'use client'

import { Button } from "@/components/ui/button"
import { updateApplicationStatus } from "@/app/dashboard/approvals/actions"
import { useState } from "react"
import { Loader2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ApprovalButtonsProps {
    applicationId: string
    fullWidth?: boolean
}

export function ApprovalButtons({ applicationId, fullWidth }: ApprovalButtonsProps) {
    const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)
    const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

    const handleUpdate = async (status: 'approved' | 'rejected') => {
        setLoading(status)
        try {
            await updateApplicationStatus(applicationId, status)
            setDone(status)
        } catch (e) {
            alert('Failed to update status. Please try again.')
        } finally {
            setLoading(null)
        }
    }

    if (done === 'approved') {
        return (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <Check className="h-4 w-4" />
                Approved
            </div>
        )
    }
    if (done === 'rejected') {
        return (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                <X className="h-4 w-4" />
                Declined
            </div>
        )
    }

    return (
        <div className={cn("flex gap-2", fullWidth && "flex-col sm:flex-row")}>
            <Button
                size="sm"
                className={cn(
                    "h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 dark:bg-emerald-600 dark:hover:bg-emerald-700",
                    fullWidth && "flex-1 justify-center"
                )}
                onClick={() => handleUpdate('approved')}
                disabled={!!loading}
            >
                {loading === 'approved'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Check className="h-4 w-4" />
                }
                Approve
            </Button>
            <Button
                size="sm"
                variant="outline"
                className={cn(
                    "h-9 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-950 dark:hover:border-red-800",
                    fullWidth && "flex-1 justify-center"
                )}
                onClick={() => handleUpdate('rejected')}
                disabled={!!loading}
            >
                {loading === 'rejected'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <X className="h-4 w-4" />
                }
                Decline
            </Button>
        </div>
    )
}
