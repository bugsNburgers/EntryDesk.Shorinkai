import Link from 'next/link'
import { cn } from '@/lib/utils'

export type StageTile = {
    /** Value used in the URL / filter state. */
    key: string
    label: string
    count: number
    /** Highlight in amber because it needs the viewer's action (e.g. "With coach" for a coach). */
    attention?: boolean
}

/**
 * Small count boxes that ARE the filter. Two columns on a phone, one row from `sm` up.
 * Pass either `hrefFor` (links, server-rendered pages) or `onSelect` (client state).
 */
export function StageFilterTiles({
    tiles,
    active,
    hrefFor,
    onSelect,
    className,
    columnsClassName = 'sm:grid-cols-4',
}: {
    tiles: StageTile[]
    active?: string
    hrefFor?: (key: string) => string
    onSelect?: (key: string) => void
    className?: string
    columnsClassName?: string
}) {
    return (
        <div className={cn('grid grid-cols-2 gap-2', columnsClassName, className)}>
            {tiles.map((t) => {
                const isActive = active === t.key
                const cls = cn(
                    'flex min-h-[56px] items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                        ? 'border-foreground bg-foreground text-background'
                        : t.attention && t.count > 0
                            ? 'border-[var(--status-pending)]/40 bg-[var(--status-pending-bg)] text-foreground hover:border-[var(--status-pending)]'
                            : 'border-border bg-card text-foreground hover:border-foreground/40',
                )
                const inner = (
                    <>
                        <span className="text-2xl font-bold leading-none tabular-nums">{t.count}</span>
                        <span className="text-[15px] leading-tight">{t.label}</span>
                    </>
                )
                if (hrefFor) {
                    return (
                        <Link key={t.key} href={hrefFor(t.key)} className={cls} aria-current={isActive ? 'true' : undefined} scroll={false}>
                            {inner}
                        </Link>
                    )
                }
                return (
                    <button key={t.key} type="button" className={cls} aria-pressed={isActive} onClick={() => onSelect?.(t.key)}>
                        {inner}
                    </button>
                )
            })}
        </div>
    )
}
