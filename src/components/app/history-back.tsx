'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppNavigation } from '@/components/app/navigation-provider'
import { cn } from '@/lib/utils'

type HistoryBackCommonProps = {
    fallbackHref?: string
}

async function checkIsAuthenticated(): Promise<boolean> {
    try {
        const res = await fetch('/api/auth/session')
        if (!res.ok) return false
        const data = await res.json()
        return Boolean(data.authenticated)
    } catch {
        return false
    }
}

export function HistoryBackIconButton({
    fallbackHref,
    className,
    ...props
}: HistoryBackCommonProps & React.ComponentProps<typeof Button>) {
    const router = useRouter()
    const { beginNavigation } = useAppNavigation()

    const handleBack = React.useCallback(() => {
        void (async () => {
            if (typeof window === 'undefined') return

            beginNavigation()

            // If logged out, never go back into potentially protected history.
            const isAuthed = await checkIsAuthenticated()
            if (!isAuthed) {
                router.push('/')
                return
            }

            // If the page was opened directly (new tab), history might not have an entry.
            if (window.history.length <= 1) {
                router.push(fallbackHref ?? '/dashboard')
                return
            }

            router.back()
        })()
    }, [beginNavigation, fallbackHref, router])

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={handleBack}
            className={cn(className)}
            {...props}
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>
    )
}

export function HistoryBackTextButton({
    fallbackHref,
    className,
    children,
    ...props
}: HistoryBackCommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const router = useRouter()
    const { beginNavigation } = useAppNavigation()

    const handleBack = React.useCallback(() => {
        void (async () => {
            if (typeof window === 'undefined') return

            beginNavigation()

            const isAuthed = await checkIsAuthenticated()
            if (!isAuthed) {
                router.push('/')
                return
            }

            if (window.history.length <= 1) {
                router.push(fallbackHref ?? '/dashboard')
                return
            }

            router.back()
        })()
    }, [beginNavigation, fallbackHref, router])

    return (
        <button
            type="button"
            onClick={handleBack}
            className={cn(
                'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    )
}
