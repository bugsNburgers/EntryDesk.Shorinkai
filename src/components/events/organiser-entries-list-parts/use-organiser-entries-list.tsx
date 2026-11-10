'use client'

// State, derived data and handlers of OrganiserEntriesList (moved verbatim from the component body).

import { useMemo, useState, useTransition } from 'react'
import { updateEntryStatus, bulkUpdateEntryStatus, updateEntryChestNo } from '@/app/dashboard/events/[id]/entries/actions'
import { Dialog } from '@/components/ui/dialog'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { OrganiserEntryItem, OrganiserEntriesListProps, type OrganiserTab } from './shared'

export function useOrganiserEntriesList({
    entries,
    eventId,
    eventTitle,
    initialTab,
}: OrganiserEntriesListProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearch] = useState('')
    const [requestedPage, setPage] = useState(1)
    const setSearchQuery = (value: string) => {
        setSearch(value)
        setPage(1)
    }
    const [isActionPending, startTransition] = useTransition()

    // Counts for tabs
    const counts = useMemo(() => {
        return {
            all: entries.length,
            pending: entries.filter((e) => e.status === 'submitted').length,
            approved: entries.filter((e) => e.status === 'approved').length,
            rejected: entries.filter((e) => e.status === 'rejected' || e.status === 'coach_declined').length,
            fix: entries.filter((e) => e.status === 'correction_needed').length,
        }
    }, [entries])

    // Initial status preset: If there are pending approvals, default to pending, else all
    const [activeTab, setTab] = useState<OrganiserTab>(
        initialTab ?? (counts.pending > 0 ? 'pending' : 'all')
    )

    const setActiveTab = (tab: OrganiserTab) => {
        setTab(tab)
        setPage(1)
    }

    const headingInfo = useMemo(() => {
        switch (activeTab) {
            case 'all':
                return { title: `All entries (${counts.all})`, subtitle: 'Every entry coaches have sent for this event.' }
            case 'approved':
                return { title: `Accepted (${counts.approved})`, subtitle: 'These athletes can compete. Chest numbers and ID cards are ready.' }
            case 'rejected':
                return { title: `Not accepted (${counts.rejected})`, subtitle: 'Entries that were not accepted. The reason is shown on each one.' }
            case 'fix':
                return { title: `Needs a fix (${counts.fix})`, subtitle: 'Sent back. The coach or parent will fix it and send it again.' }
            default:
                return { title: `With organiser (${counts.pending})`, subtitle: 'Coaches sent these. Check each one and accept it.' }
        }
    }, [activeTab, counts])
    const headingColor = 'text-foreground'

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
            if (activeTab === 'rejected' && entry.status !== 'rejected' && entry.status !== 'coach_declined') return false
            if (activeTab === 'fix' && entry.status !== 'correction_needed') return false

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

    const pageSize = 50
    const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize))
    const page = Math.min(requestedPage, pageCount)
    const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize)

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
                toast.success(`${entry.student_name} accepted`)
            } catch (err: any) {
                toast.error(err.message || 'Could not accept this entry')
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
                    toast.success(`${ids.length} not accepted`)
                } else if (targetEntryForReject) {
                    await updateEntryStatus(
                        targetEntryForReject.id,
                        'rejected',
                        rejectReason.trim() || undefined
                    )
                    toast.success(`${targetEntryForReject.student_name} not accepted`)
                }
                setRejectDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || 'Could not save')
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
                toast.success(`${ids.length} accepted`)
            } catch (err: any) {
                toast.error(err.message || 'Could not accept the entries')
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
                toast.success(`${pendingIds.length} accepted`)
            } catch (err: any) {
                toast.error(err.message || 'Could not accept the entries')
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
            toast.error('Type a number above 0')
            return
        }

        startTransition(async () => {
            try {
                const res = await updateEntryChestNo(targetEntryForChest.id, parsed)
                if (res?.error) {
                    toast.error(res.error)
                    return
                }
                toast.success(`Chest number saved for ${targetEntryForChest.student_name}`)
                setChestDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || 'Could not save the chest number')
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
        visibleEntries,
        page,
        pageCount,
        setPage,
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
