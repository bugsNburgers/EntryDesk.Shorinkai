import Link from 'next/link'
import Image from 'next/image'
import { Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// EntryDesk — Global 404 Not Found Page
// Shown whenever notFound() is called or a route doesn't exist.
// ============================================================================

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            {/* Logo */}
            <div className="relative mb-8 h-12 w-12 overflow-hidden rounded-xl border border-border/50 bg-background/70">
                <Image src="/favicon.ico" alt="EntryDesk" fill className="object-cover" sizes="48px" />
            </div>

            {/* 404 Number */}
            <p className="text-8xl font-extrabold tabular-nums text-muted-foreground/20 select-none leading-none mb-4">
                404
            </p>

            {/* Copy */}
            <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
                The page you&apos;re looking for doesn&apos;t exist or may have been moved.
                Check the URL and try again.
            </p>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild className="gap-2">
                    <Link href="/">
                        <Home className="h-4 w-4" />
                        Go home
                    </Link>
                </Button>
                <Button variant="outline" asChild className="gap-2">
                    <Link href="/dashboard">
                        <Search className="h-4 w-4" />
                        Back to dashboard
                    </Link>
                </Button>
            </div>

            <p className="mt-10 text-xs text-muted-foreground/60">
                EntryDesk · Tournament management for martial arts dojos
            </p>
        </div>
    )
}
