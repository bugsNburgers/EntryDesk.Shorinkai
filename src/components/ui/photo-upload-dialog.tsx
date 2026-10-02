'use client'

// ============================================================================
// EntryDesk — Athlete Photo Upload Dialog
// Client-side compression (<=150KB / 600px) + direct Vercel Blob upload.
// Shows live circle-crop preview matching the official Tournament ID card layout.
// ============================================================================

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Camera,
    Upload,
    Check,
    AlertCircle,
    Loader2,
    Trash2,
    FileImage,
} from 'lucide-react'
import { compressAthletePhoto, type CompressionResult } from '@/lib/image-compression'
import { PhotoGuidelinesVisual } from '@/components/ui/photo-guidelines'

interface PhotoUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    studentId: string
    studentName: string
    currentPhotoUrl?: string | null
    onSuccess?: (newPhotoUrl: string | null) => void
}

export function PhotoUploadDialog({
    open,
    onOpenChange,
    studentId,
    studentName,
    currentPhotoUrl,
    onSuccess,
}: PhotoUploadDialogProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isCompressing, setIsCompressing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [compressionData, setCompressionData] = useState<CompressionResult | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null)
    const [error, setError] = useState<string | null>(null)

    // Reset state on modal close
    const handleClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            setCompressionData(null)
            setPreviewUrl(currentPhotoUrl || null)
            setError(null)
        }
        onOpenChange(nextOpen)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setIsCompressing(true)

        try {
            const result = await compressAthletePhoto(file)
            setCompressionData(result)
            setPreviewUrl(result.dataUrl)
        } catch (err: any) {
            setError(err.message || 'Failed to process selected image')
        } finally {
            setIsCompressing(false)
            // Reset input so same file can be re-selected if desired
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleUpload = async () => {
        if (!compressionData) return

        setIsUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('studentId', studentId)
            formData.append('file', compressionData.file)

            const res = await fetch('/api/upload/photo', {
                method: 'POST',
                body: formData,
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || `Upload failed (${res.status})`)
            }

            if (onSuccess) {
                onSuccess(json.photo_url)
            }
            router.refresh()
            handleClose(false)
        } catch (err: any) {
            setError(err.message || 'Failed to upload photo. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDeletePhoto = async () => {
        if (!confirm('Are you sure you want to remove this athlete photo?')) return

        setIsDeleting(true)
        setError(null)

        try {
            const res = await fetch('/api/upload/photo', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId }),
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Failed to remove photo')
            }

            if (onSuccess) {
                onSuccess(null)
            }
            router.refresh()
            handleClose(false)
        } catch (err: any) {
            setError(err.message || 'Failed to remove photo.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-primary" />
                        Athlete Photo
                    </DialogTitle>
                    <DialogDescription>
                        Upload a front-facing photo for {studentName}. This photo will appear on official tournament ID cards and coach rosters.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Live ID Card Circle Preview */}
                    <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-muted/30 border border-dashed border-border/70">
                        <div className="relative h-28 w-28 rounded-full overflow-hidden border-4 border-primary/30 shadow-md bg-background flex items-center justify-center">
                            {previewUrl ? (
                                <Image
                                    src={previewUrl}
                                    alt={studentName}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <span className="text-3xl font-extrabold text-muted-foreground/60 uppercase">
                                    {studentName.slice(0, 1)}
                                </span>
                            )}

                            {isCompressing && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </div>

                        <p className="text-[11px] text-muted-foreground font-medium text-center">
                            Circle crop preview for Tournament ID Card
                        </p>
                    </div>

                    {/* Hidden Native File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        className="hidden"
                    />

                    {/* Picker Button */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isCompressing || isUploading}
                            className="flex-1 rounded-md gap-2 font-medium"
                        >
                            <FileImage className="h-4 w-4" />
                            {compressionData || previewUrl ? 'Choose Different Image' : 'Select Photo'}
                        </Button>

                        {currentPhotoUrl && !compressionData && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleDeletePhoto}
                                disabled={isDeleting || isUploading}
                                className="text-destructive hover:bg-destructive/10 rounded-md"
                                title="Remove photo"
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Photo Guidelines with DO / DON'T Examples shown openly */}
                    <PhotoGuidelinesVisual roleLabel="athlete" compact={true} />

                    {/* Error display */}
                    {error && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2 text-xs text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleClose(false)}
                        disabled={isUploading}
                        className="rounded-md"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={!compressionData || isUploading || isCompressing}
                        className="rounded-md font-semibold gap-2"
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        {isUploading ? 'Uploading...' : 'Save Photo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
