'use client'

// ============================================================================
// EntryDesk — Parent Portal Navigation (User Menu)
// Mobile-first: avatar + dropdown with profile and logout
// ============================================================================

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, User, ChevronDown } from 'lucide-react'

interface ParentPortalNavProps {
    userEmail: string
    userName: string | null
    userAvatar: string | null
}

export function ParentPortalNav({ userEmail, userName, userAvatar }: ParentPortalNavProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const displayName = userName || userEmail.split('@')[0]
    const initials = displayName.charAt(0).toUpperCase()

    async function handleLogout() {
        setOpen(false)
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm hover:bg-[#ded8cb]/40 text-[#1c1917] dark:text-[#e8eef5] dark:hover:bg-[#16233a] transition-colors"
                aria-expanded={open}
                aria-haspopup="true"
            >
                {userAvatar ? (
                    <Image
                        src={userAvatar}
                        alt={displayName}
                        width={26}
                        height={26}
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:bg-[#2dd4b4]/20 dark:border-transparent dark:text-[#2dd4b4]">
                        {initials}
                    </div>
                )}
                <span className="hidden sm:inline-block text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] max-w-[140px] truncate">
                    {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#57534e] dark:text-[#8a99ab]" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-[#ded8cb] bg-white text-[#1c1917] dark:border-[#1f2b40] dark:bg-[#111a2b] dark:text-[#e8eef5] shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2.5 border-b border-[#ded8cb] dark:border-[#1f2b40]">
                        <p className="text-xs font-semibold truncate text-[#1c1917] dark:text-[#e8eef5]">{displayName}</p>
                        <p className="text-[11px] text-[#57534e] dark:text-[#8a99ab] truncate">{userEmail}</p>
                    </div>

                    <Link
                        href="/athlete"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#1c1917] hover:bg-[#f7f4ec] dark:text-[#e8eef5] dark:hover:bg-[#16233a] transition-colors"
                    >
                        <User className="h-4 w-4 text-[#57534e] dark:text-[#8a99ab]" />
                        My Profile(s)
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    )
}
