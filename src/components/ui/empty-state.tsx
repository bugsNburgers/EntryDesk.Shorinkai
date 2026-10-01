import React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
    icon: React.ReactNode
    title: string
    description: string
    actions?: React.ReactNode
    className?: string
}

export function EmptyState({
    icon,
    title,
    description,
    actions,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center px-6 py-14 text-center',
                className
            )}
        >
            {/* Icon wrapper — tinted, not greyed out */}
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/12 dark:bg-primary/10 dark:ring-primary/15">
                <span className="[&>svg]:h-7 [&>svg]:w-7">{icon}</span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold tracking-tight text-foreground">
                {title}
            </h3>

            {/* Description */}
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {description}
            </p>

            {/* Actions */}
            {actions && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {actions}
                </div>
            )}
        </div>
    )
}
