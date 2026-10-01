'use client'

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"
import { useAppNavigation } from "@/components/app/navigation-provider"
import { Search, SlidersHorizontal, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface EntryFiltersProps {
  coaches: { id: string, name: string }[]
  eventDays: { id: string, name: string }[]
}

export function EntryFilters({ coaches, eventDays }: EntryFiltersProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { beginNavigation } = useAppNavigation()

  const currentStatus = searchParams.get('status') || 'all'
  const currentDay = searchParams.get('day') || 'all'
  const currentCoach = searchParams.get('coach') || 'all'
  const currentSearch = searchParams.get('q') || ''

  const hasActiveFilters = currentStatus !== 'all' || currentDay !== 'all' || currentCoach !== 'all' || currentSearch !== ''

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset to page 1 on search
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
    params.set('page', '1') // Reset to page 1 on filter
    beginNavigation()
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleReset = () => {
    beginNavigation()
    router.replace(pathname)
  }

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'submitted': return 'Submitted'
      case 'pending_coach': return 'Waiting for Coach'
      case 'correction_needed': return 'Correction Needed'
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'draft': return 'Draft'
      default: return 'All'
    }
  }

  const getDayName = (id: string) => {
    return eventDays.find(d => d.id === id)?.name || id
  }

  const getCoachName = (id: string) => {
    return coaches.find(c => c.id === id)?.name || id
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-3 sm:p-3.5 space-y-2.5 shadow-xs">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search student name..."
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={currentSearch}
            className="h-9.5 pl-9 pr-4 text-sm rounded-xl bg-background/70 border-border/70 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mr-0.5">
            <SlidersHorizontal className="h-3 w-3" /> Filters
          </span>

          <Select
            value={currentStatus}
            onValueChange={(val) => handleFilter('status', val)}
          >
            <SelectTrigger className={cn(
              "h-8.5 w-auto min-w-[105px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
              currentStatus !== 'all'
                ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
            )}>
              <span className="text-muted-foreground font-normal">Status:</span>
              <span className="font-semibold truncate max-w-[100px]">
                {getStatusLabel(currentStatus)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending_coach">Waiting for Coach</SelectItem>
              <SelectItem value="correction_needed">Correction Needed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {eventDays.length > 0 && (
            <Select
              value={currentDay}
              onValueChange={(val) => handleFilter('day', val)}
            >
              <SelectTrigger className={cn(
                "h-8.5 w-auto min-w-[95px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
                currentDay !== 'all'
                  ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                  : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}>
                <span className="text-muted-foreground font-normal">Day:</span>
                <span className="font-semibold truncate">
                  {currentDay === 'all' ? 'All' : getDayName(currentDay)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {eventDays.map(day => (
                  <SelectItem key={day.id} value={day.id}>{day.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {coaches.length > 0 && (
            <Select
              value={currentCoach}
              onValueChange={(val) => handleFilter('coach', val)}
            >
              <SelectTrigger className={cn(
                "h-8.5 w-auto min-w-[105px] max-w-[180px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
                currentCoach !== 'all'
                  ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                  : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}>
                <span className="text-muted-foreground font-normal">Coach:</span>
                <span className="font-semibold truncate">
                  {currentCoach === 'all' ? 'All' : getCoachName(currentCoach)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coaches</SelectItem>
                {coaches.map(coach => (
                  <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="h-8.5 px-2.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1"
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
