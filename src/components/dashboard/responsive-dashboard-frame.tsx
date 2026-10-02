'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Calendar,
    CheckCircle2,
    Building2,
    Users,
    FileText,
    Inbox,
    Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardNavLink } from '@/components/dashboard/nav-link'
import { SignOutForm } from '@/components/dashboard/signout-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/app/theme-toggle'
import { MobileNav } from '@/components/dashboard/mobile-nav'

type ResponsiveDashboardFrameProps = {
    children: React.ReactNode
    role: string
    roleLabel: string
    profileFullName: string | null
    userEmail: string
}

/** Deterministic avatar background color from name string */
function getAvatarColor(name: string): string {
    const colors = [
        'from-emerald-500 to-teal-600',
        'from-blue-500 to-indigo-600',
        'from-violet-500 to-purple-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-pink-600',
        'from-cyan-500 to-sky-600',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]!
}

/** Readable page title from pathname */
function getPageTitle(pathname: string, role: string): string {
    if (pathname === '/dashboard') return 'Home'
    if (pathname.startsWith('/dashboard/events-browser')) return 'Events'
    if (pathname.startsWith('/dashboard/events')) return 'Events'
    if (pathname.startsWith('/dashboard/approvals')) return 'Approvals'
    if (pathname.startsWith('/dashboard/dojos')) return 'My Dojos'
    if (pathname.startsWith('/dashboard/students')) return 'Students'
    if (pathname.startsWith('/dashboard/parent-entries')) return 'Parent & Athlete Entries'
    if (pathname.startsWith('/dashboard/entries')) return 'My Entries'
    return 'Dashboard'
}

import { NavProvider, DashboardContentShell } from '@/components/dashboard/nav-context'

export function ResponsiveDashboardFrame({
    children,
    role,
    roleLabel,
    profileFullName,
    userEmail,
}: ResponsiveDashboardFrameProps) {
    const [sidebarOpen, setSidebarOpen] = React.useState(true)
    const pathname = usePathname()

    const displayName = profileFullName || userEmail || 'User'
    const initials = (profileFullName || userEmail || 'U').slice(0, 2).toUpperCase()
    const avatarGradient = getAvatarColor(displayName)
    const pageTitle = getPageTitle(pathname, role)

    return (
        <NavProvider>
            <div className="dashboard-shell min-h-screen w-full relative">
                {/* Background grid */}
                <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                    <div className="absolute left-0 bottom-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
                </div>

                <div className="flex min-h-screen w-full">
                {/* ─── Desktop Sidebar ─── */}
                <aside
                    className={cn(
                        'hidden flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl px-3 py-5 md:flex sticky top-0 h-screen transition-all duration-200 ease-in-out dark:bg-background/60 dark:border-white/[0.08]',
                        sidebarOpen ? 'w-64 opacity-100' : 'w-0 px-0 py-0 border-r-0 overflow-hidden opacity-0',
                    )}
                >
                    {/* Brand header */}
                    <div className="flex items-center justify-between gap-3 mb-6 px-2">
                        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-accent/60">
                            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-border bg-card dark:border-white/[0.12] shrink-0 shadow-2xs">
                                <Image src="/favicon.ico" alt="EntryDesk logo" fill className="object-cover" sizes="36px" priority />
                            </div>
                            <div className="leading-tight min-w-0">
                                <div className="text-sm font-bold tracking-tight text-foreground">EntryDesk</div>
                                <div className="text-[11px] text-muted-foreground font-medium capitalize">{roleLabel}</div>
                            </div>
                        </Link>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            aria-label="Close sidebar"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Nav links */}
                    <nav className="flex flex-1 flex-col gap-1 px-1">
                        {/* Home — standalone, no group header */}
                        <DashboardNavLink href="/dashboard">
                            <LayoutDashboard className="h-4 w-4" />
                            Home
                        </DashboardNavLink>

                        {/* Workspace section */}
                        <div className="mt-4 mb-1 px-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                {role === 'organizer' ? 'Manage' : 'My Workspace'}
                            </p>
                        </div>

                        {role === 'organizer' ? (
                            <>
                                <DashboardNavLink href="/dashboard/events">
                                    <Calendar className="h-4 w-4" />
                                    Events
                                </DashboardNavLink>
                                <DashboardNavLink href="/dashboard/approvals">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Approvals
                                </DashboardNavLink>
                            </>
                        ) : (
                            <>
                                <DashboardNavLink href="/dashboard/events-browser">
                                    <Calendar className="h-4 w-4" />
                                    Events
                                </DashboardNavLink>
                                <DashboardNavLink href="/dashboard/dojos">
                                    <Building2 className="h-4 w-4" />
                                    My Dojos
                                </DashboardNavLink>
                                <DashboardNavLink href="/dashboard/students">
                                    <Users className="h-4 w-4" />
                                    Athletes
                                </DashboardNavLink>
                                <DashboardNavLink href="/dashboard/entries">
                                    <FileText className="h-4 w-4" />
                                    My Entries
                                </DashboardNavLink>
                            </>
                        )}
                    </nav>

                    {/* ─── User profile footer ─── */}
                    <div className="mt-auto border-t border-border/50 pt-4 px-1 dark:border-white/[0.07]">
                        {/* Role pill + theme toggle */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                    role === 'organizer'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                )}
                            >
                                {role}
                            </span>
                            <ThemeSwitch className="scale-[0.85]" />
                        </div>

                        {/* Avatar + name + email */}
                        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-accent/40 transition-colors">
                            <div
                                className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ring-2 ring-background dark:ring-background/50',
                                    avatarGradient
                                )}
                            >
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium leading-tight">{profileFullName || 'User'}</div>
                                <div className="truncate text-xs text-muted-foreground leading-tight">{userEmail}</div>
                            </div>
                        </div>

                        {/* Sign out */}
                        <div className="mt-2 px-1">
                            <SignOutForm />
                        </div>
                    </div>
                </aside>

                {/* ─── Main content ─── */}
                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Mobile topbar */}
                    <div className="sticky top-0 z-[40] border-b border-border/80 bg-sidebar/95 backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/80 md:hidden dark:bg-background/70 dark:border-white/[0.05]">
                        <div className="flex h-14 items-center justify-between px-4">
                            <div className="flex items-center gap-2">
                                <MobileNav role={role} profile={{ full_name: profileFullName }} userEmail={userEmail} />
                                <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent/50">
                                    <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border bg-card dark:border-white/[0.12] shadow-2xs">
                                        <Image src="/favicon.ico" alt="EntryDesk logo" fill className="object-cover" sizes="28px" priority />
                                    </div>
                                    <span className="text-sm font-bold tracking-tight text-foreground">EntryDesk</span>
                                </Link>
                            </div>

                            {/* Current page name — tells user where they are */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">{pageTitle}</span>
                                <ThemeSwitch className="scale-[0.85]" />
                            </div>
                        </div>
                    </div>

                    <main className="flex-1 px-3 py-6 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
                        {/* Open sidebar button when collapsed (desktop) */}
                        {!sidebarOpen ? (
                            <div className="mb-4 hidden md:flex">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label="Open sidebar"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : null}

                        <div className="w-full max-w-[1680px] 2xl:max-w-[1800px] mx-auto relative">
                            <DashboardContentShell>{children}</DashboardContentShell>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    </NavProvider>
    )
}
