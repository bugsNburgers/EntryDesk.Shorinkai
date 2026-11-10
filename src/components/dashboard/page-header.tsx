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
            <div className="flex items-start gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-1 text-base text-muted-foreground">
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
