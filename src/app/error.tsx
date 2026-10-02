'use client'

// ============================================================================
// EntryDesk — Root Error Boundary
// Catches unhandled errors in the root layout segment.
// Shows a friendly fallback UI with a "Try again" button.
// ============================================================================

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function RootError({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        // Log to console in dev; in production this would go to an error tracker
        console.error('[RootError]', error.message, error.digest)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="mx-auto max-w-sm">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>

                {/* Heading */}
                <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    We hit an unexpected error. This has been logged and we&apos;ll look into it.
                    Please try again, or go back home.
                </p>

                {/* Error digest for support */}
                {error.digest && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground/60">
                        Ref: {error.digest}
                    </p>
                )}

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                        onClick={() => {
                            reset()
                            window.location.reload()
                        }}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                        <Link href="/">
                            <Home className="h-4 w-4" />
                            Go home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
