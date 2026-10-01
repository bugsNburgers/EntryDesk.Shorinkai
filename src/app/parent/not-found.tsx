// ============================================================================
// EntryDesk — Parent Portal 404 Page
// Shows within the parent portal layout (top nav visible) when a parent
// sub-route is not found (e.g. /parent/children/invalid-id)
// ============================================================================

import Link from 'next/link'
import { Home, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ParentNotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            {/* Icon */}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-7 w-7 text-muted-foreground" />
            </div>

            <p className="text-6xl font-extrabold tabular-nums text-muted-foreground/15 select-none leading-none mb-4">
                404
            </p>

            <h2 className="text-xl font-bold text-foreground">Not found</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                This page doesn&apos;t exist, or you may not have access to it.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild className="gap-2">
                    <Link href="/athlete">
                        <Home className="h-4 w-4" />
                        My Profile(s)
                    </Link>
                </Button>
            </div>
        </div>
    )
}
