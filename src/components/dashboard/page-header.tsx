import React from 'react'

export function DashboardPageHeader({
    title,
    description,
    actions,
}: {
    title: string
    description?: string
    actions?: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: accent bar + text */}
            <div className="flex items-start gap-3">
                {/* Emerald left accent line */}
                <div className="mt-1 h-7 w-[3px] shrink-0 rounded-full bg-primary opacity-80" />
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>

            {/* Right: action buttons */}
            {actions ? (
                <div className="flex shrink-0 items-center gap-2 sm:mt-0.5">
                    {actions}
                </div>
            ) : null}
        </div>
    )
}
