'use client'

// ============================================================================
// EntryDesk — Compulsory Profile Photo Upload Screen
// Blocks coaches & organizers without avatar_url from accessing dashboard.
// ============================================================================

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Camera, Upload, AlertCircle, Loader2, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react'
import { compressAthletePhoto, type CompressionResult } from '@/lib/image-compression'
import { logout } from '@/app/login/actions'
import { PhotoGuidelinesVisual } from '@/components/ui/photo-guidelines'

interface CompulsoryProfilePhotoUploadProps {
    userId: string
    fullName: string
    role: string
    email: string
}

export function CompulsoryProfilePhotoUpload({
    userId,
    fullName,
    role,
    email,
}: CompulsoryProfilePhotoUploadProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isCompressing, setIsCompressing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [compressedFile, setCompressedFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const roleLabel = role === 'organizer' ? 'Tournament Organizer' : role === 'admin' ? 'Administrator' : 'Coach'

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setIsCompressing(true)

        try {
            const result: CompressionResult = await compressAthletePhoto(file)
            setPreviewUrl(result.dataUrl)
            setCompressedFile(result.file)
        } catch (err: any) {
            setError(err.message || 'Failed to process selected image')
        } finally {
            setIsCompressing(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleUploadAndProceed = async () => {
        if (!compressedFile) {
            setError('Please select or take a photo first.')
            return
        }

        setIsUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', compressedFile)

            const res = await fetch('/api/upload/profile-photo', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                setError(data.error || 'Failed to upload photo. Please try again.')
                setIsUploading(false)
                return
            }

            // Success: reload so server layout re-checks avatar_url and unlocks dashboard
            window.location.reload()
        } catch (err: any) {
            setError(err.message || 'Network error occurred during upload.')
            setIsUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
            <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-xl backdrop-blur">
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            ED
                        </div>
                        <span className="text-sm font-semibold tracking-tight">EntryDesk Verification</span>
                    </div>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Required Step
                    </span>
                </div>

                <div className="text-center space-y-2 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Upload Your Profile Photo
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                        Welcome, <span className="font-semibold text-foreground">{fullName}</span> ({roleLabel}). 
                        Before continuing to your dashboard, please upload a clear, official profile photo.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Photo Guidelines with Visual Do's & Don'ts */}
                <div className="mb-6">
                    <PhotoGuidelinesVisual roleLabel={role === 'organizer' ? 'organizer' : 'coach'} />
                </div>

                {/* Photo Upload Area */}
                <div className="flex flex-col items-center justify-center space-y-4 mb-6">
                    <div className="relative group">
                        <div className="h-36 w-36 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shadow-inner relative">
                            {previewUrl ? (
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="text-center p-4">
                                    <Camera className="h-10 w-10 text-muted-foreground/60 mx-auto mb-1" />
                                    <span className="text-[11px] text-muted-foreground block font-medium">No photo</span>
                                </div>
                            )}

                            {isCompressing && (
                                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-1" />
                                    <span className="text-[10px] font-medium text-muted-foreground">Compressing…</span>
                                </div>
                            )}
                        </div>

                        {previewUrl && (
                            <div className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isCompressing || isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 text-xs h-9 cursor-pointer"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        {previewUrl ? 'Change Photo' : 'Select Photo'}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                        Clear face photo (JPG, PNG, WebP) · Auto-compressed to under 150KB
                    </p>
                </div>

                {/* Submit Action */}
                <div className="space-y-3">
                    <Button
                        type="button"
                        disabled={!compressedFile || isCompressing || isUploading}
                        onClick={handleUploadAndProceed}
                        className="w-full h-11 text-sm font-semibold cursor-pointer"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving photo…
                            </>
                        ) : (
                            'Save & Enter Dashboard'
                        )}
                    </Button>

                    <form action={logout}>
                        <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign out / Switch account ({email})
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
