'use client'

// Count boxes (= the filter) and search. Print / Excel / Settings live in the page header.

import { Search, X } from 'lucide-react'
import { StageFilterTiles } from '@/components/ui/stage-filter-tiles'
import type { OrganiserTab } from './shared'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserEntriesToolbar({ vm }: { vm: OrganiserEntriesListVM }) {
    const { counts, searchQuery, setSearchQuery, activeTab, setActiveTab } = vm
    return (
        <div className="space-y-3">
            <StageFilterTiles
                columnsClassName="sm:grid-cols-3 lg:grid-cols-5"
                active={activeTab}
                onSelect={(k) => setActiveTab(k as OrganiserTab)}
                tiles={[
                    { key: 'pending', label: 'With organiser', count: counts.pending, attention: true },
                    { key: 'approved', label: 'Accepted', count: counts.approved },
                    { key: 'fix', label: 'Needs a fix', count: counts.fix },
                    { key: 'rejected', label: 'Not accepted', count: counts.rejected },
                    { key: 'all', label: 'All', count: counts.all },
                ]}
            />
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <label htmlFor="org-entry-search" className="sr-only">Search entries</label>
                <input
                    id="org-entry-search"
                    type="search"
                    placeholder="Name, chest number, dojo or coach"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    )
}
