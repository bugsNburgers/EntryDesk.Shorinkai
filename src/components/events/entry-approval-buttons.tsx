'use client'

import { Button } from "@/components/ui/button"
import { updateEntryStatus } from "@/app/dashboard/events/[id]/entries/actions"
import { useState } from "react"
import { Loader2, Check, X } from "lucide-react"

interface EntryApprovalButtonsProps {
    entryId: string
    currentStatus: string
}

export function EntryApprovalButtons({ entryId, currentStatus }: EntryApprovalButtonsProps) {
    const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)

    const handleUpdate = async (status: 'approved' | 'rejected') => {
        let reason: string | undefined = undefined
        if (status === 'rejected') {
            const promptVal = window.prompt('Reason for rejection (optional, will be emailed to parent):')
            if (promptVal === null) {
                // User cancelled prompt
                return
            }
            reason = promptVal.trim() || undefined
        }

        setLoading(status)
        try {
            await updateEntryStatus(entryId, status, reason)
        } catch (e) {
            console.error(e)
            alert('Failed to update')
        } finally {
            setLoading(null)
        }
    }

    if (currentStatus === 'draft') return null

    return (
        <div className="flex gap-1 justify-end">
            <Button
                size="icon"
                variant={currentStatus === 'approved' ? 'default' : 'ghost'}
                className={currentStatus === 'approved' ? "h-8 w-8 bg-emerald-600 hover:bg-emerald-700" : "h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                onClick={() => handleUpdate('approved')}
                disabled={!!loading || currentStatus === 'approved'}
                title="Approve"
            >
                {loading === 'approved' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span className="sr-only">Approve</span>
            </Button>
            <Button
                size="icon"
                variant={currentStatus === 'rejected' ? 'default' : 'ghost'}
                className={currentStatus === 'rejected' ? "h-8 w-8 bg-red-600 hover:bg-red-700" : "h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"}
                onClick={() => handleUpdate('rejected')}
                disabled={!!loading || currentStatus === 'rejected'}
                title="Reject"
            >
                {loading === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                <span className="sr-only">Reject</span>
            </Button>
        </div>
    )
}
