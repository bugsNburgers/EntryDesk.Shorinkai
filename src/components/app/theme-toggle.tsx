'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

function getThemeFromDom(): Theme {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try {
        localStorage.setItem('theme', theme)
    } catch {
        // ignore
    }
}

/**
 * One square button. Shows a moon in light mode (tap → dark) and a sun in dark mode (tap → light).
 * 44px so it is an easy tap target on phones.
 */
export function ThemeSwitch({ className }: { className?: string }) {
    const [theme, setTheme] = useState<Theme>('light')

    useEffect(() => {
        setTheme(getThemeFromDom())
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'theme') setTheme(getThemeFromDom())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    const isDark = theme === 'dark'
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={() => {
                const next: Theme = isDark ? 'light' : 'dark'
                applyTheme(next)
                setTheme(next)
            }}
            className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground',
                'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>
    )
}
