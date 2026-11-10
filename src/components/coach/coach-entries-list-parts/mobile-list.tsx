'use client'

// Mobile entries list — moved verbatim from coach-entries-list.tsx.

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Check, X, Circle } from 'lucide-react'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { CheckmarkSvg, PillCheckmarkSvg, MenuDownloadSvg, MenuLockSvg, MenuRejectSvg, getAthleteAge, formatBelt, getAppliedTags } from './shared'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachEntriesMobileList({ vm }: { vm: CoachEntriesListVM }) {
    const { onStatusChange, effectiveFilter, getDojo, filteredEntries, tabCounts, selectableEntries, isAllSelected, handleToggleSelect, handleToggleSelectAll, handleTogglePaid, handleMarkAllPaid, entries, selectedIds, genericCheckedMap, setStatusFilter, setRejectDialogOpen, setEntryToReject } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* 2. MOBILE VIEW (Responsive Light & Dark Modes)                            */}
            {/* ========================================================================= */}
            <div className="block lg:hidden space-y-3 pb-8">
                {/* Mobile Top Controls Bar */}
                <div className="flex justify-between items-center px-1">
                    <div
                        onClick={selectableEntries.length > 0 ? handleToggleSelectAll : undefined}
                        className={`flex items-center gap-2 text-xs font-semibold ${
                            selectableEntries.length === 0
                                ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                                : 'text-muted-foreground dark:text-foreground cursor-pointer'
                        }`}
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                selectableEntries.length === 0
                                    ? 'opacity-30 cursor-not-allowed border-border bg-transparent'
                                    : isAllSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-border bg-white dark:bg-transparent'
                            }`}
                        >
                            {isAllSelected && selectableEntries.length > 0 && <CheckmarkSvg />}
                        </span>
                        <span>Select all ({selectableEntries.length})</span>
                    </div>

                    <button
                        onClick={handleMarkAllPaid}
                        className="h-8 px-3 border border-primary text-primary rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-primary/10 transition"
                    >
                        <PillCheckmarkSvg />
                        Mark all paid &amp; verified
                    </button>
                </div>

                {/* Mobile Cards List */}
                <div className="flex flex-col gap-3">
                    {filteredEntries.length === 0 ? (
                        <div className="py-12 px-4 text-center text-muted-foreground text-sm bg-card rounded-2xl border border-border shadow-xs space-y-3">
                            <p className="font-medium">
                                {effectiveFilter === 'not_forwarded'
                                    ? 'No pending approvals! All entries have been processed.'
                                    : 'No tournament entries found.'}
                            </p>
                            {effectiveFilter === 'not_forwarded' && tabCounts.all > 0 && (
                                <div className="flex items-center justify-center gap-2 pt-1">
                                    {tabCounts.approved > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter('approved')
                                                if (onStatusChange) onStatusChange('approved')
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shadow-2xs"
                                        >
                                            View Approved ({tabCounts.approved})
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStatusFilter('all')
                                            if (onStatusChange) onStatusChange('all')
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted dark:bg-border text-foreground hover:bg-border cursor-pointer transition"
                                    >
                                        View All ({tabCounts.all})
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredEntries.map((entry) => {
                            const isSelected = selectedIds.has(entry.id)
                            const isPaid = Boolean(genericCheckedMap[entry.id])
                            const isLocked = entry.status === 'approved' || entry.status === 'submitted'
                            const tags = getAppliedTags(entry)
                            const age = getAthleteAge(entry.students?.date_of_birth)
                            const dojo = getDojo(entry)
                            const rank = formatBelt(entry.students?.rank)
                            const weight = entry.declared_weight_kg || entry.students?.weight || '—'

                            return (
                                <div
                                    key={entry.id}
                                    className={`rounded-2xl p-4 transition-all border ${
                                        isSelected
                                            ? 'bg-primary/5 dark:bg-muted border-primary/60 ring-1 ring-primary/30'
                                            : 'bg-card border-border shadow-xs'
                                    }`}
                                >
                                    {/* Card Header: Checkbox + Avatar + Name/Email + Chest */}
                                    <div className="flex gap-3 items-center">
                                        {entry.status === 'approved' ? (
                                            <span
                                                title="Approved athletes cannot be selected"
                                                className="w-5 h-5 rounded-[6px] border border-border/80 dark:border-border bg-muted/40 dark:bg-white/5 opacity-30 cursor-not-allowed flex items-center justify-center select-none shrink-0"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => handleToggleSelect(entry.id)}
                                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center cursor-pointer transition shrink-0 ${
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border bg-white dark:bg-transparent'
                                                }`}
                                            >
                                                {isSelected && <CheckmarkSvg />}
                                            </span>
                                        )}

                                        <AthletePfp
                                            photoUrl={entry.students?.photo_url}
                                            name={entry.students?.name || 'Athlete'}
                                            subtitle={entry.dojos?.name || entry.parent_email || 'Athlete'}
                                            size={44}
                                            extraDetails={{
                                                dojo: entry.dojos?.name,
                                                chestNo: entry.chest_no,
                                                age: age !== '—' ? age : undefined,
                                                rank: entry.students?.rank,
                                                gender: entry.students?.gender,
                                                category: [entry.kata_category, entry.kumite_category].filter(Boolean).join(' • ') || undefined,
                                                email: entry.parent_email,
                                                phone: entry.students?.phone,
                                            }}
                                        />

                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-bold text-foreground truncate">
                                                {entry.students?.name || 'Athlete'}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {entry.parent_email || entry.students?.phone || 'athlete@email.com'}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] tracking-wider uppercase font-bold text-muted-foreground">
                                                Chest
                                            </div>
                                            <div
                                                className={`text-sm font-bold ${
                                                    entry.chest_no ? 'text-primary' : 'text-muted-foreground'
                                                }`}
                                            >
                                                {entry.chest_no ? `#${String(entry.chest_no).padStart(3, '0')}` : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4-Item Spec Grid (Age / Belt / Weight / Dojo) */}
                                    <div className="grid grid-cols-4 gap-2 mt-3 py-2.5 border-t border-b border-border/80 dark:border-border text-xs">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                Age
                                            </div>
                                            <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                                                {age}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                Belt
                                            </div>
                                            <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                                                {rank}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                Weight
                                            </div>
                                            <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                                                {weight !== '—' ? `${weight} kg` : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                Dojo
                                            </div>
                                            <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                                                {dojo}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Events Applied Tags */}
                                    <div className="flex gap-1.5 flex-wrap mt-3">
                                        {tags.map((t, idx) => {
                                            const isDay = t.toLowerCase().startsWith('day')
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${
                                                        isDay
                                                            ? 'bg-primary/12 text-primary dark:bg-primary/20 dark:text-primary border border-primary/30 dark:border-primary/40 font-bold'
                                                            : 'bg-muted text-muted-foreground dark:text-foreground border border-border'
                                                    }`}
                                                >
                                                    {t}
                                                </span>
                                            )
                                        })}
                                    </div>

                                    {/* Card Footer: Paid Toggle + Status + Three-dot Menu */}
                                    <div className="flex gap-2.5 mt-3 items-center">
                                        {/* Paid Toggle Button */}
                                        <div
                                            onClick={() => handleTogglePaid(entry)}
                                            className={`h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-2 select-none cursor-pointer transition flex-1 ${
                                                isPaid
                                                    ? 'bg-primary/10 dark:bg-primary/15 border border-primary/40 dark:border-primary text-primary font-bold'
                                                    : 'bg-white dark:bg-transparent border border-border text-muted-foreground dark:text-foreground'
                                            } ${isLocked ? 'opacity-55 cursor-default' : ''}`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition shrink-0 ${
                                                    isPaid
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border'
                                                }`}
                                            >
                                                {isPaid && <CheckmarkSvg />}
                                            </span>
                                            <span>Paid &amp; verified</span>
                                        </div>

                                        {/* Status */}
                                        {entry.status === 'approved' ? (
                                            <span className="text-xs font-bold text-primary inline-flex items-center gap-1 whitespace-nowrap">
                                                <Check className="h-3 w-3" />
                                                Approved
                                            </span>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1 whitespace-nowrap">
                                                <Check className="h-3 w-3" />
                                                Forwarded
                                            </span>
                                        ) : entry.status === 'rejected' || entry.status === 'coach_declined' ? (
                                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 whitespace-nowrap">
                                                <X className="h-3 w-3" />
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1 whitespace-nowrap">
                                                <Circle className="h-2.5 w-2.5" />
                                                Not forwarded
                                            </span>
                                        )}

                                        {/* Three-dot Button */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-9 h-9 rounded-xl border border-border text-muted-foreground inline-flex items-center justify-center text-xs hover:text-foreground transition shrink-0"
                                                    aria-label="Row menu"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-56 bg-muted border border-border rounded-xl p-1.5 shadow-xl z-50 text-foreground"
                                            >
                                                {entry.status === 'approved' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(`/athlete/entries/${entry.id}/id-card`, '_blank')
                                                        }
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-background dark:hover:bg-[#1f304d] rounded-lg cursor-pointer transition"
                                                    >
                                                        <span className="text-primary flex">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs">
                                                                Download ID card
                                                            </div>
                                                            <div className="text-muted-foreground text-[10.5px]">
                                                                PDF · Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 cursor-not-allowed select-none opacity-50">
                                                        <span className="flex text-muted-foreground">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs text-muted-foreground">
                                                                Download ID card
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                                                                <MenuLockSvg />
                                                                Not generated yet
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="h-[1px] bg-border my-1" />

                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEntryToReject(entry)
                                                        setRejectDialogOpen(true)
                                                    }}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer transition"
                                                >
                                                    <MenuRejectSvg />
                                                    Reject entry
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

            </div>
        </>
    )
}
