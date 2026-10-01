'use client'

// ============================================================================
// EntryDesk — Coach Overview Cards (Unified Stats + Athlete Preview)
// Merged design: Combines stat counts and athlete name previews in a single card row.
// Eliminates repetitive duplicate cards and provides direct click-to-filter.
// ============================================================================

import React from 'react'
import { AlertCircle, CheckCircle, FileEdit, Users, Clock, ArrowRight, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoachOverviewProps {
    stats: {
        total: number
        draft: number
        pending_coach?: number
        submitted: number
        approved: number
        rejected?: number
    }
    entries: any[]
    onSelectStatus: (status: 'all' | 'pending_submission' | 'draft' | 'pending_coach' | 'submitted' | 'approved' | 'rejected') => void
}

interface UnifiedCardProps {
    title: string
    count: number
    countColor?: string
    subtitle: string
    icon: React.ReactNode
    entries: any[]
    status: 'all' | 'pending_submission' | 'draft' | 'pending_coach' | 'submitted' | 'approved' | 'rejected'
    onSelect: () => void
    highlightClass?: string
}

function UnifiedStatusCard({
    title,
    count,
    countColor = 'text-foreground',
    subtitle,
    icon,
    entries,
    onSelect,
    highlightClass,
}: UnifiedCardProps) {
    const topEntries = entries.slice(0, 3)

    return (
        <div
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect()}
            className={cn(
                "group cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between",
                highlightClass
                    ? highlightClass
                    : "border-white/[0.08] bg-card/60 hover:bg-card/90 hover:border-primary/30"
            )}
        >
            {/* Header: Title, Icon, Big Count Number */}
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {title}
                    </span>
                    <div className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        {icon}
                    </div>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                    <span className={cn("text-3xl font-extrabold tracking-tight", countColor)}>
                        {count}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                        {subtitle}
                    </span>
                </div>
            </div>

            {/* Athlete Names & Details Preview */}
            <div className="mt-4 pt-3 border-t border-border/40">
                {topEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic py-1">
                        No entries
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {topEntries.map((e) => (
                            <div key={e.id} className="flex flex-col text-xs gap-0.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold truncate text-foreground/90 group-hover:text-primary transition-colors">
                                        {e.students?.name || '—'}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground shrink-0 truncate max-w-[130px]">
                                        {e.category_name || e.students?.rank || e.participation_type || '—'}
                                    </span>
                                </div>
                                {status === 'rejected' && e.rejection_reason && (
                                    <span className="text-[10px] text-rose-500 font-medium truncate block" title={e.rejection_reason}>
                                        Reason: {e.rejection_reason}
                                    </span>
                                )}
                            </div>
                        ))}

                        {entries.length > 3 && (
                            <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-primary">
                                <span>+{entries.length - 3} more</span>
                                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export function CoachOverview({ stats, entries, onSelectStatus }: CoachOverviewProps) {
    const pendingSubmission = entries.filter((e) => e.status === 'draft' || e.status === 'pending_coach' || e.status === 'correction_needed')
    const submitted = entries.filter((e) => e.status === 'submitted')
    const approved = entries.filter((e) => e.status === 'approved')
    const rejected = entries.filter((e) => e.status === 'rejected' || e.status === 'coach_declined')

    const hasRejected = rejected.length > 0

    return (
        <div className="space-y-4">
            {/* Urgent Alert Banner: surfaces rejected entries immediately to the coach */}
            {hasRejected && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-600 dark:text-rose-400 shadow-sm animate-pulse-gentle">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">
                                    Action Required: {rejected.length} {rejected.length === 1 ? 'Entry Rejected' : 'Entries Rejected'} by Organiser
                                </span>
                                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300">
                                    Attention
                                </span>
                            </div>
                            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                                {rejected.length === 1
                                    ? `${rejected[0].students?.name || 'Athlete'} was rejected: "${rejected[0].rejection_reason || 'Requires correction'}". Review and update details below to resubmit.`
                                    : `${rejected.length} athletes have rejected entries. Review notes from the tournament organiser.`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelectStatus('rejected')}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                    >
                        <span>View Rejected</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* 5-Card Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* 1. All Active Entries Card */}
                <UnifiedStatusCard
                    title="Active Entries"
                    count={stats.total}
                    subtitle="Total athletes"
                    icon={<Users className="h-4 w-4" />}
                    entries={entries}
                    status="all"
                    onSelect={() => onSelectStatus('all')}
                />

                {/* 2. Not Submitted Card (Athletes not yet approved/submitted to organiser) */}
                <UnifiedStatusCard
                    title="Not Submitted"
                    count={pendingSubmission.length}
                    countColor={pendingSubmission.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                    subtitle={pendingSubmission.length > 0 ? "Needs to be sent" : "All caught up"}
                    icon={<FileEdit className={cn("h-4 w-4", pendingSubmission.length > 0 ? "text-rose-500" : "text-emerald-500")} />}
                    entries={pendingSubmission}
                    status="pending_submission"
                    onSelect={() => onSelectStatus('pending_submission')}
                    highlightClass={pendingSubmission.length > 0
                        ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 hover:border-rose-500/50"
                        : "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 hover:border-emerald-500/40"
                    }
                />

                {/* 3. Under Organiser Review Card (Submitted to organiser, waiting for organiser approval) */}
                <UnifiedStatusCard
                    title="Under Review"
                    count={submitted.length}
                    countColor={submitted.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground"}
                    subtitle="Sent to organiser"
                    icon={<Clock className="h-4 w-4 text-blue-500" />}
                    entries={submitted}
                    status="submitted"
                    onSelect={() => onSelectStatus('submitted')}
                    highlightClass={submitted.length > 0 ? "border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 hover:border-blue-500/50" : undefined}
                />

                {/* 4. Approved & Ready Card */}
                <UnifiedStatusCard
                    title="Approved"
                    count={stats.approved}
                    countColor={stats.approved > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}
                    subtitle="Ready for event"
                    icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
                    entries={approved}
                    status="approved"
                    onSelect={() => onSelectStatus('approved')}
                    highlightClass={stats.approved > 0 ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 hover:border-emerald-500/50" : undefined}
                />

                {/* 5. Rejected Card (Always present in pipeline) */}
                <UnifiedStatusCard
                    title="Rejected"
                    count={rejected.length}
                    countColor={rejected.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}
                    subtitle={rejected.length > 0 ? "Action required" : "No rejected entries"}
                    icon={<XCircle className={cn("h-4 w-4", rejected.length > 0 ? "text-rose-500" : "text-muted-foreground")} />}
                    entries={rejected}
                    status="rejected"
                    onSelect={() => onSelectStatus('rejected')}
                    highlightClass={rejected.length > 0 ? "border-rose-500/40 bg-rose-500/10 hover:border-rose-500/60 ring-1 ring-rose-500/20" : undefined}
                />
            </div>
        </div>
    )
}
