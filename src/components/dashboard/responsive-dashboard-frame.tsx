'use client'

// ============================================================================
// EntryDesk — Responsive Dashboard Frame (Top Navigation Bar + Mobile Footer Nav)
// Replaces the left sidebar with:
//  - Desktop: Premium Top Navigation Bar with branding, navigation links,
//             theme switch, and user profile dropdown.
//  - Mobile: Fixed Bottom Navigation Bar (Footer Nav) for optimal thumb reach,
//            plus compact top header with branding, theme switch, and profile.
// Clean White & Cream aesthetic in light mode (#f7f4ec canvas + #ffffff surfaces),
// Obsidian dark theme in dark mode (#071222 canvas + #111a2b surfaces).
// ============================================================================

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
    LogOut,
    ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardNavLink } from '@/components/dashboard/nav-link'
import { SignOutForm } from '@/components/dashboard/signout-form'
import { ThemeSwitch } from '@/components/app/theme-toggle'
import { NavProvider, DashboardContentShell, useNavContext } from '@/components/dashboard/nav-context'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ResponsiveDashboardFrameProps = {
    children: React.ReactNode
    role: string
    roleLabel: string
    profileFullName: string | null
    userEmail: string
}

/** Deterministic avatar background gradient from name string */
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

interface NavItemConfig {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
}

function MobileFooterNavItem({ item, isActive }: { item: NavItemConfig; isActive: boolean }) {
    const Icon = item.icon
    const { setPendingPath } = useNavContext()

    return (
        <Link
            href={item.href}
            prefetch={true}
            onClick={() => setPendingPath(item.href)}
            className={cn(
                'relative flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-150 select-none group',
                isActive
                    ? 'text-[#0d9488] dark:text-[#2dd4b4]'
                    : 'text-[#57534e] hover:text-[#1c1917] dark:text-[#8a99ab] dark:hover:text-[#e8eef5]'
            )}
        >
            {/* Top subtle active indicator pill */}
            {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-[#0d9488] dark:bg-[#2dd4b4]" />
            )}

            <div
                className={cn(
                    'p-1 rounded-xl transition-all',
                    isActive ? 'bg-[#0d9488]/10 dark:bg-[#2dd4b4]/15' : 'group-hover:bg-accent/40'
                )}
            >
                <Icon className={cn('h-5 w-5 transition-transform group-active:scale-90', isActive && 'stroke-[2.25]')} />
            </div>
            <span
                className={cn(
                    'text-[10px] tracking-tight mt-0.5 truncate max-w-[68px]',
                    isActive ? 'font-bold' : 'font-medium'
                )}
            >
                {item.label}
            </span>
        </Link>
    )
}

