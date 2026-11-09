// ============================================================================
// EntryDesk — Parent Children & Entries Loading State
// Skeleton for individual child/entry pages within the parent portal.
// ============================================================================

import { Skeleton } from '@/components/ui/skeleton'

export default function ParentChildLoading() {
    return (
        <div className="space-y-5">
            {/* Back link skeleton */}
            <Skeleton className="h-4 w-36" />

            {/* Child profile card skeleton */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-[72px] w-[72px] rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                </div>
            </div>

            {/* Entry list skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-56" />
                        <Skeleton className="h-8 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    )
}
