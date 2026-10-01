import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

// Routes that require authentication (any role)
const PROTECTED_PREFIXES = ['/dashboard', '/parent', '/athlete']

// Routes that must always be public (no auth required, no redirect)
// /join/:slug — dojo join landing pages
// /v/:token    — QR verification pages (scanned at venue)
// /login       — login page
// /auth        — OAuth callback
// /contact     — public contact form
// /privacy, /terms — static pages
// /api/public-* — public APIs

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Immediately redirect any legacy /parent routes to clean /athlete routes
    if (pathname === '/parent' || pathname.startsWith('/parent/')) {
        let newPath = pathname.replace(/^\/parent\/children\/new/, '/athlete/new')
        newPath = newPath.replace(/^\/parent\/children\//, '/athlete/')
        newPath = newPath.replace(/^\/parent\/entries\//, '/athlete/entries/')
        newPath = newPath.replace(/^\/parent/, '/athlete')
        const redirectUrl = new URL(newPath + request.nextUrl.search, request.url)
        return NextResponse.redirect(redirectUrl, { status: 307 })
    }

    // 2. Normalize any /athlete/children URLs to /athlete
    if (pathname.startsWith('/athlete/children/new')) {
        const redirectUrl = new URL(pathname.replace(/^\/athlete\/children\/new/, '/athlete/new') + request.nextUrl.search, request.url)
        return NextResponse.redirect(redirectUrl, { status: 307 })
    }
    if (pathname.startsWith('/athlete/children/')) {
        const redirectUrl = new URL(pathname.replace(/^\/athlete\/children\//, '/athlete/') + request.nextUrl.search, request.url)
        return NextResponse.redirect(redirectUrl, { status: 307 })
    }

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

    if (isProtected && !sessionCookie) {
        const loginUrl = new URL('/login', request.url)
        // Preserve the original URL so we can redirect back after login
        loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    // Match all protected routes. Public routes (/join, /v, /login, etc.) are NOT matched
    // so they are always accessible without any middleware processing.
    matcher: ['/dashboard/:path*', '/parent', '/parent/:path*', '/athlete', '/athlete/:path*'],
}

