'use client'

// Organiser entries for one event: count boxes (filter) + search, cards below lg, table from lg up.
// Layout: "EntryDesk UX Fixes" design canvas (09/11/2026).

import { Button } from '@/components/ui/button'
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
        <div className="w-full text-foreground select-text space-y-4 pb-44 md:pb-28">
            <OrganiserEntriesToolbar vm={vm} />

            <OrganiserEntriesDesktopTable vm={vm} />

            <OrganiserEntriesMobileList vm={vm} />

            {vm.pageCount > 1 && (
                <nav aria-label="Roster pages" className="flex flex-wrap items-center justify-center gap-3">
                    <Button variant="outline" disabled={vm.page <= 1} onClick={() => vm.setPage(vm.page - 1)}>
                        Previous page
                    </Button>
                    <span>Page {vm.page} of {vm.pageCount}</span>
                    <Button variant="outline" disabled={vm.page >= vm.pageCount} onClick={() => vm.setPage(vm.page + 1)}>
                        Next page
                    </Button>
                </nav>
            )}

            <OrganiserEntriesFooter vm={vm} />

            <OrganiserRejectDialog vm={vm} />

            <OrganiserChestNoDialog vm={vm} />

            <OrganiserEntryDetailDialog vm={vm} />
        </div>
    )
}
