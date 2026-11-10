'use client'

// ============================================================================
// EntryDesk — Coach event overview: small count boxes that ARE the filter.
// Same stage words as everywhere else (lib/status.ts). Replaced the five large
// preview cards on 09/11/2026 — they filled the whole first phone screen.
// ============================================================================

import { X } from 'lucide-react'
import { StageFilterTiles } from '@/components/ui/stage-filter-tiles'

type CoachFilter = 'all' | 'pending_submission' | 'draft' | 'pending_coach' | 'submitted' | 'approved' | 'rejected' | 'correction_needed'

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
    activeStatus?: string
    onSelectStatus: (status: CoachFilter) => void
}

// The list's own filter keys (normalizeCoachStatus) → the tile that shows as selected.
const ACTIVE_TILE: Record<string, CoachFilter> = {
    not_forwarded: 'pending_submission',
    correction: 'correction_needed',
    forwarded: 'submitted',
    approved: 'approved',
    rejected: 'rejected',
    all: 'all',
}

export function CoachOverview({ entries, activeStatus, onSelectStatus }: CoachOverviewProps) {
    const withCoach = entries.filter((e) => e.status === 'draft' || e.status === 'pending_coach')
    const needsFix = entries.filter((e) => e.status === 'correction_needed')
    const withOrganiser = entries.filter((e) => e.status === 'submitted')
    const accepted = entries.filter((e) => e.status === 'approved')
    const notAccepted = entries.filter((e) => e.status === 'rejected' || e.status === 'coach_declined')

    return (
        <div className="space-y-3">
            {notAccepted.length > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--status-closed)]/30 bg-[var(--status-closed-bg)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-closed-fg)] text-[var(--status-closed-bg)]">
                            <X className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-base font-semibold text-[var(--status-closed-fg)]">
                                {notAccepted.length === 1
                                    ? `${notAccepted[0].students?.name || 'An athlete'} was not accepted`
                                    : `${notAccepted.length} entries were not accepted`}
                            </p>
                            {notAccepted.length === 1 && notAccepted[0].rejection_reason && (
                                <p className="text-[15px] text-[var(--status-closed-fg)]/80">Reason: “{notAccepted[0].rejection_reason}”</p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelectStatus('rejected')}
                        className="min-h-11 shrink-0 rounded-lg border border-[var(--status-closed-fg)]/30 bg-card px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        See them
                    </button>
                </div>
            )}

            <StageFilterTiles
                columnsClassName="sm:grid-cols-3 lg:grid-cols-6"
                active={ACTIVE_TILE[activeStatus ?? ''] ?? undefined}
                onSelect={(k) => onSelectStatus(k as CoachFilter)}
                tiles={[
                    { key: 'pending_submission', label: 'With coach', count: withCoach.length, attention: true },
                    { key: 'submitted', label: 'With organiser', count: withOrganiser.length },
                    { key: 'approved', label: 'Accepted', count: accepted.length },
                    { key: 'correction_needed', label: 'Needs a fix', count: needsFix.length },
                    { key: 'rejected', label: 'Not accepted', count: notAccepted.length },
                    { key: 'all', label: 'All', count: entries.length },
                ]}
            />
        </div>
    )
}
