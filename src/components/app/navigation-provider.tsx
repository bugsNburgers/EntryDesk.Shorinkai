'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { KarateLoader } from '@/components/ui/karate-loader'

type NavigationContextValue = {
    beginNavigation: (options?: {
        title?: string
        subtitle?: string
    }) => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function useAppNavigation() {
    const ctx = useContext(NavigationContext)
    if (!ctx) throw new Error('useAppNavigation must be used within AppNavigationProvider')
    return ctx
}

const MIN_VISIBLE_MS = 200
const COMPLETE_VISIBLE_MS = 250
const FAILSAFE_HIDE_MS = 12_000
const PROGRESS_TICK_MS = 120

export function AppNavigationProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const routeKey = `${pathname}?${searchParams.toString()}`

    const [isNavigating, setIsNavigating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [message, setMessage] = useState<{ title: string; subtitle?: string }>({
        title: 'Changing stances...',
        subtitle: 'Moving to the next section',
    })
    const startedAtRef = useRef<number | null>(null)
    const fromPathRef = useRef<string | null>(null)
    const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopProgressTimer = useCallback(() => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current)
            progressTimerRef.current = null
        }
    }, [])

    const hide = useCallback(() => {
        const startedAt = startedAtRef.current
        const elapsed = startedAt ? Date.now() - startedAt : MIN_VISIBLE_MS
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

        if (failsafeTimerRef.current) {
            clearTimeout(failsafeTimerRef.current)
            failsafeTimerRef.current = null
        }

        window.setTimeout(() => {
            setIsNavigating(false)
            setProgress(0)
            startedAtRef.current = null
            fromPathRef.current = null
        }, remaining)
    }, [])

    const beginNavigation = useCallback((options?: { title?: string; subtitle?: string }) => {
        // Dashboard uses route-level loading.tsx for correct “no blank gap” behavior.
        // Avoid overlay loaders inside /dashboard entirely.
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) return

        if (isNavigating) return

        setMessage({
            title: options?.title ?? 'Changing stances...',
            subtitle: options?.subtitle ?? 'Moving to the next section',
        })

        startedAtRef.current = Date.now()
        fromPathRef.current = routeKey
        setProgress(10)
        setIsNavigating(true)

        stopProgressTimer()
        progressTimerRef.current = setInterval(() => {
            setProgress((p) => {
                if (p >= 90) return p
                const remaining = 90 - p
                const step = Math.max(0.8, remaining * 0.08)
                return Math.min(90, p + step)
            })
        }, PROGRESS_TICK_MS)

        if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
        failsafeTimerRef.current = setTimeout(() => {
            setIsNavigating(false)
            setProgress(0)
            startedAtRef.current = null
            fromPathRef.current = null
            failsafeTimerRef.current = null
            stopProgressTimer()
        }, FAILSAFE_HIDE_MS)
    }, [isNavigating, routeKey, stopProgressTimer])

    useEffect(() => {
        const onClickCapture = (event: MouseEvent) => {
            if (event.defaultPrevented) return
            if (event.button !== 0) return
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

            const target = event.target
            if (!(target instanceof Element)) return

            const anchor = target.closest('a[href]') as HTMLAnchorElement | null
            if (!anchor) return

            // Opt-out escape hatch for special cases.
            if (anchor.hasAttribute('data-no-global-loader')) return

            const hrefAttr = anchor.getAttribute('href')
            if (!hrefAttr) return
            if (hrefAttr.startsWith('#')) return
            if (hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:')) return
            if (anchor.hasAttribute('download')) return

            const targetAttr = anchor.getAttribute('target')
            if (targetAttr && targetAttr !== '_self') return

            // Only handle same-origin navigation.
            let nextUrl: URL
            try {
                nextUrl = new URL(hrefAttr, window.location.href)
            } catch {
                return
            }

            if (nextUrl.origin !== window.location.origin) return

            const currentKey = `${window.location.pathname}${window.location.search}`
            const nextKey = `${nextUrl.pathname}${nextUrl.search}`

            // No-op (same route): don't show a loader.
            if (nextKey === currentKey) return

            // Dashboard routes use route-level loaders to avoid blank states.
            if (nextUrl.pathname.startsWith('/dashboard')) return

            beginNavigation()
        }

        document.addEventListener('click', onClickCapture, true)
        return () => document.removeEventListener('click', onClickCapture, true)
    }, [beginNavigation])

    useEffect(() => {
        if (!isNavigating) return

        const fromPath = fromPathRef.current
        if (!fromPath) return

        if (routeKey !== fromPath) {
            stopProgressTimer()
            setProgress(100)
            window.setTimeout(() => {
                hide()
            }, COMPLETE_VISIBLE_MS)
        }
    }, [routeKey, isNavigating, hide, stopProgressTimer])

    useEffect(() => {
        return () => {
            if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
            stopProgressTimer()
        }
    }, [stopProgressTimer])

    const value = useMemo(() => ({ beginNavigation }), [beginNavigation])

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    )
}
