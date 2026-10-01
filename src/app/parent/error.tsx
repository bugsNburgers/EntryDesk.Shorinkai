'use client'

// ============================================================================
// EntryDesk — Parent Portal Error Boundary
// Catches errors in all /parent/* routes.
// Renders inside the parent portal layout (top nav still visible).
// ============================================================================

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function ParentError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('[ParentPortalError]', error.message, error.digest)
    }, [error])

    // Special handling for expired session errors — tell the parent clearly what happened
    const isSessionError =
        error.message?.toLowerCase().includes('session') ||
        error.message?.toLowerCase().includes('unauthorized') ||
        error.message?.toLowerCase().includes('unauthenticated')

    if (isSessionError) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold">Session expired</h2>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                    Your session has expired. Please sign in again — you&apos;ll be sent right
                    back to where you were.
                </p>
                <Button asChild className="mt-7 gap-2">
                    <Link href="/login?callbackUrl=/athlete">
                        Sign in again
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>

            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                An unexpected error occurred. Your information is safe. Please try again or
                go back to your athlete list.
            </p>

            {error.digest && (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground/60">
                    Ref: {error.digest}
                </p>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
                <Button variant="outline" asChild className="gap-2">
                    <Link href="/athlete">
                        <Home className="h-4 w-4" />
                        My Profile(s)
                    </Link>
                </Button>
            </div>
        </div>
    )
}
