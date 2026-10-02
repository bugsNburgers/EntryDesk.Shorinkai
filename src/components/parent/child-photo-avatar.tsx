'use client'

// ============================================================================
// EntryDesk — Child Photo Avatar with Interactive Upload Trigger
// Used on the Parent Child Profile page to view & change athlete photo.
// ============================================================================

import React, { useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { PhotoUploadDialog } from '@/components/ui/photo-upload-dialog'

interface ChildPhotoAvatarProps {
    childId: string
    childName: string
    initialPhotoUrl?: string | null
}

export function ChildPhotoAvatar({
    childId,
    childName,
    initialPhotoUrl,
}: ChildPhotoAvatarProps) {
    const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null)
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <div className="relative shrink-0">
                {/* 84x84 Circular Avatar Frame */}
                <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="relative w-[84px] h-[84px] rounded-full overflow-hidden bg-[#eee9df] border-2 border-emerald-600 dark:bg-[#16233a] dark:border-[#2dd4b4] flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#f7f4ec] dark:focus:ring-[#2dd4b4] dark:focus:ring-offset-[#0a1220]"
                    title="Click to view or change photo"
                >
                    {photoUrl ? (
                        <Image
                            src={photoUrl}
                            alt={childName}
                            fill
                            className="object-cover rounded-full"
                            unoptimized
                        />
                    ) : (
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 46 46"
                            fill="none"
                            className="stroke-[#57534e] dark:stroke-[#8a99ab]"
                            strokeWidth="1.6"
                        >
                            <circle cx="23" cy="16" r="8" />
                            <path d="M6 42c0-10 7-16 17-16s17 6 17 16" />
                        </svg>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                        <span>Edit</span>
                    </div>
                </button>

                {/* 28x28 Circular Camera / Edit Badge */}
                <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="absolute -right-[2px] -bottom-[2px] w-[28px] h-[28px] rounded-full bg-emerald-600 border-[3px] border-white text-white dark:bg-[#2dd4b4] dark:border-[#0a1220] dark:text-[#04231e] flex items-center justify-center shadow-md hover:bg-emerald-700 dark:hover:bg-[#25c4a5] transition-transform active:scale-95 z-10"
                    title="Upload or change photo"
                >
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M2 12l1-3.5L10 1.5l2.5 2.5-7 7z" />
                    </svg>
                </button>
            </div>

            <PhotoUploadDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                studentId={childId}
                studentName={childName}
                currentPhotoUrl={photoUrl}
                onSuccess={(newUrl) => setPhotoUrl(newUrl)}
            />
        </>
    )
}
