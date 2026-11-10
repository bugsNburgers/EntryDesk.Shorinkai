'use client'

// ============================================================================
// EntryDesk — Organiser Tournament Entries List (Laptop & Mobile Pixel-Perfect)
// Implements the same Obsidian dark theme (#0a1220, #111a2b, #2dd4b4)
// and structure as the Coach's side list:
//  - Tabs: Pending Approvals, All, Accepted, Rejected (with counts)
//  - Real-time search across athlete, coach, dojo, chest #
//  - Desktop grid with Chest, Athlete, Age, Dojo, Coach, Belt, Weight, Events, Status, Actions
//  - Mobile card view with full responsive support
//  - Floating batch selection bar with Approve / Reject selected
//  - 3-Dot row menu (···) with View Pass, Details, Assign Chest #, Reject
// ============================================================================


import { useOrganiserEntriesList } from './organiser-entries-list-parts/use-organiser-entries-list'
import { OrganiserEntriesToolbar } from './organiser-entries-list-parts/toolbar'
import { OrganiserEntriesDesktopTable } from './organiser-entries-list-parts/desktop-table'
import { OrganiserEntriesMobileList } from './organiser-entries-list-parts/mobile-list'
import { OrganiserEntriesFooter } from './organiser-entries-list-parts/footer'
import { OrganiserRejectDialog } from './organiser-entries-list-parts/reject-dialog'
import { OrganiserChestNoDialog } from './organiser-entries-list-parts/chest-no-dialog'
import { OrganiserEntryDetailDialog } from './organiser-entries-list-parts/entry-detail-dialog'
import type { OrganiserEntriesListProps } from './organiser-entries-list-parts/shared'

export function OrganiserEntriesList(props: OrganiserEntriesListProps) {
    const vm = useOrganiserEntriesList(props)
    return (
        <div className="w-full text-foreground select-text font-['Google_Sans','Product_Sans',system-ui,sans-serif] space-y-4 pb-44 md:pb-28">
            <OrganiserEntriesToolbar vm={vm} />

            <OrganiserEntriesDesktopTable vm={vm} />

            <OrganiserEntriesMobileList vm={vm} />

            <OrganiserEntriesFooter vm={vm} />

            <OrganiserRejectDialog vm={vm} />

            <OrganiserChestNoDialog vm={vm} />

            <OrganiserEntryDetailDialog vm={vm} />
        </div>
    )
}
