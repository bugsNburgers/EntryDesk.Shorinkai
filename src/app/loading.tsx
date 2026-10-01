import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48 rounded-lg" />
                <Skeleton className="h-4 w-72 rounded-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
    )
}
