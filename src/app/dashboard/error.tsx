'use client'

// ============================================================================
// EntryDesk — Dashboard Error Boundary
// Catches errors in all /dashboard/* routes.
// Renders inside the dashboard frame so the sidebar remains visible.
// ============================================================================

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('[DashboardError]', error.message, error.digest)
    }, [error])

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>

            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                An unexpected error occurred on this page. Your data is safe — try refreshing
                the page or going back to the dashboard.
            </p>

            {error.digest && (
                <p className="mt-2 font-mono text-xs text-muted-foreground/60">
                    Error ref: {error.digest}
                </p>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                    onClick={() => {
                        reset()
                        window.location.reload()
                    }}
                    variant="destructive"
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
                <Button variant="outline" asChild className="gap-2">
                    <Link href="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        Back to dashboard
                    </Link>
                </Button>
            </div>
        </div>
    )
}
