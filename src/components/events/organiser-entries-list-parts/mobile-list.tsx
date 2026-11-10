'use client'

// Mobile entry cards — moved verbatim from organiser-entries-list.tsx.

import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { Check, Eye } from 'lucide-react'
import { CheckmarkSvg, getAthleteAge, formatBelt, getAppliedTags } from './shared'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserEntriesMobileList({ vm }: { vm: OrganiserEntriesListVM }) {
    const { entries, filteredEntries, isAllSelected, handleToggleSelectAll, handleToggleSelectOne, handleApproveSingle, handleOpenRejectSingle, handleOpenChestDialog, selectedIds, isActionPending, setDetailDialogOpen, setSelectedDetailEntry } = vm
    return (
        <>
            {/* ========================================================================= */}
            {/* 4. MOBILE CARD VIEW (Responsive Light & Dark Modes)                       */}
            {/* ========================================================================= */}
            <div className="lg:hidden space-y-3 pb-8">
                {/* Mobile Select All */}
                <div className="flex items-center justify-between px-2 py-1">
                    <span
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                isAllSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-border bg-white dark:bg-transparent'
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>
                        <span>Select All ({filteredEntries.length})</span>
                    </span>

                    {selectedIds.size > 0 && (
                        <span className="text-xs text-primary font-semibold">
                            {selectedIds.size} selected
                        </span>
                    )}
                </div>

                {filteredEntries.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-2xl shadow-xs">
                        No tournament entries found.
                    </div>
                ) : (
                    filteredEntries.map((entry) => {
                        const isSelected = selectedIds.has(entry.id)
                        const isApproved = entry.status === 'approved'
                        const isPending = entry.status === 'submitted'
                        const isRejected = entry.status === 'rejected'
                        const tags = getAppliedTags(entry)
                        const age = getAthleteAge(entry.student_dob)
                        const dojo = entry.dojo_name || '—'
                        const coach = entry.coach_name || entry.coach_email.split('@')[0] || '—'
                        const rank = formatBelt(entry.student_rank)
                        const weight = entry.declared_weight_kg || entry.student_weight || '—'

                        return (
                            <div
                                key={entry.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-primary/5 dark:bg-muted border-primary/60 ring-1 ring-primary/30'
                                        : 'bg-card border-border shadow-xs'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            onClick={() => handleToggleSelectOne(entry.id)}
                                            className={`w-5 h-5 rounded-[6px] border-2 cursor-pointer flex items-center justify-center shrink-0 transition ${
                                                isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border bg-white dark:bg-transparent'
                                            }`}
                                        >
                                            {isSelected && <CheckmarkSvg />}
                                        </span>

                                        <AthletePfp
                                            photoUrl={entry.student_photo}
                                            name={entry.student_name}
                                            subtitle={entry.dojo_name || entry.student_registration_no}
                                            size={44}
                                            extraDetails={{
                                                dojo: entry.dojo_name,
                                                chestNo: entry.chest_no,
                                                age: age !== '—' ? age : undefined,
                                                rank: entry.student_rank,
                                                gender: entry.student_gender,
                                                category: entry.category_name || undefined,
                                                email: entry.coach_email,
                                            }}
                                        />

                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-foreground truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chest # badge */}
                                    {entry.chest_no ? (
                                        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg px-2 py-0.5 shrink-0">
                                            #{String(entry.chest_no).padStart(3, '0')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-border/80 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Age / Belt: </span>
                                        <span className="text-foreground font-semibold">{age} · {rank}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Weight: </span>
                                        <span className="text-foreground font-semibold">{weight !== '—' ? `${weight} kg` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Dojo: </span>
                                        <span className="text-foreground font-semibold truncate">{dojo}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Coach: </span>
                                        <span className="text-foreground font-semibold truncate">{coach}</span>
                                    </div>
                                </div>

                                {/* Tags + Status */}
                                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/60">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[11px] font-semibold bg-muted text-muted-foreground dark:text-foreground border border-border rounded-full px-2 py-0.5"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    <div>
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35">
                                                Accepted ✓
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35">
                                                Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/35">
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-border/60">
                                    {isPending && (
                                        <>
                                            <Button
                                                size="sm"
                                                disabled={isActionPending}
                                                onClick={() => handleApproveSingle(entry)}
                                                className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 dark:bg-primary text-white dark:text-primary-foreground font-bold text-xs"
                                            >
                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isActionPending}
                                                onClick={() => handleOpenRejectSingle(entry)}
                                                className="h-8 px-3 rounded-xl border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-xs font-semibold"
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}

                                    {isApproved && (
                                        <Link
                                            href={`/athlete/entries/${entry.id}/id-card`}
                                            target="_blank"
                                            className="h-8 px-3 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold inline-flex items-center gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View Pass
                                        </Link>
                                    )}

                                    {/* Mobile 3-dot dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 rounded-xl border border-border text-muted-foreground inline-flex items-center justify-center text-xs">
                                                ···
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-48 bg-muted border border-border text-foreground rounded-xl shadow-xl p-1"
                                        >
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedDetailEntry(entry)
                                                    setDetailDialogOpen(true)
                                                }}
                                                className="text-xs py-2 cursor-pointer"
                                            >
                                                Athlete Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenChestDialog(entry)}
                                                className="text-xs py-2 text-primary cursor-pointer"
                                            >
                                                Edit Chest #
                                            </DropdownMenuItem>
                                            {!isApproved && (
                                                <DropdownMenuItem
                                                    onClick={() => handleApproveSingle(entry)}
                                                    className="text-xs py-2 text-primary cursor-pointer"
                                                >
                                                    Accept Entry
                                                </DropdownMenuItem>
                                            )}
                                            {!isRejected && (
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenRejectSingle(entry)}
                                                    className="text-xs py-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                                                >
                                                    Reject Entry
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )
                    })
                )}

            </div>
        </>
    )
}
