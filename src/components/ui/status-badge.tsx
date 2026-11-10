import { Check, Clock, FileText, Minus, Pencil, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusBgClass, getStatusIcon, getStatusLabel, type StatusIcon } from '@/lib/status'

const ICONS: Record<StatusIcon, typeof Check> = {
    draft: FileText,
    clock: Clock,
    send: Send,
    check: Check,
    pencil: Pencil,
    x: X,
    minus: Minus,
}

/**
 * The one way to show an entry's stage: same word for every role, its own colour AND its own icon.
 */
export function StatusBadge({
    status,
    size = 'md',
    className,
}: {
    status: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}) {
    const Icon = ICONS[getStatusIcon(status)]
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
                size === 'sm' && 'px-2.5 py-0.5 text-[13px]',
                size === 'md' && 'px-3 py-1 text-sm',
                size === 'lg' && 'px-3.5 py-1.5 text-base',
                getStatusBgClass(status),
                className,
            )}
        >
            <Icon className={cn(size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5')} strokeWidth={2.5} aria-hidden="true" />
            {getStatusLabel(status)}
        </span>
    )
}
