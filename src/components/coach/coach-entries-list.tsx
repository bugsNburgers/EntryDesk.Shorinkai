'use client'

// ============================================================================
// EntryDesk — Coach Tournament Entries List (Laptop & Mobile Pixel-Perfect)
// Implements:
//  - Coach list · laptop-html (CoachLaptop.dc.html & CoachLaptopSel.dc.html)
//  - Coach list · mobile-html (CoachMobile.dc.html & CoachMobileSel.dc.html)
//  - Row menu (⋯) · component-html (CoachMenu.dc.html)
// Obsidian dark theme (#0a1220, #111a2b), teal accents (#2dd4b4), Google Sans.
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
        <div className="w-full text-foreground select-text font-['Google_Sans','Product_Sans',system-ui,sans-serif] space-y-4 pb-44 md:pb-28">
            <CoachEntriesToolbar vm={vm} />

            <CoachEntriesDesktopTable vm={vm} />

            <CoachEntriesMobileList vm={vm} />

            <CoachEntriesFooter vm={vm} />

            <CoachRejectDialog vm={vm} />
        </div>
    )
}
