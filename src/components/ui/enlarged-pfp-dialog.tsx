'use client'

import React, { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, ExternalLink, User, Shield, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AthleteExtraDetails {
    dojo?: string | null
    chestNo?: string | number | null
    age?: string | number | null
    rank?: string | null
    gender?: string | null
    category?: string | null
    email?: string | null
    phone?: string | null
}

export interface EnlargedPfpModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    photoUrl?: string | null
    name: string
    subtitle?: string | null
    extraDetails?: AthleteExtraDetails
}

/**
 * Clean, high-impact modal dialog for viewing an athlete's enlarged photo.
 */
export function EnlargedPfpModal({
    open,
    onOpenChange,
    photoUrl,
    name,
    subtitle,
    extraDetails,
}: EnlargedPfpModalProps) {
    const [imgLoaded, setImgLoaded] = useState(false)
    const [imgError, setImgError] = useState(false)

    // Reset error & loaded states when photo changes
    React.useEffect(() => {
        setImgLoaded(false)
        setImgError(false)
    }, [photoUrl])

    const hasPhoto = Boolean(photoUrl && !imgError)

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                {/* Backdrop Overlay */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                />

                {/* Dialog Body */}
                <DialogPrimitive.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2',
                        'rounded-3xl border border-[#ded8cb] bg-white p-0 shadow-2xl dark:border-[#1f2b40] dark:bg-[#111a2b]',
                        'transition-all duration-200 outline-none overflow-hidden',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
                        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
                    )}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-[#ded8cb] dark:border-[#1f2b40] px-5 py-4 bg-[#faf8f3] dark:bg-[#0d1624]">
                        <div className="min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                                <DialogPrimitive.Title className="text-lg font-bold text-[#1c1917] dark:text-[#f8fafc] truncate">
                                    {name}
                                </DialogPrimitive.Title>
                                {extraDetails?.chestNo && (
                                    <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                        #{extraDetails.chestNo}
                                    </span>
                                )}
                            </div>
                            <DialogPrimitive.Description className="text-xs text-[#57534e] dark:text-[#8a99ab] truncate mt-0.5">
                                {subtitle || extraDetails?.dojo || 'Athlete Profile Picture'}
                            </DialogPrimitive.Description>
                        </div>

                        {/* Close button */}
                        <DialogPrimitive.Close
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[#57534e] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/20 transition-all outline-none"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </DialogPrimitive.Close>
                    </div>

                    {/* Main Image View Area */}
                    <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-[#f7f4ec]/40 dark:bg-[#0a1220]/60 min-h-[300px]">
                        {hasPhoto ? (
                            <div className="relative w-full max-h-[60vh] sm:max-h-[65vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 border border-[#ded8cb] dark:border-[#1f2b40] shadow-inner p-1">
                                {!imgLoaded && !imgError && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2dd4b4] border-t-transparent" />
                                    </div>
                                )}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photoUrl!}
                                    alt={name}
                                    onLoad={() => setImgLoaded(true)}
                                    onError={() => setImgError(true)}
                                    className={cn(
                                        'max-h-[58vh] sm:max-h-[62vh] w-auto max-w-full rounded-xl object-contain transition-opacity duration-300 shadow-md',
                                        imgLoaded ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <div className="h-28 w-28 rounded-full bg-[#16233a] border-4 border-[#243349] flex items-center justify-center text-3xl font-bold text-[#2dd4b4] shadow-lg mb-4">
                                    {name ? name.charAt(0).toUpperCase() : <User className="h-12 w-12 text-[#8a99ab]" />}
                                </div>
                                <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                                    No profile photo uploaded
                                </p>
                                <p className="text-xs text-[#57534e] dark:text-[#8a99ab] mt-1 max-w-xs">
                                    The athlete does not have a high-resolution photo associated with their account yet.
                                </p>
                            </div>
                        )}

                        {/* Extra Details Badges Row (if available) */}
                        {extraDetails && (
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
                                {extraDetails.dojo && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-[#1c1917] dark:text-[#e8eef5] border border-[#ded8cb] dark:border-[#1f2b40]">
                                        <Shield className="h-3 w-3 text-muted-foreground" />
                                        {extraDetails.dojo}
                                    </span>
                                )}
                                {extraDetails.rank && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-[#1c1917] dark:text-[#e8eef5] border border-[#ded8cb] dark:border-[#1f2b40]">
                                        <Trophy className="h-3 w-3 text-amber-500" />
                                        {extraDetails.rank}
                                    </span>
                                )}
                                {extraDetails.category && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-[#1c1917] dark:text-[#e8eef5] border border-[#ded8cb] dark:border-[#1f2b40]">
                                        {extraDetails.category}
                                    </span>
                                )}
                                {extraDetails.age !== undefined && extraDetails.age !== null && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-[#1c1917] dark:text-[#e8eef5] border border-[#ded8cb] dark:border-[#1f2b40]">
                                        {extraDetails.age} yrs
                                    </span>
                                )}
                                {extraDetails.gender && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-[#1c1917] dark:text-[#e8eef5] border border-[#ded8cb] dark:border-[#1f2b40]">
                                        {extraDetails.gender}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t border-[#ded8cb] dark:border-[#1f2b40] px-5 py-3 bg-[#faf8f3] dark:bg-[#0d1624]">
                        {hasPhoto ? (
                            <a
                                href={photoUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9488] dark:text-[#2dd4b4] hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Full Size
                            </a>
                        ) : (
                            <span />
                        )}

                        <DialogPrimitive.Close className="rounded-xl px-4 py-1.5 text-xs font-bold text-[#1c1917] dark:text-white bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                            Close
                        </DialogPrimitive.Close>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}

/**
 * Expand icon badge matching reference design (teal circle with diagonal expand arrows).
 */
export function ExpandBadge({ size = 18 }: { size?: number }) {
    return (
        <span
            style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: size,
                height: size,
                borderRadius: '50%',
                background: '#2dd4b4',
                border: '2px solid #111a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            className="transition-transform duration-200 group-hover:scale-115 shadow-sm"
            title="Click to enlarge photo"
        >
            <svg
                width={Math.round(size * 0.55)}
                height={Math.round(size * 0.55)}
                viewBox="0 0 10 10"
                fill="none"
                stroke="#04231e"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M6 1h3v3M4 9H1V6M9 1L6 4M1 9l3-3" />
            </svg>
        </span>
    )
}

/**
 * Default fallback silhouette SVG when athlete has no uploaded photo.
 */
export function AvatarPlaceholderSilhouette({ size = 23 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 46 46"
            fill="none"
            stroke="#8a99ab"
            strokeWidth="1.6"
            style={{ display: 'block' }}
        >
            <circle cx="23" cy="16" r="8" />
            <path d="M6 42c0-10 7-16 17-16s17 6 17 16" />
        </svg>
    )
}

export interface AthletePfpProps {
    photoUrl?: string | null
    name: string
    subtitle?: string | null
    size?: number
    className?: string
    showExpandBadge?: boolean
    extraDetails?: AthleteExtraDetails
}

/**
 * Complete interactive Athlete Profile Picture (PFP) component.
 * Displays athlete photo with the iconic enlarge badge, smooth hover effect,
 * and opens the enlarged lightbox dialog on click!
 */
export function AthletePfp({
    photoUrl,
    name,
    subtitle,
    size = 46,
    className,
    showExpandBadge = true,
    extraDetails,
}: AthletePfpProps) {
    const [open, setOpen] = useState(false)

    const handleClick = (e: React.MouseEvent) => {
        // Prevent row selection or parent card navigation from firing
        e.stopPropagation()
        setOpen(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            e.preventDefault()
            setOpen(true)
        }
    }

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                aria-label={`View enlarged photo of ${name}`}
                title={`Click to view enlarged photo of ${name}`}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                style={{ width: size, height: size }}
                className={cn(
                    'group relative rounded-full bg-[#16233a] border-2 border-[#243349] flex items-center justify-center shrink-0 cursor-pointer',
                    'transition-all duration-200 hover:scale-105 active:scale-95 hover:border-[#2dd4b4] hover:shadow-[0_0_12px_rgba(45,212,180,0.35)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4b4] focus-visible:ring-offset-2',
                    className
                )}
            >
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photoUrl}
                        alt={name || 'Athlete'}
                        className="w-full h-full object-cover rounded-full pointer-events-none"
                    />
                ) : (
                    <AvatarPlaceholderSilhouette size={Math.round(size * 0.5)} />
                )}

                {showExpandBadge && <ExpandBadge size={Math.max(16, Math.round(size * 0.38))} />}
            </div>

            {/* Lightbox Dialog */}
            <EnlargedPfpModal
                open={open}
                onOpenChange={setOpen}
                photoUrl={photoUrl}
                name={name}
                subtitle={subtitle}
                extraDetails={extraDetails}
            />
        </>
    )
}
