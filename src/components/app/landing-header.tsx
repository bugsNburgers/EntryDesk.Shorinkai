'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppNavLink } from '@/components/app/nav-link'
import { ThemeSwitch } from '@/components/app/theme-toggle'

export function LandingHeader() {
    const [hasScrolled, setHasScrolled] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        const onScroll = () => {
            setHasScrolled(window.scrollY > 24)
        }

        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        let isMounted = true

        const resolveSession = async () => {
            try {
                const res = await fetch('/api/auth/session')
                if (res.ok) {
                    const data = await res.json()
                    if (isMounted) {
                        setIsLoggedIn(Boolean(data.authenticated))
                    }
                }
            } catch {
                if (isMounted) setIsLoggedIn(false)
            }
        }

        resolveSession()

        return () => {
            isMounted = false
        }
    }, [])

    const headerClassName = hasScrolled
        ? 'fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-md transition-colors duration-300 dark:border-white/[0.08] dark:bg-background/60'
        : 'fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-sky-950/6 backdrop-blur-[1px] transition-colors duration-300'

    const navLinkClassName = hasScrolled
        ? 'hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted/35 hover:text-foreground active:scale-95 sm:inline-flex'
        : 'hidden rounded-md px-3 py-2 text-sm text-white/90 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95 sm:inline-flex'

    const brandTextClassName = hasScrolled ? 'text-sm font-semibold' : 'text-sm font-semibold text-white/95'

    return (
        <header className={headerClassName}>
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 xl:max-w-[95vw] xl:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border/50 bg-background/70 dark:border-white/[0.12]">
                        <Image src="/favicon.ico" alt="EntryDesk logo" fill className="object-cover" sizes="32px" priority />
                    </div>
                    <span className={brandTextClassName}>EntryDesk</span>
                </Link>

                <nav className="flex items-center gap-2">
                    <a href="#features" className={navLinkClassName}>
                        Features
                    </a>
                    <a href="#upcoming-events" className={navLinkClassName}>
                        Events
                    </a>
                    <a
                        href="https://honorlog.shorinkai.in"
                        target="_blank"
                        rel="noreferrer"
                        className={navLinkClassName}
                    >
                        Student Portal
                    </a>
                    <a href="#contact" className={navLinkClassName}>
                        Contact
                    </a>
                    <ThemeSwitch />
                    {isLoggedIn ? (
                        <AppNavLink href="/dashboard">
                            <Button size="sm" className="transition-all duration-200 hover:bg-primary/85 hover:text-primary-foreground active:scale-95 active:bg-primary/75">
                                Dashboard
                            </Button>
                        </AppNavLink>
                    ) : (
                        <AppNavLink href="/login">
                            <Button size="sm" className="transition-all duration-200 hover:bg-primary/85 hover:text-primary-foreground active:scale-95 active:bg-primary/75">
                                Sign In
                            </Button>
                        </AppNavLink>
                    )}
                </nav>
            </div>
        </header>
    )
}