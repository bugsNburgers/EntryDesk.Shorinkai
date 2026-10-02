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
        <div
            className="min-h-screen bg-[#f7f4ec] text-[#1c1917] dark:bg-[#0a1220] dark:text-[#e8eef5] transition-colors"
            style={{ fontFamily: '"Google Sans", "Product Sans", system-ui, sans-serif' }}
        >
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap"
            />
            {/* Top navigation bar */}
            <header className="fixed inset-x-0 top-0 z-50 border-b border-[#ded8cb] bg-[#f7f4ec]/90 backdrop-blur dark:border-[#1f2b40] dark:bg-[#0a1220]/90">
                <div className="mx-auto flex h-14 w-full max-w-[1600px] 2xl:max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
                    <Link href="/athlete" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-[#ded8cb] bg-white dark:border-[#1f2b40] dark:bg-[#111a2b] shadow-2xs">
                            <Image src="/favicon.ico" alt="EntryDesk" fill className="object-cover" sizes="28px" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-[#1c1917] dark:text-[#e8eef5]">EntryDesk</span>
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
            <main className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1720px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-18 pb-20">
                {children}
            </main>
        </div>
    )
}
