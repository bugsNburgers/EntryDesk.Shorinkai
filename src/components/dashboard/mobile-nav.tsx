'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
    Menu,
    LayoutDashboard,
    Calendar,
    CheckCircle2,
    Building2,
    Users,
    FileText,
    Inbox,
} from "lucide-react"
import { DashboardNavLink } from "@/components/dashboard/nav-link"
import { SignOutForm } from "@/components/dashboard/signout-form"
import { ThemeSwitch } from "@/components/app/theme-toggle"
import { cn } from "@/lib/utils"

interface MobileNavProps {
    role: string
    profile: { full_name: string | null } | null
    userEmail: string
}

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

export function MobileNav({ role, profile, userEmail }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    // Close sheet when route changes
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    const displayName = profile?.full_name || userEmail || 'User'
    const initials = displayName.slice(0, 2).toUpperCase()
    const avatarGradient = getAvatarColor(displayName)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-[80vw] max-w-[300px] sm:w-[300px] p-0"
            >
                <SheetTitle className="sr-only">Navigation</SheetTitle>

                <div className="flex h-[100dvh] flex-col">
                    {/* Brand header */}
                    <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
                        <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-border/50 bg-background/70 dark:border-white/[0.12] shrink-0">
                            <Image src="/favicon.ico" alt="EntryDesk logo" fill className="object-cover" sizes="36px" priority />
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-bold tracking-tight">EntryDesk</div>
                            <div className="text-[11px] text-muted-foreground font-medium capitalize">
                                {role === 'organizer' ? 'Organizer Portal' : 'Coach Portal'}
                            </div>
                        </div>
                    </div>

                    {/* Nav links */}
                    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                        {/* Home */}
                        <DashboardNavLink href="/dashboard">
                            <LayoutDashboard className="h-4 w-4" />
                            Home
                        </DashboardNavLink>

                        {/* Section label */}
                        <div className="pt-4 pb-1 px-2">
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

                    {/* User profile footer */}
                    <div className="border-t border-border/50 p-4 bg-background/40 dark:bg-background/20">
                        {/* Role pill + theme */}
                        <div className="flex items-center justify-between mb-3">
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

                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 rounded-xl px-2 py-2 mb-3">
                            <div
                                className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ring-2 ring-background',
                                    avatarGradient
                                )}
                            >
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{profile?.full_name || 'User'}</div>
                                <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
                            </div>
                        </div>

                        <SignOutForm />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
