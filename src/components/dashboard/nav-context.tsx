'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

interface NavContextType {
    pendingPath: string | null
    setPendingPath: (path: string | null) => void
}

const NavContext = createContext<NavContextType>({
    pendingPath: null,
    setPendingPath: () => {},
})

export function NavProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [pendingPath, setPendingPath] = useState<string | null>(null)

    // Reset pending path whenever real route changes
    useEffect(() => {
        setPendingPath(null)
    }, [pathname])

    return (
        <NavContext.Provider value={{ pendingPath, setPendingPath }}>
            {children}
        </NavContext.Provider>
    )
}

export function useNavContext() {
    return useContext(NavContext)
}

/** Content Area Shell that instantly swaps to Skeleton on navigation */
export function DashboardContentShell({ children }: { children: React.ReactNode }) {
    const { pendingPath } = useNavContext()

    if (pendingPath) {
        return (
            <div className="space-y-6 animate-pulse p-2">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-72 rounded-md" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
        )
    }

    return <>{children}</>
}
