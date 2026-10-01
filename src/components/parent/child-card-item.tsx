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
            className={`block relative overflow-hidden rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur transition-all duration-150 active:scale-[0.98] ${
                isSelected || isPending
                    ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                    : 'border-border/50 hover:border-primary/30 hover:shadow-md dark:border-white/[0.08]'
            }`}
        >
            {/* Top subtle selection indicator strip when clicked */}
            {(isSelected || isPending) && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60 animate-pulse" />
            )}

            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                    {child.photo_url ? (
                        <Image
                            src={child.photo_url}
                            alt={child.name}
                            width={52}
                            height={52}
                            className="h-[52px] w-[52px] rounded-xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                            <span className="text-xl font-bold text-primary">
                                {child.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    {/* Instant spinner overlay on avatar when selected */}
                    {(isSelected || isPending) && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold truncate text-foreground">{child.name}</p>
                                {(isSelected || isPending) && (
                                    <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/15 animate-pulse">
                                        Loading...
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {child.rank && (
                                    <span className="text-xs text-muted-foreground">{child.rank}</span>
                                )}
                                {child.dojo_name && (
                                    <span className="text-xs text-muted-foreground truncate">
                                        {child.rank ? '· ' : ''}{child.dojo_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Entry counts */}
                        {child.entry_count > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                                <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    {child.entry_count}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Latest status pill */}
                    {latestStatus && (
                        <div className="mt-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${latestStatus.bgClass}`}>
                                {latestStatus.label}
                                {latestStatus.eventTitle && (
                                    <span className="ml-1 opacity-70 truncate max-w-[120px]">
                                        · {latestStatus.eventTitle}
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
