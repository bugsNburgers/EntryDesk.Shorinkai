'use client'

import Link, { type LinkProps } from 'next/link'
import React, { type MouseEvent } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useNavContext } from '@/components/dashboard/nav-context'
import { Loader2 } from 'lucide-react'

type Props = LinkProps & {
    className?: string
    children: React.ReactNode
    icon?: React.ReactNode
}

function isModifiedEvent(event: MouseEvent) {
    const target = event.currentTarget as HTMLAnchorElement
    return (
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0 ||
        (target && target.target && target.target !== '_self')
    )
}

export function DashboardNavLink({ children, className, icon, ...props }: Props) {
    const pathname = usePathname()
    const { pendingPath, setPendingPath } = useNavContext()

    const hrefString = typeof props.href === 'string' ? props.href : undefined
    const hrefPath = hrefString ? hrefString.split('?')[0]?.split('#')[0] : undefined

    const actualIsActive = !!hrefPath && (hrefPath === '/dashboard' ? pathname === '/dashboard' : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`))
    const isPending = !!hrefPath && pendingPath === hrefPath

    // If a link was just clicked (pendingPath set), optimistically highlight ONLY the clicked link!
    const isActive = pendingPath ? isPending : actualIsActive

    const baseClasses =
        'dashboard-nav-item group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 select-none'

    const stateClasses = isActive
        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30 dark:border-emerald-500/40 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400'
        : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground border border-transparent font-medium [&>svg]:text-muted-foreground [&>svg]:group-hover:text-foreground'

    return (
        <Link
            prefetch={true}
            {...props}
            className={cn(baseClasses, stateClasses, className)}
            data-active={isActive ? 'true' : 'false'}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
                props.onClick?.(e)
                if (e.defaultPrevented) return
                if (isModifiedEvent(e)) return

                if (hrefPath && hrefPath === pathname) {
                    e.preventDefault()
                    return
                }

                // Instantly move active highlight to this clicked link
                if (hrefPath) {
                    setPendingPath(hrefPath)
                }
            }}
        >
            {isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" /> : icon}
            {children}
        </Link>
    )
}
