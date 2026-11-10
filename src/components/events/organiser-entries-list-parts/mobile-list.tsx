'use client'

// Organiser entries on phone/tablet (< lg): one card per athlete with labelled buttons.

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Check, Download, Hash, Info, MoreHorizontal, X } from 'lucide-react'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { SafeAvatar } from '@/components/ui/safe-avatar'
import { EntrySnapshotDialog } from '@/components/events/entry-snapshot-dialog'
import { getAthleteAge, formatBelt } from './shared'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function eventsText(participation: string | null | undefined, category: string | null | undefined): string {
    const t = `${participation || ''} ${category || ''}`.toLowerCase()
    const out: string[] = []
    const both = t.includes('both')
    if (both || /\bkata\b/.test(t.replace('team_kata', '').replace('team kata', ''))) out.push('Kata')
    if (both || /\bkumite\b/.test(t.replace('team_kumite', '').replace('team kumite', ''))) out.push('Kumite')
    if (t.includes('team_kata') || t.includes('team kata')) out.push('Team Kata')
    if (t.includes('team_kumite') || t.includes('team kumite')) out.push('Team Kumite')
    return out.length ? out.join(', ') : '—'
}

export function OrganiserEntriesMobileList({ vm }: { vm: OrganiserEntriesListVM }) {
    const {
        visibleEntries, counts, activeTab, setActiveTab, handleApproveSingle, handleOpenRejectSingle, handleOpenChestDialog,
        isActionPending, setDetailDialogOpen, setSelectedDetailEntry, selectedIds, handleToggleSelectOne,
    } = vm

    return (
        <div className="block space-y-3 pb-8 lg:hidden">
            <div>
                <h3 className="text-lg font-bold">{vm.headingInfo.title}</h3>
                <p className="text-[15px] text-muted-foreground">{vm.headingInfo.subtitle}</p>
            </div>
            {visibleEntries.length === 0 ? (
                <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-10 text-center">
                    <p className="text-base font-medium">
                        {activeTab === 'pending' ? 'Nothing to accept right now.' : 'No entries here.'}
                    </p>
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
                visibleEntries.map((entry) => {
                    const age = getAthleteAge(entry.student_dob)
                    const weight = entry.declared_weight_kg || entry.student_weight
                    const toAccept = entry.status === 'submitted'
                    return (
                        <article key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-start gap-3">
                                {toAccept && (
                                    <input
                                        type="checkbox"
                                        aria-label={`Tick ${entry.student_name}`}
                                        className="mt-3 h-6 w-6 shrink-0 accent-[var(--primary)]"
                                        checked={selectedIds.has(entry.id)}
                                        onChange={() => handleToggleSelectOne(entry.id)}
                                    />
                                )}
                                <AthletePfp photoUrl={entry.student_photo} name={entry.student_name} subtitle={entry.dojo_name || ''} size={52} />
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-lg font-bold leading-tight">
                                        {entry.student_name}
                                        {entry.chest_no ? (
                                            <span className="ml-2 rounded-md bg-foreground px-1.5 py-0.5 align-middle text-xs font-bold text-background">
                                                Chest {entry.chest_no}
                                            </span>
                                        ) : null}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{entry.dojo_name || '—'}</p>
                                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <SafeAvatar src={entry.coach_avatar} name={entry.coach_name || entry.coach_email} size={22} enlargeable subtitle={entry.coach_email} />
                                        <span className="truncate">{entry.coach_name || entry.coach_email}</span>
                                    </p>
                                    <StatusBadge status={entry.status} size="sm" className="mt-1.5" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 rounded-lg bg-background px-3 py-2.5 text-base">
                                <div className="font-semibold">
                                    {age !== '—' ? `${age} yrs` : 'Age —'} · {formatBelt(entry.student_rank)} belt · {weight ? `${weight} kg` : 'Weight —'}
                                </div>
                                <div className="text-foreground/80">
                                    {[entry.category_name || 'Category not set', eventsText(entry.participation_type, entry.category_name)].join(' · ')}
                                </div>
                            </div>

                            {entry.rejection_reason && (entry.status === 'rejected' || entry.status === 'coach_declined') && (
                                <p className="rounded-lg bg-[var(--status-closed-bg)] px-3 py-2 text-[15px] text-[var(--status-closed-fg)]">
                                    Reason: “{entry.rejection_reason}”
                                </p>
                            )}

                            <div className="flex gap-2">
                                {toAccept && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={isActionPending}
                                            onClick={() => handleApproveSingle(entry)}
                                            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            <Check className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
                                            Accept
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenRejectSingle(entry)}
                                            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-border bg-card px-3 text-base font-semibold transition-colors hover:bg-muted"
                                        >
                                            Don&apos;t accept
                                        </button>
                                    </>
                                )}
                                {entry.status === 'approved' && (
                                    <a
                                        href={`/athlete/entries/${entry.id}/id-card`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-border bg-card px-3 text-base font-semibold transition-colors hover:bg-muted"
                                    >
                                        <Download className="h-5 w-5" aria-hidden="true" />
                                        ID card
                                    </a>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label={`More for ${entry.student_name}`}
                                            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-[1.5px] border-border bg-card transition-colors hover:bg-muted"
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
                            {(entry.status === 'submitted' || entry.status === 'approved' || entry.status === 'correction_needed') && (
                                <EntrySnapshotDialog
                                    entryId={entry.id}
                                    labelled
                                    triggerLabel="Fix name, age, belt or weight"
                                    triggerClassName="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-border bg-card px-3 text-base font-semibold hover:bg-muted"
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
                        </article>
                    )
                })
            )}
        </div>
    )
}
