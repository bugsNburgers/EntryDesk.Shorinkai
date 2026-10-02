'use client'

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"
import { useAppNavigation } from "@/components/app/navigation-provider"
import { Search, RotateCcw, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ParentEntriesFiltersProps {
    events: { id: string; title: string }[]
    pendingCount: number
}

export function ParentEntriesFilters({ events, pendingCount }: ParentEntriesFiltersProps) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const { beginNavigation } = useAppNavigation()

    const currentStatus = searchParams.get('status') || 'all'
    const currentEvent = searchParams.get('event_id') || 'all'
    const currentSearch = searchParams.get('q') || ''

    const hasActiveFilters = currentStatus !== 'all' || currentEvent !== 'all' || currentSearch !== ''

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }
        beginNavigation()
        router.replace(`${pathname}?${params.toString()}`)
    }, 300)

    const handleFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value && value !== 'all') {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        beginNavigation()
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleReset = () => {
        beginNavigation()
        router.replace(pathname)
    }

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-3 sm:p-3.5 space-y-2.5 shadow-xs">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                        placeholder="Search athlete or parent..."
                        defaultValue={currentSearch}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="h-9 pl-9 pr-8 text-xs rounded-md bg-background/70 border-border/70 focus:border-primary"
                    />
                    {currentSearch && (
                        <button
                            type="button"
                            onClick={() => handleSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mr-0.5">
                        <SlidersHorizontal className="h-3 w-3" /> Filters
                    </span>

                    {/* Status Select */}
                    <Select value={currentStatus} onValueChange={(val) => handleFilter('status', val)}>
                        <SelectTrigger className={cn(
                            "h-8 w-auto min-w-[105px] text-xs font-medium rounded-md px-2.5 py-1 gap-1.5 transition-all",
                            currentStatus !== 'all'
                                ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        )}>
                            <span className="text-muted-foreground font-normal">Status:</span>
                            <span className="font-semibold">
                                {currentStatus === 'all' ? 'All' :
                                    currentStatus === 'pending_coach' ? `Review (${pendingCount})` :
                                    currentStatus === 'correction_needed' ? 'Needs Fix' :
                                    currentStatus === 'submitted' ? 'Submitted' :
                                    currentStatus === 'approved' ? 'Accepted' :
                                    currentStatus === 'coach_declined' ? 'Declined' : currentStatus}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending_coach">Waiting for Coach ({pendingCount})</SelectItem>
                            <SelectItem value="correction_needed">Correction Needed</SelectItem>
                            <SelectItem value="submitted">Sent to Organiser</SelectItem>
                            <SelectItem value="approved">Accepted</SelectItem>
                            <SelectItem value="coach_declined">Declined</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Tournament Select */}
                    {events.length > 0 && (
                        <Select value={currentEvent} onValueChange={(val) => handleFilter('event_id', val)}>
                            <SelectTrigger className={cn(
                                "h-8 w-auto min-w-[105px] max-w-[200px] text-xs font-medium rounded-md px-2.5 py-1 gap-1.5 transition-all",
                                currentEvent !== 'all'
                                    ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                    : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            )}>
                                <span className="text-muted-foreground font-normal">Event:</span>
                                <span className="font-semibold truncate">
                                    {currentEvent === 'all' ? 'All Events' : events.find(e => e.id === currentEvent)?.title || 'Event'}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tournaments</SelectItem>
                                {events.map((ev) => (
                                    <SelectItem key={ev.id} value={ev.id}>
                                        {ev.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-8 px-2.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