export function ResponsiveDashboardFrame({
    children,
    role,
    roleLabel,
    profileFullName,
    userEmail,
}: ResponsiveDashboardFrameProps) {
    const pathname = usePathname()

    const displayName = profileFullName || userEmail || 'User'
    const initials = (profileFullName || userEmail || 'U').slice(0, 2).toUpperCase()
    const avatarGradient = getAvatarColor(displayName)

    // Navigation item definitions based on role
    const navItems: NavItemConfig[] =
        role === 'organizer'
            ? [
                  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
                  { href: '/dashboard/events', label: 'Events', icon: Calendar },
                  { href: '/dashboard/approvals', label: 'Approvals', icon: CheckCircle2 },
              ]
            : [
                  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
                  { href: '/dashboard/events', label: 'Events', icon: Calendar },
                  { href: '/dashboard/dojos', label: 'My Dojos', icon: Building2 },
                  { href: '/dashboard/students', label: 'Athletes', icon: Users },
              ]

    const isLinkActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard'
        if (href === '/dashboard/events') {
            return (
                pathname === '/dashboard/events' ||
                pathname.startsWith('/dashboard/events/') ||
                pathname.startsWith('/dashboard/events-browser') ||
                pathname.startsWith('/dashboard/entries')
            )
        }
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <NavProvider>
            <div className="dashboard-shell min-h-screen w-full relative bg-[#f7f4ec] text-[#1c1917] dark:bg-[#071222] dark:text-[#e8eef5] transition-colors">
                {/* Subtle Background Pattern */}
                <div className="fixed inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                    <div className="absolute left-1/4 top-0 -z-10 h-[400px] w-[500px] rounded-full bg-[#0d9488]/5 dark:bg-[#2dd4b4]/5 blur-[120px]" />
                </div>

                {/* ========================================================================= */}
                {/* 1. TOP NAVIGATION BAR (Desktop & Laptop - md:flex)                        */}
                {/* ========================================================================= */}
                <header className="sticky top-0 z-50 hidden md:block border-b border-[#ded8cb] bg-white/95 backdrop-blur-xl dark:border-[#1f2b40] dark:bg-[#0a1220]/95 shadow-2xs">
                    <div className="mx-auto flex h-16 w-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Left: Branding & Role Badge */}
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2.5 rounded-xl p-1 transition-opacity hover:opacity-90"
                            >
                                <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-[#ded8cb] bg-white dark:border-[#1f2b40] dark:bg-[#111a2b] shrink-0 shadow-2xs">
                                    <Image
                                        src="/favicon.ico"
                                        alt="EntryDesk logo"
                                        fill
                                        className="object-cover"
                                        sizes="36px"
                                        priority
                                    />
                                </div>
                                <div className="leading-tight">
                                    <span className="text-base font-bold tracking-tight text-[#1c1917] dark:text-[#e8eef5]">
                                        EntryDesk
                                    </span>
                                </div>
                            </Link>

                            <span
                                className={cn(
                                    'inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                                    role === 'organizer'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                                        : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                                )}
                            >
                                {roleLabel}
                            </span>
                        </div>

                        {/* Center: Desktop Navigation Links */}
                        <nav className="flex items-center gap-1 bg-[#f7f4ec]/80 dark:bg-[#111a2b]/80 border border-[#ded8cb] dark:border-[#1f2b40] p-1 rounded-2xl shadow-2xs">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <DashboardNavLink
                                        key={item.href}
                                        href={item.href}
                                        className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-2 transition-all"
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </DashboardNavLink>
                                )
                            })}
                        </nav>

                        {/* Right: Theme Toggle & User Profile Dropdown */}
                        <div className="flex items-center gap-2.5">
                            <ThemeSwitch />

                            {/* User Profile Dropdown Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 rounded-xl border border-[#ded8cb] bg-[#faf8f3] dark:border-[#1f2b40] dark:bg-[#111a2b] pl-1.5 pr-2.5 py-1 hover:border-[#0d9488]/40 dark:hover:border-[#2dd4b4]/40 transition-all cursor-pointer shadow-2xs">
                                        <div
                                            className={cn(
                                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-xs',
                                                avatarGradient
                                            )}
                                        >
                                            {initials}
                                        </div>
                                        <span className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] max-w-[110px] truncate">
                                            {profileFullName || displayName}
                                        </span>
                                        <ChevronDown className="h-3.5 w-3.5 text-[#57534e] dark:text-[#8a99ab]" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56 bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] rounded-2xl p-1.5 shadow-xl"
                                >
                                    <div className="px-2.5 py-2">
                                        <p className="text-xs font-bold truncate">{profileFullName || 'User'}</p>
                                        <p className="text-[11px] text-[#57534e] dark:text-[#8a99ab] truncate mt-0.5">
                                            {userEmail}
                                        </p>
                                    </div>
                                    <DropdownMenuSeparator className="bg-[#ded8cb] dark:bg-[#1f2b40] my-1" />
                                    <div className="p-1">
                                        <SignOutForm />
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* ========================================================================= */}
                {/* 2. MOBILE TOP HEADER (Compact Header on small screens - md:hidden)        */}
                {/* ========================================================================= */}
                <header className="sticky top-0 z-40 md:hidden border-b border-[#ded8cb] bg-white/95 backdrop-blur-xl dark:border-[#1f2b40] dark:bg-[#0a1220]/95">
                    <div className="flex h-14 items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-[#ded8cb] bg-white dark:border-[#1f2b40] dark:bg-[#111a2b] shadow-2xs">
                                    <Image src="/favicon.ico" alt="EntryDesk" fill className="object-cover" sizes="28px" priority />
                                </div>
                                <span className="text-sm font-bold tracking-tight text-[#1c1917] dark:text-[#e8eef5]">
                                    EntryDesk
                                </span>
                            </Link>

                            <span
                                className={cn(
                                    'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                    role === 'organizer'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400'
                                )}
                            >
                                {roleLabel}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <ThemeSwitch className="scale-[0.85]" />

                            {/* Mobile User Profile Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-xs">
                                        {initials}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-52 bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] rounded-2xl p-1.5 shadow-xl"
                                >
                                    <div className="px-2.5 py-2">
                                        <p className="text-xs font-bold truncate">{profileFullName || 'User'}</p>
                                        <p className="text-[11px] text-[#57534e] dark:text-[#8a99ab] truncate mt-0.5">
                                            {userEmail}
                                        </p>
                                    </div>
                                    <DropdownMenuSeparator className="bg-[#ded8cb] dark:bg-[#1f2b40] my-1" />
                                    <div className="p-1">
                                        <SignOutForm />
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* ========================================================================= */}
                {/* 3. MAIN CONTENT AREA                                                      */}
                {/* ========================================================================= */}
                <main className="flex-1 px-3 py-5 sm:px-6 lg:px-8 xl:px-10 pb-24 md:pb-12">
                    <div className="w-full max-w-[1680px] 2xl:max-w-[1800px] mx-auto relative">
                        <DashboardContentShell>{children}</DashboardContentShell>
                    </div>
                </main>

                {/* ========================================================================= */}
                {/* 4. FIXED BOTTOM NAVIGATION BAR (Mobile Footer Nav - md:hidden)            */}
                {/* ========================================================================= */}
                <nav
                    aria-label="Mobile Navigation"
                    className="fixed bottom-0 left-0 right-0 z-50 h-16 md:hidden border-t border-[#ded8cb] bg-white/95 backdrop-blur-xl dark:border-[#1f2b40] dark:bg-[#0a1220]/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
                >
                    <div className="flex h-full items-stretch justify-around px-2 max-w-md mx-auto">
                        {navItems.map((item) => (
                            <MobileFooterNavItem
                                key={item.href}
                                item={item}
                                isActive={isLinkActive(item.href)}
                            />
                        ))}
                    </div>
                </nav>
            </div>
        </NavProvider>
    )
}
