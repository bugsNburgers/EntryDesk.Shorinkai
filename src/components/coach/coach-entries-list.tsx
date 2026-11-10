'use client'

// ============================================================================
// EntryDesk — Coach entries for one event. Cards below lg, a table from lg up.
// Layout: "EntryDesk UX Fixes" design canvas (09/11/2026).
// ============================================================================

import { useCoachEntriesList } from './coach-entries-list-parts/use-coach-entries-list'
import { CoachEntriesToolbar } from './coach-entries-list-parts/toolbar'
import { CoachEntriesDesktopTable } from './coach-entries-list-parts/desktop-table'
import { CoachEntriesMobileList } from './coach-entries-list-parts/mobile-list'
import { CoachEntriesFooter } from './coach-entries-list-parts/footer'
import { CoachRejectDialog } from './coach-entries-list-parts/reject-dialog'
import type { CoachEntriesListProps } from './coach-entries-list-parts/shared'
export { normalizeCoachStatus } from './coach-entries-list-parts/shared'

export function CoachEntriesList(props: CoachEntriesListProps) {
    const vm = useCoachEntriesList(props)
    return (
        <div className="w-full text-foreground select-text space-y-4 pb-44 md:pb-28">
            <CoachEntriesToolbar vm={vm} />

            <CoachEntriesDesktopTable vm={vm} />

            <CoachEntriesMobileList vm={vm} />

            <CoachEntriesFooter vm={vm} />

            <CoachRejectDialog vm={vm} />
        </div>
    )
}
