'use client'

// Coach entries on phone/tablet (< lg). One card per athlete:
//   name + who sent it + a "Paid / Not paid" button in the corner
//   line 1: age · belt · weight      line 2: day · events
//   big "Send to organiser", then "Send back to fix" / "Remove"
// Layout agreed with the owner on the design canvas (09/11/2026).

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Check, Download, Loader2, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { EntrySnapshotDialog } from '@/components/events/entry-snapshot-dialog'
import { formatStepDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { getAthleteAge, formatBelt, getAppliedTags } from './shared'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachEntriesMobileList({ vm }: { vm: CoachEntriesListVM }) {
    const {
        onStatusChange, effectiveFilter, filteredEntries, tabCounts, handleTogglePaid, handleMarkAllPaid,
        genericCheckedMap, setStatusFilter, setRejectDialogOpen, setEntryToReject, isReadOnly,
        handleForwardOne, busyEntryId, setSendBackEntry, setSendBackNote,
    } = vm
    const waiting = filteredEntries.filter((e) => e.status === 'draft' || e.status === 'pending_coach')

    return (
        <div className="block lg:hidden space-y-3 pb-8">
            {!isReadOnly && waiting.length > 1 && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleMarkAllPaid}
                        className="min-h-11 rounded-lg border border-border bg-card px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        Mark all as paid
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {filteredEntries.length === 0 ? (
                    <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-10 text-center">
                        <p className="text-base font-medium text-foreground">
                            {effectiveFilter === 'not_forwarded' ? 'Nothing waiting for you. All entries are checked.' : 'No entries here.'}
                        </p>
                        {effectiveFilter === 'not_forwarded' && tabCounts.all > 0 && (
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
                    filteredEntries.map((entry) => {
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
                            <article key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start gap-3">
                                    <AthletePfp
                                        photoUrl={entry.students?.photo_url}
                                        name={entry.students?.name || 'Athlete'}
                                        subtitle={entry.dojos?.name || 'Athlete'}
                                        size={52}
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
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-bold leading-tight text-foreground">{entry.students?.name || 'Athlete'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {sentBy ? `Sent by ${sentBy}` : 'Added by you'}
                                            {entry.created_at ? ` on ${formatStepDate(entry.created_at)}` : ''}
                                        </p>
                                        {entry.students?.phone && (
                                            <a href={`tel:${entry.students.phone}`} className="text-[15px] font-semibold text-primary">
                                                Call parent
                                            </a>
                                        )}
                                    </div>
                                    {canAct ? (
                                        <button
                                            type="button"
                                            aria-pressed={isPaid}
                                            onClick={() => handleTogglePaid(entry)}
                                            className={cn(
                                                'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-bold transition-colors',
                                                isPaid
                                                    ? 'border-[1.5px] border-[var(--status-approved)]/40 bg-[var(--status-approved-bg)] text-[var(--status-approved-fg)]'
                                                    : 'border-[1.5px] border-dashed border-[var(--status-pending)] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]',
                                            )}
                                        >
                                            {isPaid && <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />}
                                            {isPaid ? 'Paid' : 'Not paid'}
                                        </button>
                                    ) : (
                                        <StatusBadge status={entry.status} size="sm" className="shrink-0" />
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 rounded-lg bg-background px-3 py-2.5 text-base">
                                    <div className="flex flex-wrap items-center gap-x-2 font-semibold text-foreground">
                                        <span>{age !== '—' ? `${age} yrs` : 'Age —'}</span>
                                        <span className="text-muted-foreground" aria-hidden="true">·</span>
                                        <span>{rank} belt</span>
                                        <span className="text-muted-foreground" aria-hidden="true">·</span>
                                        <span>{weight ? `${weight} kg` : 'Weight —'}</span>
                                        {entry.chest_no ? (
                                            <>
                                                <span className="text-muted-foreground" aria-hidden="true">·</span>
                                                <span>Chest {entry.chest_no}</span>
                                            </>
                                        ) : null}
                                    </div>
                                    <div className="text-foreground/80">
                                        {[day, tags.join(' and ')].filter(Boolean).join(' · ')}
                                    </div>
                                </div>

                                {entry.status === 'correction_needed' && entry.coach_notes && (
                                    <p className="rounded-lg bg-[var(--status-rejected-bg)] px-3 py-2 text-[15px] text-[var(--status-rejected-fg)]">
                                        You asked: “{entry.coach_notes}”
                                    </p>
                                )}
                                {(entry.status === 'rejected' || entry.status === 'coach_declined') && entry.rejection_reason && (
                                    <p className="rounded-lg bg-[var(--status-closed-bg)] px-3 py-2 text-[15px] text-[var(--status-closed-fg)]">
                                        Reason: “{entry.rejection_reason}”
                                    </p>
                                )}

                                {canAct && (
                                    <button
                                        type="button"
                                        disabled={!isPaid || busy}
                                        onClick={() => handleForwardOne(entry)}
                                        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45"
                                    >
                                        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                                        {isPaid ? 'Send to organiser' : 'Mark as paid first'}
                                    </button>
                                )}

                                <div className="flex gap-2">
                                    {canSendBack && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSendBackNote('')
                                                setSendBackEntry(entry)
                                            }}
                                            className="min-h-12 flex-1 rounded-xl border-[1.5px] border-border bg-card px-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                                        >
                                            Send back to fix
                                        </button>
                                    )}
                                    {entry.status === 'approved' && (
                                        <a
                                            href={`/athlete/entries/${entry.id}/id-card`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-border bg-card px-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                                        >
                                            <Download className="h-5 w-5" aria-hidden="true" />
                                            ID card
                                        </a>
                                    )}
                                    {!isReadOnly && entry.status !== 'approved' && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-[1.5px] border-border bg-card text-foreground transition-colors hover:bg-muted"
                                                    aria-label={`More for ${entry.students?.name || 'this athlete'}`}
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
                                {!isReadOnly && (entry.status === 'submitted' || entry.status === 'approved') && (
                                    <EntrySnapshotDialog
                                        entryId={entry.id}
                                        labelled
                                        triggerLabel="Fix name, age, belt or weight"
                                        triggerClassName="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-border bg-card px-3 text-base font-semibold hover:bg-muted"
                                        initial={{
                name: entry.students?.name ?? '',
                gender: entry.students?.gender ?? null,
                date_of_birth: entry.students?.date_of_birth ?? null,
                rank: entry.students?.rank ?? null,
                weight: entry.declared_weight_kg ?? entry.students?.weight ?? null,
                school_or_city: entry.students?.school_or_city ?? null,
            }}
                                    />
                                )}
                            </article>
                        )
                    })
                )}
            </div>
        </div>
    )
}
