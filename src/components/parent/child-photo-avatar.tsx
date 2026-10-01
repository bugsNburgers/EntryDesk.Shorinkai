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
            <div className="relative group shrink-0">
                {/* Avatar Box */}
                <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="relative h-20 w-20 rounded-2xl overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    title="Click to change athlete photo"
                >
                    {photoUrl ? (
                        <Image
                            src={photoUrl}
                            alt={childName}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <span className="text-2xl font-bold text-primary">
                            {childName.slice(0, 1).toUpperCase()}
                        </span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
                        <Camera className="h-4 w-4" />
                        <span>Edit</span>
                    </div>
                </button>

                {/* Camera Badge Icon */}
                <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-sm hover:bg-primary/90 transition-transform active:scale-95"
                    title="Upload or change photo"
                >
                    <Camera className="h-3.5 w-3.5" />
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
