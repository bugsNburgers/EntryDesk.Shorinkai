import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 p-6 rounded-2xl border bg-card shadow-sm">
                <div className="space-y-2 text-center">
                    <Skeleton className="h-7 w-32 mx-auto rounded-lg" />
                    <Skeleton className="h-4 w-48 mx-auto rounded-md" />
                </div>
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
