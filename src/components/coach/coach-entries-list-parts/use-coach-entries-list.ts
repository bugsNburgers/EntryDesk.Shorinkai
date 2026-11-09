'use client'

// State, derived data and handlers of CoachEntriesList (moved verbatim from the component body).

import { useEffect, useMemo, useState, useTransition } from 'react'
import { bulkUpdateEntryGenericChecked, updateEntryGenericChecked, deleteEntry } from '@/app/dashboard/entries/actions'
import { coachBulkForwardEntries } from '@/app/dashboard/parent-entries/actions'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeCoachStatus, CoachEntriesListProps } from './shared'

export function useCoachEntriesList({
    entries: initialEntries,
    dojos = [],
    statusPreset = 'not_forwarded',
    onStatusChange,
    isReadOnly = false,
    isRegistrationClosed = false,
    eventId: propEventId,
    approvedCount,
    onAddStudent,
}: CoachEntriesListProps) {
    const [entries, setEntries] = useState<any[]>(initialEntries)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [genericCheckedMap, setGenericCheckedMap] = useState<Record<string, boolean>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState(normalizeCoachStatus(statusPreset))
    const effectiveFilter = normalizeCoachStatus(statusFilter)
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [entryToReject, setEntryToReject] = useState<any | null>(null)
    const [isRejecting, startRejectTransition] = useTransition()

    // Sync entries and payment map
    useEffect(() => {
        setEntries(initialEntries)
        const map: Record<string, boolean> = {}
        initialEntries.forEach((e) => {
            map[e.id] = Boolean(e.generic_checked)
        })
        setGenericCheckedMap(map)
    }, [initialEntries])

    // Sync statusPreset
    useEffect(() => {
        if (statusPreset) {
            setStatusFilter(normalizeCoachStatus(statusPreset))
        }
    }, [statusPreset])

    const eventId = propEventId || entries[0]?.event_id

    // Helper to get Dojo name
    const dojoNameById = useMemo(() => {
        const m = new Map<string, string>()
        dojos.forEach((d) => {
            if (d?.id && d?.name) m.set(String(d.id), d.name)
        })
        return m
    }, [dojos])

    const getDojo = (entry: any) => {
        return (
            entry.students?.dojo_name ||
            entry.students?.dojos?.name ||
            dojoNameById.get(String(entry.students?.dojo_id)) ||
            '—'
        )
    }

    // Filtered entries
    const filteredEntries = useMemo(() => {
        return entries.filter((e) => {
            // Status filter
            if (effectiveFilter === 'not_forwarded') {
                if (e.status !== 'draft' && e.status !== 'pending_coach' && e.status !== 'correction_needed') return false
            } else if (effectiveFilter === 'forwarded') {
                if (e.status !== 'submitted') return false
            } else if (effectiveFilter === 'approved') {
                if (e.status !== 'approved') return false
            } else if (effectiveFilter === 'rejected') {
                if (e.status !== 'rejected' && e.status !== 'coach_declined') return false
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const name = (e.students?.name || '').toLowerCase()
                const dojo = getDojo(e).toLowerCase()
                const rank = (e.students?.rank || '').toLowerCase()
                const email = (e.parent_email || '').toLowerCase()
                if (!name.includes(q) && !dojo.includes(q) && !rank.includes(q) && !email.includes(q)) {
                    return false
                }
            }
            return true
        })
    }, [entries, effectiveFilter, searchQuery, dojoNameById])

    // Counts for bottom floating bar
    const countPaid = useMemo(() => {
        return entries.filter(
            (e) => genericCheckedMap[e.id] && (e.status === 'draft' || e.status === 'pending_coach' || e.status === 'correction_needed')
        ).length
    }, [entries, genericCheckedMap])

    const countNotPaid = useMemo(() => {
        return entries.filter(
            (e) => !genericCheckedMap[e.id] && (e.status === 'draft' || e.status === 'pending_coach' || e.status === 'correction_needed')
        ).length
    }, [entries, genericCheckedMap])

    // Dynamic Tab Counts (Pending Approvals 1st)
    const tabCounts = useMemo(() => {
        return {
            not_forwarded: entries.filter((e) => e.status === 'draft' || e.status === 'pending_coach' || e.status === 'correction_needed').length,
            all: entries.length,
            forwarded: entries.filter((e) => e.status === 'submitted').length,
            approved: entries.filter((e) => e.status === 'approved').length,
            rejected: entries.filter((e) => e.status === 'rejected' || e.status === 'coach_declined').length,
        }
    }, [entries])

    // Dynamic Heading & Subtitle that updates as slider switches
    const headingInfo = useMemo(() => {
        switch (effectiveFilter) {
            case 'not_forwarded':
                return {
                    title: `Pending Approvals (${tabCounts.not_forwarded})`,
                    subtitle: 'Mark each student as paid & verified, then forward them to the organiser.',
                }
            case 'all':
                return {
                    title: `All Entries (${tabCounts.all})`,
                    subtitle: 'Filter, review, and manage your team athletes.',
                }
            case 'forwarded':
                return {
                    title: `Submitted Entries (${tabCounts.forwarded})`,
                    subtitle: 'Entries forwarded to the organiser awaiting verification.',
                }
            case 'approved':
                return {
                    title: `Approved Entries (${tabCounts.approved})`,
                    subtitle: 'Athletes approved and cleared for the tournament.',
                }
            case 'rejected':
                return {
                    title: `Rejected Entries (${tabCounts.rejected})`,
                    subtitle: 'Athletes whose entries were declined or rejected.',
                }
            default:
                return {
                    title: `Pending Approvals (${tabCounts.not_forwarded})`,
                    subtitle: 'Mark each student as paid & verified, then forward them to the organiser.',
                }
        }
    }, [effectiveFilter, tabCounts])

    // Dynamic Heading Color: Pending Approvals is RED if > 0, GREEN if 0
    const headingColor = useMemo(() => {
        if (effectiveFilter === 'not_forwarded') {
            return tabCounts.not_forwarded > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
        }
        return 'text-foreground'
    }, [effectiveFilter, tabCounts.not_forwarded])

    const selectedEntries = useMemo(() => {
        return entries.filter((e) => selectedIds.has(e.id))
    }, [entries, selectedIds])

    const selectedCount = selectedIds.size

    const selectableEntries = useMemo(() => {
        return filteredEntries.filter((e) => e.status !== 'approved')
    }, [filteredEntries])

    const isAllSelected = useMemo(() => {
        if (!selectableEntries.length) return false
        return selectableEntries.every((e) => selectedIds.has(e.id))
    }, [selectableEntries, selectedIds])

    const isAllPaid = useMemo(() => {
        const eligible = filteredEntries.filter((e) => e.status !== 'approved' && e.status !== 'submitted')
        if (!eligible.length) return false
        return eligible.every((e) => genericCheckedMap[e.id])
    }, [filteredEntries, genericCheckedMap])

    // Toggle single selection (approved athletes cannot be selected)
    const handleToggleSelect = (id: string) => {
        const entry = entries.find((e) => e.id === id)
        if (entry?.status === 'approved') return

        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Toggle select all (only for selectable non-approved entries)
    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set())
        } else {
            const next = new Set(selectableEntries.map((e) => e.id))
            setSelectedIds(next)
        }
    }

    // Clear selection
    const handleClearSelection = () => {
        setSelectedIds(new Set())
    }

    // Toggle Payment status for single entry
    const handleTogglePaid = async (entry: any) => {
        if (isReadOnly || entry.status === 'approved' || entry.status === 'submitted') return

        const current = !!genericCheckedMap[entry.id]
        const next = !current
        setGenericCheckedMap((prev) => ({ ...prev, [entry.id]: next }))

        try {
            await updateEntryGenericChecked(entry.id, next, eventId)
        } catch {
            setGenericCheckedMap((prev) => ({ ...prev, [entry.id]: current }))
            toast.error('Failed to update payment status')
        }
    }

    // Mark all eligible as paid & verified
    const handleMarkAllPaid = async () => {
        if (isReadOnly) return
        const eligible = filteredEntries.filter((e) => e.status !== 'approved' && e.status !== 'submitted')
        const ids = eligible.map((e) => e.id)
        if (!ids.length) return

        const next = !isAllPaid
        const newMap = { ...genericCheckedMap }
        ids.forEach((id) => {
            newMap[id] = next
        })
        setGenericCheckedMap(newMap)

        try {
            await bulkUpdateEntryGenericChecked(ids, next, eventId)
            toast.success(next ? 'Marked all entries as paid & verified.' : 'Unmarked entries.')
        } catch {
            toast.error('Failed to update payment status')
        }
    }

    // Forward all paid & verified entries
    const handleForwardAllPaid = async () => {
        if (isReadOnly) return
        const unforwardedPaidEntries = entries.filter(
            (e) => genericCheckedMap[e.id] && (e.status === 'draft' || e.status === 'pending_coach')
        )
        const ids = unforwardedPaidEntries.map((e) => e.id)
        if (!ids.length) {
            toast.info('No unforwarded paid entries found.')
            return
        }

        try {
            setIsSubmitting(true)
            const res = await coachBulkForwardEntries(ids)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Successfully forwarded ${ids.length} entries to organiser!`)
                setEntries((prev) =>
                    prev.map((e) => (ids.includes(e.id) ? { ...e, status: 'submitted' } : e))
                )
                setSelectedIds(new Set())
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to forward entries')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Forward selected entries
    const handleForwardSelected = async () => {
        if (isReadOnly) return
        const selectedToForward = entries.filter(
            (e) => selectedIds.has(e.id) && (e.status === 'draft' || e.status === 'pending_coach')
        )
        const ids = selectedToForward.map((e) => e.id)
        if (!ids.length) {
            toast.info('None of the selected entries are eligible for forwarding.')
            return
        }

        try {
            setIsSubmitting(true)
            const res = await coachBulkForwardEntries(ids)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Successfully forwarded ${ids.length} entries to organiser!`)
                setEntries((prev) =>
                    prev.map((e) => (ids.includes(e.id) ? { ...e, status: 'submitted' } : e))
                )
                setSelectedIds(new Set())
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to forward selected entries')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Confirm & Execute Reject Entry
    const handleConfirmReject = () => {
        if (!entryToReject) return

        startRejectTransition(async () => {
            try {
                await deleteEntry(entryToReject.id)
                toast.success(`Entry for ${entryToReject.students?.name || 'student'} has been rejected.`)
                setEntries((prev) => prev.filter((e) => e.id !== entryToReject.id))
                setSelectedIds((prev) => {
                    const next = new Set(prev)
                    next.delete(entryToReject.id)
                    return next
                })
                setRejectDialogOpen(false)
                setEntryToReject(null)
            } catch (err: any) {
                toast.error(err.message || 'Failed to reject entry')
            }
        })
    }

    return {
        initialEntries,
        dojos,
        statusPreset,
        onStatusChange,
        isReadOnly,
        isRegistrationClosed,
        propEventId,
        approvedCount,
        onAddStudent,
        effectiveFilter,
        eventId,
        dojoNameById,
        getDojo,
        filteredEntries,
        countPaid,
        countNotPaid,
        tabCounts,
        headingInfo,
        headingColor,
        selectedEntries,
        selectedCount,
        selectableEntries,
        isAllSelected,
        isAllPaid,
        handleToggleSelect,
        handleToggleSelectAll,
        handleClearSelection,
        handleTogglePaid,
        handleMarkAllPaid,
        handleForwardAllPaid,
        handleForwardSelected,
        handleConfirmReject,
        entries,
        setEntries,
        selectedIds,
        setSelectedIds,
        genericCheckedMap,
        setGenericCheckedMap,
        isSubmitting,
        setIsSubmitting,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        rejectDialogOpen,
        setRejectDialogOpen,
        entryToReject,
        setEntryToReject,
        isRejecting,
        startRejectTransition,
    }
}

export type CoachEntriesListVM = ReturnType<typeof useCoachEntriesList>
