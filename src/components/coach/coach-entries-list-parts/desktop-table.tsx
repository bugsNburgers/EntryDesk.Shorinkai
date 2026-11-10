'use client'

// Coach entries on laptop (lg+). The count boxes above (CoachOverview) are the filter, so there are no
// tabs here. Every row has labelled buttons: "Send back" and "Send to organiser" (09/11/2026 redesign).

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Download, Loader2, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { EntrySnapshotDialog } from '@/components/events/entry-snapshot-dialog'
import { formatStepDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { getAthleteAge, formatBelt, getAppliedTags } from './shared'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachEntriesDesktopTable({ vm }: { vm: CoachEntriesListVM }) {
    const {
        onStatusChange, effectiveFilter, getDojo, filteredEntries, tabCounts, headingInfo, selectableEntries, isAllSelected,
        handleToggleSelect, handleToggleSelectAll, handleTogglePaid, handleMarkAllPaid, selectedIds, genericCheckedMap,
        setStatusFilter, setRejectDialogOpen, setEntryToReject, isReadOnly, handleForwardOne, busyEntryId,
        setSendBackEntry, setSendBackNote,
    } = vm

    return (
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">{headingInfo.title}</h3>
                    <p className="mt-0.5 text-[15px] text-muted-foreground">{headingInfo.subtitle}</p>
                </div>
                {!isReadOnly && selectableEntries.length > 1 && (
                    <button
                        type="button"
                        onClick={handleMarkAllPaid}
                        className="min-h-11 shrink-0 rounded-lg border border-border bg-card px-4 text-[15px] font-semibold transition-colors hover:bg-muted"
                    >
                        Mark all as paid
                    </button>
                )}
            </div>

            {filteredEntries.length === 0 ? (
                <div className="space-y-3 py-14 text-center">
                    <p className="text-base font-medium text-foreground">
                        {effectiveFilter === 'not_forwarded' ? 'Nothing waiting for you. All entries are checked.' : 'No entries here.'}
                    </p>
                    {effectiveFilter !== 'all' && tabCounts.all > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusFilter('all')
                                onStatusChange?.('all')
                            }}
                            className="min-h-11 rounded-lg border border-border bg-background px-4 text-[15px] font-semibold"
                        >
                            See all entries ({tabCounts.all})
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
                                        checked={isAllSelected && selectableEntries.length > 0}
                                        disabled={selectableEntries.length === 0}
                                        onChange={handleToggleSelectAll}
                                    />
                                </th>
                                <th className="px-3 py-3">Athlete</th>
                                <th className="px-3 py-3">Age · belt · weight</th>
                                <th className="px-3 py-3">Day · events</th>
                                <th className="px-3 py-3">Fees</th>
                                <th className="px-3 py-3">Stage</th>
                                <th className="py-3 pl-3 pr-5 text-right">What to do</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map((entry) => {
                                const isSelected = selectedIds.has(entry.id)
                                const isPaid = Boolean(genericCheckedMap[entry.id])
                                const canAct = !isReadOnly && (entry.status === 'draft' || entry.status === 'pending_coach')
                                const canSendBack = !isReadOnly && entry.status === 'pending_coach'
                                const tags = getAppliedTags(entry).filter((t) => !t.toLowerCase().startsWith('day'))
                                const age = getAthleteAge(entry.students?.date_of_birth)
                                const rank = formatBelt(entry.students?.rank)
                                const weight = entry.declared_weight_kg || entry.students?.weight
                                const day = entry.event_days?.date ? formatStepDate(entry.event_days.date) : entry.event_days?.name
                                const sentBy = entry.parent_name || entry.parent_email
                                const busy = busyEntryId === entry.id
                                return (
                                    <tr
                                        key={entry.id}
                                        className={cn('border-b border-border align-middle transition-colors', isSelected ? 'bg-primary/5' : 'hover:bg-background')}
                                    >
                                        <td className="py-3 pl-5 pr-2">
                                            {canAct ? (
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Tick ${entry.students?.name || 'athlete'}`}
                                                    className="h-5 w-5 accent-[var(--primary)]"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(entry.id)}
                                                />
                                            ) : null}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-3">
                                                <AthletePfp
                                                    photoUrl={entry.students?.photo_url}
                                                    name={entry.students?.name || 'Athlete'}
                                                    subtitle={getDojo(entry)}
                                                    size={44}
                                                    extraDetails={{
                                                        dojo: entry.dojos?.name,
                                                        chestNo: entry.chest_no,
                                                        age: age !== '—' ? age : undefined,
                                                        rank: entry.students?.rank,
                                                        gender: entry.students?.gender,
                                                        email: entry.parent_email,
                                                        phone: entry.students?.phone,
                                                    }}
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-foreground">
                                                        {entry.students?.name || 'Athlete'}
                                                        {entry.chest_no ? (
                                                            <span className="ml-2 rounded-md bg-foreground px-1.5 py-0.5 text-xs font-bold text-background">
                                                                Chest {entry.chest_no}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-[13px] text-muted-foreground">
                                                        {sentBy ? `Sent by ${sentBy}` : 'Added by you'}
                                                        {entry.created_at ? ` · ${formatStepDate(entry.created_at)}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {age !== '—' ? `${age} yrs` : '—'} · {rank} · {weight ? `${weight} kg` : '—'}
                                        </td>
                                        <td className="px-3 py-3">{[day, tags.join(' and ')].filter(Boolean).join(' · ')}</td>
                                        <td className="px-3 py-3">
                                            {canAct ? (
                                                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 accent-[var(--primary)]"
                                                        checked={isPaid}
                                                        onChange={() => handleTogglePaid(entry)}
                                                    />
                                                    Paid
                                                </label>
                                            ) : (
                                                <span className="text-muted-foreground">{isPaid ? 'Paid' : '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusBadge status={entry.status} size="sm" />
                                        </td>
                                        <td className="py-3 pl-3 pr-5">
                                            <div className="flex items-center justify-end gap-2">
                                                {canSendBack && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSendBackNote('')
                                                            setSendBackEntry(entry)
                                                        }}
                                                        className="min-h-11 whitespace-nowrap rounded-lg border-[1.5px] border-border bg-card px-3.5 font-semibold transition-colors hover:bg-muted"
                                                    >
                                                        Send back
                                                    </button>
                                                )}
                                                {canAct && (
                                                    <button
                                                        type="button"
                                                        disabled={!isPaid || busy}
                                                        title={isPaid ? undefined : 'Tick “Paid” first'}
                                                        onClick={() => handleForwardOne(entry)}
                                                        className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45"
                                                    >
                                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                                                        Send to organiser
                                                    </button>
                                                )}
                                                {!isReadOnly && (entry.status === 'submitted' || entry.status === 'approved') && (
                                                    <EntrySnapshotDialog entryId={entry.id} labelled triggerLabel="Fix details" initial={{
                name: entry.students?.name ?? '',
                gender: entry.students?.gender ?? null,
                date_of_birth: entry.students?.date_of_birth ?? null,
                rank: entry.students?.rank ?? null,
                weight: entry.declared_weight_kg ?? entry.students?.weight ?? null,
                school_or_city: entry.students?.school_or_city ?? null,
            }} />
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
                                                {!isReadOnly && entry.status !== 'approved' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type="button"
                                                                aria-label={`More for ${entry.students?.name || 'this athlete'}`}
                                                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border-[1.5px] border-border bg-card transition-colors hover:bg-muted"
                                                            >
                                                                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEntryToReject(entry)
                                                                    setRejectDialogOpen(true)
                                                                }}
                                                                className="min-h-11 gap-2.5 rounded-lg px-3 text-[15px] font-semibold text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                Remove from this event
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
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
