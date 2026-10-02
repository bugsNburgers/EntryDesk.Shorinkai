'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Smartphone } from 'lucide-react'
import { ShowIdDialog } from './show-id-dialog'
import { IdCardDownload } from './id-card-download'
import type { IdCardData } from './id-card-preview'

interface AthleteIdActionsProps {
    entryId: string
    initialData?: IdCardData | null
    size?: 'sm' | 'default' | 'lg'
    showDownload?: boolean
    compact?: boolean
}

export function AthleteIdActions({
    entryId,
    initialData,
    size = 'default',
    showDownload = true,
    compact = false,
}: AthleteIdActionsProps) {
    const [isIdDialogOpen, setIsIdDialogOpen] = useState(false)

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Show ID Modal Trigger */}
            <ShowIdDialog
                entryId={entryId}
                initialData={initialData}
                open={isIdDialogOpen}
                onOpenChange={setIsIdDialogOpen}
                size={size}
                trigger={
                    <Button
                        size={size}
                        className="gap-2 rounded-xl font-bold bg-[#0e2238] hover:bg-[#163354] text-white shadow-sm transition-all border border-[#0e2238]"
                    >
                        <Smartphone className="h-4 w-4 text-[#3fd8c3]" />
                        Show ID
                    </Button>
                }
            />

            {/* Download A4 Pass Trigger with Eco Prompt */}
            {showDownload && (
                <IdCardDownload
                    entryId={entryId}
                    initialData={initialData}
                    size={size}
                    variant="outline"
                    label={compact ? "A4 Pass" : "Download A4 Pass"}
                    onShowPhoneId={() => setIsIdDialogOpen(true)}
                />
            )}
        </div>
    )
}
