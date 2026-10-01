// ============================================================================
// EntryDesk — Parent Entries Queue Loading State
// Skeleton for /dashboard/parent-entries while data is loading.
// ============================================================================

import { Skeleton } from '@/components/ui/skeleton'

export default function ParentEntriesLoading() {
    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="space-y-1.5">
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-4 w-80" />
            </div>

            {/* Stat badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
                        <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-8 w-12" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <Skeleton className="h-10 w-40 rounded-xl" />
                <Skeleton className="h-10 w-20 rounded-xl" />
            </div>

            {/* Table skeleton */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="border-b bg-muted/40 p-3 flex gap-6">
                    {['Athlete', 'Parent', 'Tournament', 'Category', 'Status', 'Actions'].map((h) => (
                        <Skeleton key={h} className="h-3.5 w-20" />
                    ))}
                </div>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                        <Skeleton className="h-4 w-4 rounded shrink-0" />
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-3 w-32 hidden sm:block" />
                        <Skeleton className="h-3 w-28 hidden md:block" />
                        <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
                        <div className="flex gap-2 ml-auto">
                            <Skeleton className="h-8 w-20 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
