'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trophy, Loader2 } from 'lucide-react'

interface ChildCardItemProps {
    child: {
        id: string
        name: string
        gender: string
        rank: string | null
        photo_url: string | null
        dojo_name: string | null
        entry_count: number
    }
    latestStatus: {
        label: string
        bgClass: string
        eventTitle?: string
        status?: string
    } | null
}

export function ChildCardItem({ child, latestStatus }: ChildCardItemProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isSelected, setIsSelected] = useState(false)

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        setIsSelected(true)
        startTransition(() => {
            // Next.js client transition
        })
    }

    return (
        <Link
            href={`/athlete/${child.id}`}
            prefetch={true}
            onClick={handleClick}
            className={`block relative overflow-hidden rounded-[16px] border bg-white dark:bg-[#111a2b] p-4 shadow-xs hover:shadow-md transition-all duration-150 active:scale-[0.98] ${
                isSelected || isPending
                    ? 'border-[#0d9488] ring-2 ring-[#0d9488]/30 dark:border-[#2dd4b4] dark:ring-[#2dd4b4]/30 shadow-md'
                    : 'border-[#ded8cb] hover:border-[#0d9488]/50 hover:bg-[#faf8f3] dark:border-[#1f2b40] dark:hover:border-[#2dd4b4]/50 dark:hover:bg-[#131e32]'
            }`}
        >
            {/* Top subtle selection indicator strip when clicked */}
            {(isSelected || isPending) && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0d9488] to-[#0d9488]/60 dark:from-[#2dd4b4] dark:to-[#2dd4b4]/60 animate-pulse" />
            )}

            <div className="flex items-center gap-3.5">
                {/* Avatar matching Portal.dc.html */}
                <div className="relative shrink-0">
                    {child.photo_url ? (
                        <div className="relative h-[54px] w-[54px] rounded-full overflow-hidden border-2 border-[#0d9488] bg-[#f2eee5] dark:border-[#2dd4b4] dark:bg-[#16233a] shadow-2xs">
                            <Image
                                src={child.photo_url}
                                alt={child.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-[#0d9488] bg-[#f2eee5] dark:border-[#2dd4b4] dark:bg-[#16233a] shadow-2xs">
                            <span className="text-xl font-bold text-[#0d9488] dark:text-[#2dd4b4]">
                                {child.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    {/* Instant spinner overlay on avatar when selected */}
                    {(isSelected || isPending) && (
                        <div className="absolute inset-0 bg-black/40 dark:bg-[#0a1220]/70 rounded-full flex items-center justify-center">
                            <Loader2 className="h-5 w-5 text-white dark:text-[#2dd4b4] animate-spin" />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-[16.5px] truncate text-[#1c1917] dark:text-[#e8eef5]">{child.name}</p>
                                {(isSelected || isPending) && (
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#0d9488]/15 dark:text-[#2dd4b4] dark:bg-[#2dd4b4]/15 px-1.5 py-0.5 rounded animate-pulse">
                                        Loading...
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {child.rank && (
                                    <span className="text-xs text-[#57534e] dark:text-[#8a99ab] font-medium">{child.rank}</span>
                                )}
                                {child.dojo_name && (
                                    <span className="text-xs text-[#57534e] dark:text-[#8a99ab] truncate">
                                        {child.rank ? '· ' : ''}{child.dojo_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Entry counts */}
                        {child.entry_count > 0 && (
                            <div className="flex items-center gap-1 shrink-0 bg-[#eee9df] border border-[#ded8cb] dark:bg-[#16233a] dark:border-[#1f2b40] rounded-md px-2 py-0.5 shadow-2xs">
                                <Trophy className="h-3 w-3 text-[#0d9488] dark:text-[#2dd4b4]" />
                                <span className="text-xs font-semibold text-[#1c1917] dark:text-[#8a99ab]">
                                    {child.entry_count}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Latest status pill */}
                    {latestStatus && (() => {
                        const statusKey = latestStatus.status?.toLowerCase() || ''
                        const labelLower = latestStatus.label.toLowerCase()
                        const isAccepted = statusKey === 'approved' || labelLower.includes('accept') || labelLower.includes('approved')
                        const isRejected = statusKey === 'rejected' || statusKey === 'coach_declined' || labelLower.includes('reject') || labelLower.includes('declined') || labelLower.includes('not accept')
                        const isCorrection = statusKey === 'correction_needed' || labelLower.includes('correct')

                        const badgeColorClasses = isAccepted
                            ? 'bg-[#dcfce7] text-[#14532d] border border-[#86efac] dark:text-[#2dd4b4] dark:bg-[#2dd4b4]/12 dark:border-[#2dd4b4]/35'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:text-[#f87171] dark:bg-[#f87171]/12 dark:border-[#f87171]/35'
                            : isCorrection
                            ? 'bg-orange-100 text-orange-800 border border-orange-300 dark:text-[#fb923c] dark:bg-[#fb923c]/12 dark:border-[#fb923c]/35'
                            : 'bg-amber-100 text-amber-800 border border-amber-300 dark:text-[#f5c542] dark:bg-[#f5c542]/12 dark:border-[#f5c542]/35'

                        return (
                            <div className="mt-2.5">
                                <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${badgeColorClasses}`}>
                                    {latestStatus.label}
                                    {latestStatus.eventTitle && (
                                        <span className="ml-1 opacity-80 truncate max-w-[140px]">
                                            · {latestStatus.eventTitle}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )
                    })()}
                </div>
            </div>
        </Link>
    )
}
