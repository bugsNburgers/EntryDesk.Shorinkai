// ============================================================================
// EntryDesk — Dashboard 404 Page
// Shows within the dashboard frame (sidebar visible) when a dashboard sub-route
// is not found (e.g. /dashboard/events/nonexistent-id)
// ============================================================================

import Link from 'next/link'
import { LayoutDashboard, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardNotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8 text-center dark:border-white/[0.08]">
            {/* Big 404 */}
            <p className="text-7xl font-extrabold tabular-nums text-muted-foreground/15 select-none leading-none mb-4">
                404
            </p>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-6 w-6 text-muted-foreground" />
            </div>

            <h2 className="text-xl font-bold text-foreground">Page not found</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                This page doesn&apos;t exist or may have been removed.
            </p>

            <Button asChild className="mt-7 gap-2">
                <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Back to dashboard
                </Link>
            </Button>
        </div>
    )
}
