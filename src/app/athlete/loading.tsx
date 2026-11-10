// ============================================================================
// EntryDesk — Parent Portal Home Loading State
// Skeleton for the kid-picker while children data is fetching.
// ============================================================================

import { Skeleton } from '@/components/ui/skeleton'

export default function ParentHomeLoading() {
    return (
        <div className="space-y-5">
            {/* Header skeleton */}
            <div className="flex items-center justify-between pt-1">
                <div className="space-y-1.5">
                    <Skeleton className="h-7 w-36" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-28 rounded-full" />
            </div>

            {/* Child card skeletons */}
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-[52px] w-[52px] rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-4 w-10" />
                                </div>
                                <Skeleton className="h-3 w-40" />
                                <Skeleton className="h-5 w-32 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
