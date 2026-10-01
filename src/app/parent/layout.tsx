// ============================================================================
// EntryDesk — Parent Portal Layout
// src/app/parent/layout.tsx
// Minimal mobile-first layout for parents. No sidebar. Clean top nav.
// ============================================================================

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentSession } from '@/lib/auth/session'
import { ThemeSwitch } from '@/components/app/theme-toggle'
import { ParentPortalNav } from '@/components/parent/portal-nav'

export const metadata: Metadata = {
    title: 'Competitor Portal — EntryDesk',
    description: 'Register for karate tournaments and manage your profile.',
}

export default async function ParentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getCurrentSession()

    if (!session) {
        redirect('/login?callbackUrl=/athlete')
    }

    // Coaches/organisers/admins should use /dashboard, not /parent
    if (session.user.role !== 'parent') {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Top navigation bar */}
            <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur dark:border-white/[0.08]">
                <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
                    <Link href="/athlete" className="flex items-center gap-2">
                        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border/50 bg-background/70">
                            <Image src="/favicon.ico" alt="EntryDesk" fill className="object-cover" sizes="28px" />
                        </div>
                        <span className="text-sm font-semibold">EntryDesk</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <ThemeSwitch />
                        <ParentPortalNav
                            userEmail={session.user.email}
                            userName={session.user.full_name}
                            userAvatar={session.user.avatar_url}
                        />
                    </div>
                </div>
            </header>

            {/* Page content — padded below the fixed header */}
            <main className="mx-auto max-w-xl px-4 pt-20 pb-24">
                {children}
            </main>
        </div>
    )
}
