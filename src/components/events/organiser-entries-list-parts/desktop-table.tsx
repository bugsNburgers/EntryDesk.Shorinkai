'use client'

// Organiser entries on laptop (lg+). The count boxes above are the filter. Every row has labelled
// buttons ("Accept" / "Don't accept", or "ID card" once accepted) — no icon-only actions.

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Check, Download, Hash, Info, MoreHorizontal, X } from 'lucide-react'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { SafeAvatar } from '@/components/ui/safe-avatar'
import { EntrySnapshotDialog } from '@/components/events/entry-snapshot-dialog'
import { cn } from '@/lib/utils'
import { getAthleteAge, formatBelt } from './shared'
import { eventsText } from './mobile-list'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserEntriesDesktopTable({ vm }: { vm: OrganiserEntriesListVM }) {
    const {
        counts, headingInfo, visibleEntries, isAllSelected, handleToggleSelectAll, handleToggleSelectOne, handleApproveSingle,
        handleOpenRejectSingle, handleOpenChestDialog, selectedIds, isActionPending, activeTab, setActiveTab,
        setDetailDialogOpen, setSelectedDetailEntry,
    } = vm

    return (
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <div className="border-b border-border px-5 py-4">
                <h3 className="text-xl font-bold tracking-tight">{headingInfo.title}</h3>
                <p className="mt-0.5 text-[15px] text-muted-foreground">{headingInfo.subtitle}</p>
            </div>

            {visibleEntries.length === 0 ? (
                <div className="space-y-3 py-14 text-center">
                    <p className="text-base font-medium">{activeTab === 'pending' ? 'Nothing to accept right now.' : 'No entries here.'}</p>
                    {activeTab !== 'all' && counts.all > 0 && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className="min-h-11 rounded-lg border border-border bg-background px-4 text-[15px] font-semibold"
                        >
                            See all entries ({counts.all})
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[15px]">
                        <thead>
                            <tr className="border-b border-border text-left text-[13px] font-semibold text-muted-foreground">
                                <th className="w-12 py-3 pl-5 pr-2">
                                    <input
                                        type="checkbox"
                                        aria-label="Tick all"
                                        className="h-5 w-5 accent-[var(--primary)]"
                                        checked={isAllSelected}
                                        onChange={handleToggleSelectAll}
                                    />
                                </th>
                                <th className="px-3 py-3">Athlete</th>
                                <th className="px-3 py-3">Dojo · coach</th>
                                <th className="px-3 py-3">Age · belt · weight</th>
                                <th className="px-3 py-3">Category · events</th>
                                <th className="px-3 py-3">Stage</th>
                                <th className="py-3 pl-3 pr-5 text-right">What to do</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleEntries.map((entry) => {
                                const age = getAthleteAge(entry.student_dob)
                                const weight = entry.declared_weight_kg || entry.student_weight
                                const toAccept = entry.status === 'submitted'
                                return (
                                    <tr
                                        key={entry.id}
                                        className={cn('border-b border-border align-middle', selectedIds.has(entry.id) ? 'bg-primary/5' : 'hover:bg-background')}
                                    >
                                        <td className="py-3 pl-5 pr-2">
                                            <input
                                                type="checkbox"
                                                aria-label={`Tick ${entry.student_name}`}
                                                className="h-5 w-5 accent-[var(--primary)]"
                                                checked={selectedIds.has(entry.id)}
                                                onChange={() => handleToggleSelectOne(entry.id)}
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-3">
                                                <AthletePfp photoUrl={entry.student_photo} name={entry.student_name} subtitle={entry.dojo_name || ''} size={44} />
                                                <div className="min-w-0">
                                                    <div className="font-semibold">
                                                        {entry.student_name}
                                                        {entry.chest_no ? (
                                                            <span className="ml-2 rounded-md bg-foreground px-1.5 py-0.5 text-xs font-bold text-background">
                                                                Chest {entry.chest_no}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {entry.student_registration_no && (
                                                        <div className="text-[13px] text-muted-foreground">{entry.student_registration_no}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.dojo_name || '—'}
                                            <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                                                <SafeAvatar
                                                    src={entry.coach_avatar}
                                                    name={entry.coach_name || entry.coach_email}
                                                    size={26}
                                                    enlargeable
                                                    subtitle={entry.coach_email}
                                                />
                                                <span className="truncate">{entry.coach_name || entry.coach_email}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3">
                                            {age !== '—' ? `${age} yrs` : '—'} · {formatBelt(entry.student_rank)} · {weight ? `${weight} kg` : '—'}
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.category_name || <span className="text-muted-foreground">Not set</span>}
                                            <div className="text-[13px] text-muted-foreground">{eventsText(entry.participation_type, entry.category_name)}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusBadge status={entry.status} size="sm" />
                                        </td>
                                        <td className="py-3 pl-3 pr-5">
                                            <div className="flex items-center justify-end gap-2">
                                                {toAccept && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenRejectSingle(entry)}
                                                            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-border bg-card px-3.5 font-semibold transition-colors hover:bg-muted"
                                                        >
                                                            <X className="h-4 w-4" aria-hidden="true" />
                                                            Don&apos;t accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isActionPending}
                                                            onClick={() => handleApproveSingle(entry)}
                                                            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                                        >
                                                            <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                                                            Accept
                                                        </button>
                                                    </>
                                                )}
                                                {entry.status === 'approved' && (
                                                    <a
                                                        href={`/athlete/entries/${entry.id}/id-card`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-border bg-card px-3.5 font-semibold transition-colors hover:bg-muted"
                                                    >
                                                        <Download className="h-4 w-4" aria-hidden="true" />
                                                        ID card
                                                    </a>
                                                )}
                                                {(entry.status === 'submitted' || entry.status === 'approved' || entry.status === 'correction_needed') && (
                                                    <EntrySnapshotDialog
                                                        entryId={entry.id}
                                                        labelled
                                                        triggerLabel="Fix details"
                                                        initial={{
                                                            name: entry.student_name,
                                                            gender: entry.student_gender,
                                                            date_of_birth: entry.student_dob,
                                                            rank: entry.student_rank,
                                                            weight: entry.declared_weight_kg ?? entry.student_weight,
                                                            school_or_city: entry.student_school_or_city ?? null,
                                                        }}
                                                    />
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            aria-label={`More for ${entry.student_name}`}
                                                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border-[1.5px] border-border bg-card transition-colors hover:bg-muted"
                                                        >
                                                            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                                                        <DropdownMenuItem
                                                            className="min-h-11 gap-2.5 rounded-lg px-3 text-[15px] font-semibold"
                                                            onClick={() => {
                                                                setSelectedDetailEntry(entry)
                                                                setDetailDialogOpen(true)
                                                            }}
                                                        >
                                                            <Info className="h-4 w-4" aria-hidden="true" />
                                                            See all details
                                                        </DropdownMenuItem>
                                                        {entry.status === 'approved' && (
                                                            <DropdownMenuItem className="min-h-11 gap-2.5 rounded-lg px-3 text-[15px] font-semibold" onClick={() => handleOpenChestDialog(entry)}>
                                                                <Hash className="h-4 w-4" aria-hidden="true" />
                                                                Change chest number
                                                            </DropdownMenuItem>
                                                        )}
                                                        {entry.status === 'approved' && (
                                                            <DropdownMenuItem
                                                                className="min-h-11 gap-2.5 rounded-lg px-3 text-[15px] font-semibold text-destructive"
                                                                onClick={() => handleOpenRejectSingle(entry)}
                                                            >
                                                                <X className="h-4 w-4" aria-hidden="true" />
                                                                Don&apos;t accept
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
