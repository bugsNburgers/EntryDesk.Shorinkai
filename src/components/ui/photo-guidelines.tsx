'use client'

// ============================================================================
// EntryDesk — Photo Upload Guidelines Component
// Visual Do's & Don'ts with real passport-style examples for Organizers, Coaches & Students.
// Rendered openly on upload screens with clear, uncrowded badge headers.
// ============================================================================

import React from 'react'
import Image from 'next/image'
import {
    CheckCircle2,
    XCircle,
    Info,
    HelpCircle,
    Camera
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

export interface PhotoGuidelinesProps {
    roleLabel?: 'athlete' | 'coach' | 'organizer'
    compact?: boolean
    className?: string
}

export const PHOTO_EXAMPLES = [
    {
        type: 'do',
        badge: 'DO',
        statusText: 'Acceptable',
        title: 'Passport Style',
        subtitle: 'Face fills ~75% of frame',
        image: '/images/guidelines/photo-good.jpg',
        alt: 'Close-up biometric passport photo with neutral expression and white background',
        points: [
            'Close-up headshot (chin to crown visible)',
            'Facing camera directly, eyes open & clear',
            'Solid white or plain light background',
            'Sharp focus with bright, even lighting'
        ]
    },
    {
        type: 'dont',
        badge: "DON'T",
        statusText: 'Angle / Hats',
        title: 'Accessories & Tilt',
        subtitle: 'No sunglasses, caps or tilt',
        image: '/images/guidelines/photo-bad-angle.jpg',
        alt: 'Unacceptable photo with sunglasses, cap, tilted angle and busy background',
        points: [
            'No sunglasses, dark glasses, or caps/hats',
            'No tilted angles or looking to the side',
            'Avoid busy outdoor backgrounds',
            'Face must not be covered or shadowed'
        ]
    },
    {
        type: 'dont',
        badge: "DON'T",
        statusText: 'Blur / Dark',
        title: 'Blurry & Dark',
        subtitle: 'No blurry focus or dim light',
        image: '/images/guidelines/photo-bad-blur.jpg',
        alt: 'Unacceptable photo with blurry focus and poor lighting',
        points: [
            'No blurry, shaky, or low-res images',
            'Avoid dark rooms or backlit silhouettes',
            'No social media filters or stickers',
            'No cropped distant group photos'
        ]
    }
] as const

/**
 * Open Visual Photo Guidelines (Shown directly without dropdowns)
 */
export function PhotoGuidelinesVisual({
    roleLabel = 'athlete',
    compact = false,
}: {
    roleLabel?: 'athlete' | 'coach' | 'organizer'
    compact?: boolean
}) {
    const isAthlete = roleLabel === 'athlete'
    const targetPurpose = isAthlete
        ? 'official Tournament ID Cards & category verification'
        : 'EntryDesk organizer credentials & coach rosters'

    return (
        <div className={`space-y-3 ${compact ? 'text-xs' : ''}`}>
            {/* Informative Purpose Banner */}
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    This photo appears on <span className="font-semibold text-foreground">{targetPurpose}</span>. 
                    Please upload a clear passport-style headshot following the visual standards below:
                </p>
            </div>

            {/* 3-Column Card Layout: Shown openly on the screen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PHOTO_EXAMPLES.map((example, idx) => {
                    const isDo = example.type === 'do'
                    return (
                        <div
                            key={idx}
                            className={`rounded-xl border overflow-hidden flex flex-col transition-all shadow-sm ${
                                isDo
                                    ? 'border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-950/[0.2] ring-1 ring-emerald-500/20'
                                    : 'border-destructive/30 bg-destructive/[0.02] dark:bg-destructive/10'
                            }`}
                        >
                            {/* Card Header Badge — Cleanly formatted with DO/DON'T pill on left and short status label on right */}
                            <div
                                className={`px-2.5 py-1.5 flex items-center justify-between gap-1.5 border-b text-xs font-semibold ${
                                    isDo
                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                        : 'bg-destructive/10 border-destructive/20'
                                }`}
                            >
                                <span
                                    className={`inline-flex items-center gap-1 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wider shrink-0 ${
                                        isDo
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-destructive text-white shadow-xs'
                                    }`}
                                >
                                    {isDo ? (
                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                    ) : (
                                        <XCircle className="h-3 w-3 shrink-0" />
                                    )}
                                    {example.badge}
                                </span>

                                <span
                                    className={`text-[11px] font-semibold truncate text-right ${
                                        isDo
                                            ? 'text-emerald-700 dark:text-emerald-400'
                                            : 'text-destructive'
                                    }`}
                                >
                                    {example.statusText}
                                </span>
                            </div>

                            {/* Image Thumbnail Container */}
                            <div className="relative aspect-square w-full bg-muted/40 overflow-hidden">
                                <Image
                                    src={example.image}
                                    alt={example.alt}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, 33vw"
                                />
                                <div
                                    className={`absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-center backdrop-blur-md shadow-sm truncate ${
                                        isDo
                                            ? 'bg-emerald-800/85 text-white'
                                            : 'bg-destructive/85 text-white'
                                    }`}
                                >
                                    {example.subtitle}
                                </div>
                            </div>

                            {/* Bullet Checklist */}
                            <div className="p-2.5 text-xs space-y-1 flex-1 flex flex-col justify-between">
                                <ul className="space-y-1 text-muted-foreground text-[10.5px] leading-snug">
                                    {example.points.map((pt, pIdx) => (
                                        <li key={pIdx} className="flex items-start gap-1.5">
                                            <span
                                                className={`mt-0.5 text-[11px] font-bold leading-none shrink-0 ${
                                                    isDo ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                                                }`}
                                            >
                                                {isDo ? '✓' : '✗'}
                                            </span>
                                            <span>{pt}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/**
 * Modal Dialog Trigger for Photo Guidelines (Optional standalone trigger)
 */
export function PhotoGuidelinesModal({
    roleLabel = 'athlete',
    buttonText = 'Photo requirements & examples',
}: {
    roleLabel?: 'athlete' | 'coach' | 'organizer'
    buttonText?: string
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                    <HelpCircle className="h-3 w-3 shrink-0" />
                    <span>{buttonText}</span>
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Camera className="h-5 w-5 text-primary" />
                        Official Photo Requirements
                    </DialogTitle>
                </DialogHeader>
                <PhotoGuidelinesVisual roleLabel={roleLabel} />
            </DialogContent>
        </Dialog>
    )
}
