'use client'

import { usePathname } from 'next/navigation'
import { SiteFooter } from '@/components/app/site-footer'

function shouldHideFooter(pathname: string) {
    // Keep login, portal, and dashboard UX clean and focused.
    if (pathname === '/login' || pathname.startsWith('/login/')) return true
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true
    if (pathname === '/parent' || pathname.startsWith('/parent/')) return true
    if (pathname === '/athlete' || pathname.startsWith('/athlete/')) return true

    // Auth callback/signout routes should remain minimal.
    if (pathname === '/auth/callback' || pathname === '/auth/signout') return true

    return false
}

export function SiteFooterGate() {
    const pathname = usePathname()

    if (shouldHideFooter(pathname)) return null

    return <SiteFooter />
}
