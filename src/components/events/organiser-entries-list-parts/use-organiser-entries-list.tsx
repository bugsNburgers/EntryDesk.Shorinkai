'use client'

// State, derived data and handlers of OrganiserEntriesList (moved verbatim from the component body).

import { useMemo, useState, useTransition } from 'react'
import { updateEntryStatus, bulkUpdateEntryStatus, updateEntryChestNo } from '@/app/dashboard/events/[id]/entries/actions'
import { Dialog } from '@/components/ui/dialog'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { OrganiserEntryItem, OrganiserEntriesListProps } from './shared'

export function useOrganiserEntriesList({
    entries,
    eventId,
    eventTitle,
}: OrganiserEntriesListProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [isActionPending, startTransition] = useTransition()

    // Counts for tabs
    const counts = useMemo(() => {
        return {
            all: entries.length,
            pending: entries.filter((e) => e.status === 'submitted').length,
            approved: entries.filter((e) => e.status === 'approved').length,
            rejected: entries.filter((e) => e.status === 'rejected').length,
        }
    }, [entries])

    // Initial status preset: If there are pending approvals, default to pending, else all
    const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'approved' | 'rejected'>(
        counts.pending > 0 ? 'pending' : 'all'
    )

    // Dynamic Heading & Subtitle that updates as slider switches
    const headingInfo = useMemo(() => {
        switch (activeTab) {
            case 'pending':
                return {
                    title: `Pending Approvals (${counts.pending})`,
                    subtitle: 'Review and verify athlete entries submitted by coaches awaiting acceptance.',
                }
            case 'all':
                return {
                    title: `All Entries (${counts.all})`,
                    subtitle: 'All tournament entries across coaches and dojos.',
                }
            case 'approved':
                return {
                    title: `Accepted Entries (${counts.approved})`,
                    subtitle: 'Athletes approved, verified, and cleared for tournament participation.',
                }
            case 'rejected':
                return {
                    title: `Rejected Entries (${counts.rejected})`,
                    subtitle: 'Athletes whose entries were declined or rejected.',
                }
            default:
                return {
                    title: `Pending Approvals (${counts.pending})`,
                    subtitle: 'Review and verify athlete entries submitted by coaches awaiting acceptance.',
                }
        }
    }, [activeTab, counts])

    // Dynamic Heading Color: Pending Approvals is RED if > 0, GREEN if 0
    const headingColor = useMemo(() => {
        if (activeTab === 'pending') {
            return counts.pending > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
        }
        return 'text-foreground'
    }, [activeTab, counts.pending])

    // Dialog states
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [targetEntryForReject, setTargetEntryForReject] = useState<OrganiserEntryItem | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [isBulkReject, setIsBulkReject] = useState(false)

    // Chest number dialog
    const [chestDialogOpen, setChestDialogOpen] = useState(false)
    const [targetEntryForChest, setTargetEntryForChest] = useState<OrganiserEntryItem | null>(null)
    const [chestInputValue, setChestInputValue] = useState('')

    // Detail modal
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [selectedDetailEntry, setSelectedDetailEntry] = useState<OrganiserEntryItem | null>(null)

    // Filter logic
    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            // Tab filter
            if (activeTab === 'pending' && entry.status !== 'submitted') return false
            if (activeTab === 'approved' && entry.status !== 'approved') return false
            if (activeTab === 'rejected' && entry.status !== 'rejected') return false

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const name = (entry.student_name || '').toLowerCase()
                const coach = (entry.coach_name || entry.coach_email || '').toLowerCase()
                const dojo = (entry.dojo_name || '').toLowerCase()
                const regNo = (entry.student_registration_no || '').toLowerCase()
                const chest = entry.chest_no ? String(entry.chest_no) : ''
                const rank = (entry.student_rank || '').toLowerCase()
                const cat = (entry.category_name || '').toLowerCase()

                const matches =
                    name.includes(q) ||
                    coach.includes(q) ||
                    dojo.includes(q) ||
                    regNo.includes(q) ||
                    chest.includes(q) ||
                    rank.includes(q) ||
                    cat.includes(q)

                if (!matches) return false
            }

            return true
        })
    }, [entries, activeTab, searchQuery])

    // Multi-select handlers
    const isAllSelected =
        filteredEntries.length > 0 &&
        filteredEntries.every((e) => selectedIds.has(e.id))

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set())
        } else {
            const next = new Set<string>()
            filteredEntries.forEach((e) => next.add(e.id))
            setSelectedIds(next)
        }
    }

    const handleToggleSelectOne = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedIds(next)
    }

    // Single Approve action
    const handleApproveSingle = (entry: OrganiserEntryItem) => {
        startTransition(async () => {
            try {
                await updateEntryStatus(entry.id, 'approved')
                toast.success(`Entry for ${entry.student_name} accepted!`)
            } catch (err: any) {
                toast.error(err.message || 'Failed to approve entry')
            }
        })
    }

    // Open reject dialog for single
    const handleOpenRejectSingle = (entry: OrganiserEntryItem) => {
        setTargetEntryForReject(entry)
        setIsBulkReject(false)
        setRejectReason('')
        setRejectDialogOpen(true)
    }

    // Open reject dialog for bulk
    const handleOpenRejectBulk = () => {
        if (selectedIds.size === 0) return
        setTargetEntryForReject(null)
        setIsBulkReject(true)
        setRejectReason('')
        setRejectDialogOpen(true)
    }

    // Confirm Reject
    const handleConfirmReject = () => {
        startTransition(async () => {
            try {
                if (isBulkReject) {
                    const ids = Array.from(selectedIds)
                    await bulkUpdateEntryStatus(ids, 'rejected')
                    setSelectedIds(new Set())
                    toast.success(`${ids.length} entries marked as rejected.`)
                } else if (targetEntryForReject) {
                    await updateEntryStatus(
                        targetEntryForReject.id,
                        'rejected',
                        rejectReason.trim() || undefined
                    )
                    toast.success(`Entry for ${targetEntryForReject.student_name} rejected.`)
                }
                setRejectDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || 'Failed to reject entry')
            }
        })
    }

    // Bulk Approve
    const handleBulkApprove = () => {
        if (selectedIds.size === 0) return
        startTransition(async () => {
            try {
                const ids = Array.from(selectedIds)
                await bulkUpdateEntryStatus(ids, 'approved')
                setSelectedIds(new Set())
                toast.success(`${ids.length} entries accepted!`)
            } catch (err: any) {
                toast.error(err.message || 'Failed to approve entries')
            }
        })
    }

    // Bulk Approve All Pending
    const handleApproveAllPending = () => {
        const pendingIds = entries.filter((e) => e.status === 'submitted').map((e) => e.id)
        if (pendingIds.length === 0) return
        startTransition(async () => {
            try {
                await bulkUpdateEntryStatus(pendingIds, 'approved')
                setSelectedIds(new Set())
                toast.success(`${pendingIds.length} pending entries accepted!`)
            } catch (err: any) {
                toast.error(err.message || 'Failed to approve entries')
            }
        })
    }

    // Open chest # dialog
    const handleOpenChestDialog = (entry: OrganiserEntryItem) => {
        setTargetEntryForChest(entry)
        setChestInputValue(entry.chest_no ? String(entry.chest_no) : '')
        setChestDialogOpen(true)
    }

    // Save chest #
    const handleSaveChestNo = () => {
        if (!targetEntryForChest) return
        const parsed = chestInputValue.trim() ? parseInt(chestInputValue.trim(), 10) : null
        if (chestInputValue.trim() && (isNaN(parsed!) || parsed! <= 0)) {
            toast.error('Please enter a valid positive chest number')
            return
        }

        startTransition(async () => {
            try {
                const res = await updateEntryChestNo(targetEntryForChest.id, parsed)
                if (res?.error) {
                    toast.error(res.error)
                    return
                }
                toast.success(`Chest number updated for ${targetEntryForChest.student_name}`)
                setChestDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || 'Failed to update chest number')
            }
        })
    }

    return {
        entries,
        eventId,
        eventTitle,
        counts,
        headingInfo,
        headingColor,
        filteredEntries,
        isAllSelected,
        handleToggleSelectAll,
        handleToggleSelectOne,
        handleApproveSingle,
        handleOpenRejectSingle,
        handleOpenRejectBulk,
        handleConfirmReject,
        handleBulkApprove,
        handleApproveAllPending,
        handleOpenChestDialog,
        handleSaveChestNo,
        selectedIds,
        setSelectedIds,
        searchQuery,
        setSearchQuery,
        isActionPending,
        startTransition,
        activeTab,
        setActiveTab,
        rejectDialogOpen,
        setRejectDialogOpen,
        targetEntryForReject,
        setTargetEntryForReject,
        rejectReason,
        setRejectReason,
        isBulkReject,
        setIsBulkReject,
        chestDialogOpen,
        setChestDialogOpen,
        targetEntryForChest,
        setTargetEntryForChest,
        chestInputValue,
        setChestInputValue,
        detailDialogOpen,
        setDetailDialogOpen,
        selectedDetailEntry,
        setSelectedDetailEntry,
    }
}

export type OrganiserEntriesListVM = ReturnType<typeof useOrganiserEntriesList>
