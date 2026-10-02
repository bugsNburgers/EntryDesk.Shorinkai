'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Smartphone } from 'lucide-react'
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
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* View Pass Button opens full page directly — No Modal */}
            <Link href={`/parent/entries/${entryId}/id-card`}>
                <Button
                    size={size}
                    className="gap-2 rounded-xl font-bold bg-[#3fd8c3] hover:bg-[#25c4a5] text-[#04231e] shadow-sm transition-all"
                >
                    <Smartphone className="h-4 w-4" />
                    {compact ? "Pass" : "View Pass"}
                </Button>
            </Link>

            {/* Direct A4 Print Trigger — No Dropdown */}
            {showDownload && (
                <IdCardDownload
                    entryId={entryId}
                    initialData={initialData}
                    size={size}
                    variant="outline"
                    label={compact ? "Print A4" : "Print A4 Pass"}
                />
            )}
        </div>
    )
}
