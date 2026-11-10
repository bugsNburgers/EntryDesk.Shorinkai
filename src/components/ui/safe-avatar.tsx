'use client'

// ============================================================================
// SafeAvatar — the one way to render a user or athlete photo.
// next/image THROWS (and takes the whole page down) for a remote host that is not in
// next.config.ts → images.remotePatterns. This component only hands next/image a src
// it accepts, uses a plain <img> otherwise, and falls back to initials when the image
// is missing or fails to load. Optional click-to-enlarge via EnlargedPfpModal.
// ============================================================================

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { EnlargedPfpModal, type AthleteExtraDetails } from '@/components/ui/enlarged-pfp-dialog'

/** Mirrors next.config.ts images.remotePatterns (keep in sync). */
const ALLOWED_HOSTS: Array<string | RegExp> = [
    'lh3.googleusercontent.com',
    /\.googleusercontent\.com$/,
    /\.public\.blob\.vercel-storage\.com$/,
    'avatars.githubusercontent.com',
]

export function isOptimizableImageSrc(src: string | null | undefined): boolean {
    if (!src) return false
    if (src.startsWith('/') && !src.startsWith('//')) return true
    if (src.startsWith('data:') || src.startsWith('blob:')) return false
    try {
        const url = new URL(src)
        if (url.protocol !== 'https:') return false
        return ALLOWED_HOSTS.some((h) => (typeof h === 'string' ? url.hostname === h : h.test(url.hostname)))
    } catch {
        return false
    }
}

export function initialsOf(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase()
}

export interface SafeAvatarProps {
    src: string | null | undefined
    name: string | null | undefined
    /** Pixel size of the square. */
    size?: number
    className?: string
    /** Shape; avatars are round by default. */
    rounded?: 'full' | 'lg' | 'md'
    /** Click opens the enlarged photo dialog. */
    enlargeable?: boolean
    subtitle?: string | null
    extraDetails?: AthleteExtraDetails
    priority?: boolean
}

export function SafeAvatar({
    src,
    name,
    size = 40,
    className,
    rounded = 'full',
    enlargeable = false,
    subtitle,
    extraDetails,
    priority,
}: SafeAvatarProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const usable = Boolean(src) && failedSrc !== src
    const label = name || 'Photo'
    const radius = rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'

    const inner = usable ? (
        isOptimizableImageSrc(src) ? (
            <Image
                src={src as string}
                alt={label}
                width={size}
                height={size}
                priority={priority}
                className={cn('h-full w-full object-cover', radius)}
                onError={() => setFailedSrc(src as string)}
            />
        ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src as string}
                alt={label}
                width={size}
                height={size}
                loading={priority ? 'eager' : 'lazy'}
                className={cn('h-full w-full object-cover', radius)}
                onError={() => setFailedSrc(src as string)}
            />
        )
    ) : (
        <span
            aria-hidden="true"
            className="select-none font-semibold text-muted-foreground"
            style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
            {initialsOf(name)}
        </span>
    )

    const frame = cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted',
        radius,
        className
    )

    if (!enlargeable || !usable) {
        return (
            <span className={frame} style={{ width: size, height: size }} role="img" aria-label={label}>
                {inner}
            </span>
        )
    }

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen(true)
                }}
                className={cn(frame, 'cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
                style={{ width: size, height: size }}
                aria-label={`View larger photo of ${label}`}
                title={`View larger photo of ${label}`}
            >
                {inner}
            </button>
            <EnlargedPfpModal
                open={open}
                onOpenChange={setOpen}
                photoUrl={src}
                name={label}
                subtitle={subtitle}
                extraDetails={extraDetails}
            />
        </>
    )
}
