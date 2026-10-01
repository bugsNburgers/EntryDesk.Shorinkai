'use client'

// ============================================================================
// EntryDesk — Join Dojo Handler
// Client component that processes ?joinedDojo= param on parent home page.
// Shows a welcome toast and stores the pending dojo slug for when they add a child.
// ============================================================================

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface JoinDojoHandlerProps {
    dojoSlug: string
}

export function JoinDojoHandler({ dojoSlug }: JoinDojoHandlerProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Show welcome message and store the pending dojo slug in sessionStorage
        // so the "Add child" form can pre-select the correct dojo
        if (dojoSlug) {
            sessionStorage.setItem('pendingDojoSlug', dojoSlug)
            document.cookie = `parent_dojo_slug=${encodeURIComponent(dojoSlug)}; path=/; max-age=2592000; SameSite=Lax`
            toast.success("You've joined the dojo!", {
                description: 'Add your athlete details below to get started.',
                duration: 6000,
            })

            // Clean the URL without triggering a navigation
            const url = new URL(window.location.href)
            url.searchParams.delete('joinedDojo')
            router.replace(url.pathname + url.search, { scroll: false })
        }
    }, [dojoSlug, router, searchParams])

    return null
}
