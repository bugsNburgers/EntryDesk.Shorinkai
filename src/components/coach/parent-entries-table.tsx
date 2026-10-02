'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Send,
    RotateCcw,
    XCircle,
    Loader2,
    Search,
    Phone,
    Mail,
    User,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import {
    coachForwardEntry,
    coachBulkForwardEntries,
    coachRequestCorrection,
    coachDeclineEntry,
    coachWithdrawEntry,
} from '@/app/dashboard/parent-entries/actions'
import { getStatusLabel, getStatusBgClass } from '@/lib/status'

export interface ParentEntryRow {
    id: string
    event_id: string
    event_title: string
    student_id: string
    student_name: string
    student_rank: string | null
    student_weight: number | null
    student_photo: string | null
    student_gender: string
    category_name: string | null
    participation_type: string | null
    declared_weight_kg: number | null
    status: string
    coach_notes: string | null
    rejection_reason: string | null
    created_at: string
    parent_name: string | null
    parent_email: string | null
    parent_phone: string | null
}

interface ParentEntriesTableProps {
    entries: ParentEntryRow[]
}

export function ParentEntriesTable({ entries }: ParentEntriesTableProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isPending, startTransition] = useTransition()
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Modal states
    const [activeDialog, setActiveDialog] = useState<'correction' | 'decline' | 'withdraw' | null>(null)
    const [activeEntry, setActiveEntry] = useState<ParentEntryRow | null>(null)
    const [modalReason, setModalReason] = useState('')

    const pendingEntries = entries.filter(
        (e) => e.status === 'pending_coach' || e.status === 'correction_needed'
    )
    const allSelected =
        pendingEntries.length > 0 &&
        pendingEntries.every((e) => selectedIds.has(e.id))
    const isIndeterminate =
        selectedIds.size > 0 && selectedIds.size < pendingEntries.length

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(pendingEntries.map((e) => e.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const next = new Set(selectedIds)
        if (checked) {
            next.add(id)
        } else {
            next.delete(id)
        }
        setSelectedIds(next)
    }

    const handleSingleForward = (entry: ParentEntryRow) => {
        setActionMessage(null)
        startTransition(async () => {
            const res = await coachForwardEntry(entry.id)
            if (res.error) {
                setActionMessage({ type: 'error', text: res.error })
            } else {
                setActionMessage({
                    type: 'success',
                    text: `Forwarded ${entry.student_name}'s entry to the organiser.`,
                })
                router.refresh()
            }
        })
    }

    const handleBulkForward = () => {
        if (selectedIds.size === 0) return
        setActionMessage(null)
        startTransition(async () => {
            const ids = Array.from(selectedIds)
            const res = await coachBulkForwardEntries(ids)
            if (res.error) {
                setActionMessage({ type: 'error', text: res.error })
            } else {
                setSelectedIds(new Set())
                setActionMessage({
                    type: 'success',
                    text: `Successfully forwarded ${res.count ?? ids.length} entries to organiser.`,
                })
                router.refresh()
            }
        })
    }

    const openCorrectionModal = (entry: ParentEntryRow) => {
        setActiveEntry(entry)
        setModalReason(entry.coach_notes || '')
        setActiveDialog('correction')
    }

    const openDeclineModal = (entry: ParentEntryRow) => {
        setActiveEntry(entry)
        setModalReason(entry.rejection_reason || '')
        setActiveDialog('decline')
    }

    const handleConfirmCorrection = () => {
        if (!activeEntry) return
        if (!modalReason.trim()) {
            alert('Please provide instructions for the parent.')
            return
        }
        startTransition(async () => {
            const res = await coachRequestCorrection(activeEntry.id, modalReason)
            if (res.error) {
                alert(res.error)
            } else {
                setActiveDialog(null)
                setActiveEntry(null)
                setModalReason('')
                setActionMessage({
                    type: 'success',
                    text: `Sent correction request to ${activeEntry.student_name}'s parent.`,
                })
                router.refresh()
            }
        })
    }

    const handleConfirmDecline = () => {
        if (!activeEntry) return
        if (!modalReason.trim()) {
            alert('Please provide a reason for declining.')
            return
        }
        startTransition(async () => {
            const res = await coachDeclineEntry(activeEntry.id, modalReason)
            if (res.error) {
                alert(res.error)
            } else {
                setActiveDialog(null)
                setActiveEntry(null)
                setModalReason('')
                setActionMessage({
                    type: 'success',
                    text: `Declined entry for ${activeEntry.student_name}.`,
                })
                router.refresh()
            }
        })
    }

    const openWithdrawModal = (entry: ParentEntryRow) => {
        setActiveEntry(entry)
        setModalReason('')
        setActiveDialog('withdraw')
    }

    const handleConfirmWithdraw = () => {
        if (!activeEntry) return
        if (!modalReason.trim()) {
            alert('Please provide a reason for withdrawing.')
            return
        }
        startTransition(async () => {
            const res = await coachWithdrawEntry(activeEntry.id, modalReason)
            if (res.error) {
                alert(res.error)
            } else {
                setActiveDialog(null)
                setActiveEntry(null)
                setModalReason('')
                setActionMessage({
                    type: 'success',
                    text: `Withdrew ${activeEntry.student_name}'s entry from the organiser.`,
                })
                router.refresh()
            }
        })
    }

    return (
        <div className="space-y-4">
            {actionMessage && (
                <div
                    className={`rounded-xl p-3.5 text-xs flex items-center gap-2.5 ${
                        actionMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                    }`}
                >
                    {actionMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span>{actionMessage.text}</span>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:px-4">
                    <span className="text-xs sm:text-sm font-semibold text-primary">
                        {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'} selected
                    </span>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handleBulkForward}
                            disabled={isPending}
                            className="rounded-md h-9 text-xs font-semibold gap-1.5"
                        >
                            {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            Send to Organiser ({selectedIds.size})
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIds(new Set())}
                            disabled={isPending}
                            className="rounded-md h-9 text-xs text-muted-foreground"
                        >
                            Deselect all
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="relative w-full overflow-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm text-left caption-bottom">
                    <thead className="bg-muted/40 border-b">
                        <tr>
                            <th className="h-11 px-3 sm:px-4 w-[40px] align-middle">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(c) => handleSelectAll(!!c)}
                                    ref={(input) => {
                                        if (input) {
                                            // @ts-ignore
                                            input.indeterminate = isIndeterminate
                                        }
                                    }}
                                />
                            </th>
                            <th className="h-11 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Athlete
                            </th>
                            <th className="h-11 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Submitted By / Contact
                            </th>
                            <th className="h-11 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Tournament
                            </th>
                            <th className="h-11 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Category & Events
                            </th>
                            <th className="h-11 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Status
                            </th>
                            <th className="h-11 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">
                                Review Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className="py-16 text-center space-y-3">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                            <Search className="h-7 w-7 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">
                                            No entries found
                                        </p>
                                        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                            When parents or athletes submit registrations via your dojo join link, their entries will appear here for your review.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry) => {
                                const isPendingCoach =
                                    entry.status === 'pending_coach' ||
                                    entry.status === 'correction_needed'

                                return (
                                    <tr
                                        key={entry.id}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="p-3 sm:p-4 align-middle">
                                            <Checkbox
                                                checked={selectedIds.has(entry.id)}
                                                onCheckedChange={(c) =>
                                                    handleSelectOne(entry.id, !!c)
                                                }
                                                disabled={!isPendingCoach}
                                            />
                                        </td>

                                        {/* Athlete Info with Photo */}
                                        <td className="p-3 sm:p-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-9 w-9 rounded-full overflow-hidden bg-primary/10 border flex items-center justify-center shrink-0">
                                                    {entry.student_photo ? (
                                                        <Image
                                                            src={entry.student_photo}
                                                            alt={entry.student_name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-bold text-primary">
                                                            {entry.student_name.slice(0, 1).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground truncate">
                                                        {entry.student_name}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground capitalize">
                                                        {entry.student_rank || 'Open belt'} • {entry.student_gender}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Parent Contact */}
                                        <td className="p-3 sm:p-4 align-middle text-xs">
                                            <div className="space-y-0.5">
                                                <p className="font-medium text-foreground flex items-center gap-1.5 truncate">
                                                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                                    {entry.parent_name || 'Athlete / Parent'}
                                                </p>
                                                {entry.parent_phone && (
                                                    <a
                                                        href={`https://wa.me/${entry.parent_phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <Phone className="h-2.5 w-2.5" />
                                                        {entry.parent_phone}
                                                    </a>
                                                )}
                                                {entry.parent_email && !entry.parent_phone && (
                                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                                        <Mail className="h-2.5 w-2.5" />
                                                        {entry.parent_email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>

                                        {/* Tournament Title */}
                                        <td className="p-3 sm:p-4 align-middle">
                                            <p className="font-semibold text-xs sm:text-sm text-foreground max-w-[180px] truncate">
                                                {entry.event_title}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {new Date(entry.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                        </td>

                                        {/* Category & Events */}
                                        <td className="p-3 sm:p-4 align-middle text-xs">
                                            <p className="font-medium text-foreground truncate max-w-[160px]">
                                                {entry.category_name || 'Open'}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground capitalize">
                                                {entry.participation_type || 'Both'}
                                                {entry.declared_weight_kg ? ` • ${entry.declared_weight_kg} kg` : ''}
                                            </p>
                                        </td>

                                        {/* Status */}
                                        <td className="p-3 sm:p-4 align-middle">
                                            <div className="space-y-1">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBgClass(
                                                        entry.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(entry.status, 'coach')}
                                                </span>
                                                {entry.coach_notes && (
                                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 max-w-[180px] truncate" title={entry.coach_notes}>
                                                        Note: {entry.coach_notes}
                                                    </p>
                                                )}
                                            </div>
                                        </td>

                                        {/* Action buttons */}
                                        <td className="p-3 sm:p-4 align-middle text-right">
                                            {isPendingCoach ? (
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSingleForward(entry)}
                                                        disabled={isPending}
                                                        className="h-8 rounded-md text-xs gap-1 px-2.5"
                                                    >
                                                        <Send className="h-3 w-3" />
                                                        Send
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openCorrectionModal(entry)}
                                                        disabled={isPending}
                                                        className="h-8 rounded-md text-xs gap-1 px-2.5 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-800"
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        Fix
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openDeclineModal(entry)}
                                                        disabled={isPending}
                                                        className="h-8 rounded-md text-xs gap-1 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 justify-end">
                                                    <span className="text-xs text-muted-foreground italic">
                                                        {entry.status === 'approved'
                                                            ? 'Accepted'
                                                            : entry.status === 'submitted'
                                                            ? 'Forwarded'
                                                            : 'Processed'}
                                                    </span>
                                                    {(entry.status === 'submitted' || entry.status === 'approved') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openWithdrawModal(entry)}
                                                            disabled={isPending}
                                                            title="Withdraw entry from organiser before deadline"
                                                            className="h-7 text-[11px] gap-1 px-2 text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            <span>Withdraw</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Correction Request Dialog */}
            <Dialog
                open={activeDialog === 'correction'}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveDialog(null)
                        setActiveEntry(null)
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Send Back for Correction</DialogTitle>
                        <DialogDescription>
                            Ask the athlete or parent of{' '}
                            <span className="font-semibold text-foreground">
                                {activeEntry?.student_name}
                            </span>{' '}
                            to update details (e.g., photo, belt rank, or weight) before forwarding.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label htmlFor="correction-notes" className="text-xs font-semibold">
                            What needs to be corrected? *
                        </Label>
                        <Input
                            id="correction-notes"
                            placeholder="e.g. Please upload a clear passport photo with white background"
                            value={modalReason}
                            onChange={(e) => setModalReason(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setActiveDialog(null)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmCorrection}
                            disabled={isPending || !modalReason.trim()}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                            Request Correction
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Decline Dialog */}
            <Dialog
                open={activeDialog === 'decline'}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveDialog(null)
                        setActiveEntry(null)
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Decline Tournament Entry</DialogTitle>
                        <DialogDescription>
                            Are you sure you do not want to forward{' '}
                            <span className="font-semibold text-foreground">
                                {activeEntry?.student_name}
                            </span>
                            ’s entry to the organiser?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label htmlFor="decline-reason" className="text-xs font-semibold">
                            Reason for declining *
                        </Label>
                        <Input
                            id="decline-reason"
                            placeholder="e.g. Athlete not eligible for this division"
                            value={modalReason}
                            onChange={(e) => setModalReason(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setActiveDialog(null)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDecline}
                            disabled={isPending || !modalReason.trim()}
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                            Confirm Decline
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Withdraw from Organiser Dialog (Coach) */}
            <Dialog
                open={activeDialog === 'withdraw'}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveDialog(null)
                        setActiveEntry(null)
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-rose-600 dark:text-rose-400">
                            Withdraw Entry from Organiser
                        </DialogTitle>
                        <DialogDescription>
                            Withdraw{' '}
                            <span className="font-semibold text-foreground">
                                {activeEntry?.student_name}
                            </span>{' '}
                            from{' '}
                            <span className="font-semibold text-foreground">
                                {activeEntry?.event_title}
                            </span>
                            . This action is permitted before the tournament registration deadline.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label htmlFor="withdraw-notes" className="text-xs font-semibold">
                            Reason for withdrawal *
                        </Label>
                        <Input
                            id="withdraw-notes"
                            placeholder="e.g. Athlete unavailable / medical reason"
                            value={modalReason}
                            onChange={(e) => setModalReason(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setActiveDialog(null)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmWithdraw}
                            disabled={isPending || !modalReason.trim()}
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                            Confirm Withdrawal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
