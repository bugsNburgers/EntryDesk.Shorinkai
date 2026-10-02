'use client'

// ============================================================================
// EntryDesk — Coach Tournament Entries List (Laptop & Mobile Pixel-Perfect)
// Implements:
//  - Coach list · laptop-html (CoachLaptop.dc.html & CoachLaptopSel.dc.html)
//  - Coach list · mobile-html (CoachMobile.dc.html & CoachMobileSel.dc.html)
//  - Row menu (⋯) · component-html (CoachMenu.dc.html)
// Obsidian dark theme (#0a1220, #111a2b), teal accents (#2dd4b4), Google Sans.
// ============================================================================

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import {
    bulkUpdateEntryGenericChecked,
    updateEntryGenericChecked,
    deleteEntry,
} from '@/app/dashboard/entries/actions'
import { coachBulkForwardEntries } from '@/app/dashboard/parent-entries/actions'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Search, Loader2, Check, X, Circle, Printer, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'

interface CoachEntriesListProps {
    entries: any[]
    eventDays?: any[]
    dojos?: any[]
    eventType?: string | null
    statusPreset?: string
    onStatusChange?: (status: string) => void
    isReadOnly?: boolean
    isRegistrationClosed?: boolean
    eventId?: string
    approvedCount?: number
    onAddStudent?: () => void
}

// ----------------------------------------------------------------------------
// Helper SVGs matching reference designs exactly
// ----------------------------------------------------------------------------

function CheckmarkSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 14 14">
            <path
                d="M2 7.5l3 3 7-7.5"
                fill="none"
                stroke="#04231e"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
        </svg>
    )
}

function PillCheckmarkSvg() {
    return (
        <svg width="13" height="13" viewBox="0 0 14 14">
            <path
                d="M2 7.5l3 3 7-7.5"
                fill="none"
                stroke="#2dd4b4"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
        </svg>
    )
}

function ButtonCheckmarkSvg() {
    return (
        <svg width="13" height="13" viewBox="0 0 14 14">
            <path
                d="M2 7.5l3 3 7-7.5"
                fill="none"
                stroke="#04231e"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
        </svg>
    )
}

function AvatarPlaceholderSvg() {
    return (
        <svg width="23" height="23" viewBox="0 0 46 46" fill="none" stroke="#8a99ab" strokeWidth="1.6" style={{ display: 'block' }}>
            <circle cx="23" cy="16" r="8" />
            <path d="M6 42c0-10 7-16 17-16s17 6 17 16" />
        </svg>
    )
}

function AvatarVerifiedBadge() {
    return (
        <span
            style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#2dd4b4',
                border: '2px solid #111a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#04231e" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 1h3v3M4 9H1V6M9 1L6 4M1 9l3-3" />
            </svg>
        </span>
    )
}

function MenuDownloadSvg() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2v9M5.5 7.5L9 11l3.5-3.5M3 14.5h12" />
        </svg>
    )
}

function MenuLockSvg() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8a99ab" strokeWidth="1.6" strokeLinecap="round">
            <rect x="3" y="7" width="10" height="7" rx="2" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
        </svg>
    )
}

function MenuRejectSvg() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="7" />
            <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" />
        </svg>
    )
}

// ----------------------------------------------------------------------------
// Utility formatting functions
// ----------------------------------------------------------------------------

function getAthleteAge(dob: string | null | undefined): string {
    if (!dob) return '—'
    const birthDate = new Date(dob)
    if (isNaN(birthDate.getTime())) return '—'
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age > 0 ? String(age) : '—'
}

function formatBelt(rank: string | null | undefined): string {
    if (!rank) return 'White'
    const cleaned = rank.replace(/\bbelts?\b/gi, '').replace(/\s+/g, ' ').trim()
    return cleaned || 'White'
}

function getAppliedTags(entry: any): string[] {
    const tags: string[] = []
    if (entry.event_days?.name) {
        tags.push(entry.event_days.name)
    }
    const type = (entry.participation_type || '').toLowerCase()
    const catName = (entry.category_name || '').toLowerCase()

    if (type.includes('team') || catName.includes('team')) {
        tags.push('Team Kata')
    }
    if (type.includes('kata') || catName.includes('kata') || type === 'both') {
        if (!tags.includes('Kata') && !tags.includes('Team Kata')) tags.push('Kata')
    }
    if (type.includes('kumite') || catName.includes('kumite') || type === 'both') {
        if (!tags.includes('Kumite')) tags.push('Kumite')
    }
    if (tags.length === 0) {
        if (entry.category_name) {
            tags.push(entry.category_name)
        } else {
            tags.push('Kata')
        }
    }
    return tags
}

export function normalizeCoachStatus(s?: string) {
    if (!s) return 'not_forwarded'
    const lower = s.toLowerCase().trim()
    if (
        lower === 'not_forwarded' ||
        lower === 'pending_submission' ||
        lower === 'pending' ||
        lower === 'pending_coach' ||
        lower === 'draft' ||
        lower === 'correction_needed'
    ) {
        return 'not_forwarded'
    }
    if (lower === 'forwarded' || lower === 'submitted' || lower === 'under_review') {
        return 'forwarded'
    }
    if (lower === 'approved' || lower === 'cleared') {
        return 'approved'
    }
    if (lower === 'rejected' || lower === 'coach_declined' || lower === 'declined') {
        return 'rejected'
    }
    if (lower === 'all') {
        return 'all'
    }
    return 'not_forwarded'
}

export function CoachEntriesList({
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
        return 'text-[#1c1917] dark:text-[#f8fafc]'
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

    return (
        <div className="w-full text-[#1c1917] dark:text-[#e8eef5] select-text font-['Google_Sans','Product_Sans',system-ui,sans-serif] space-y-4 pb-44 md:pb-28">
            {/* ========================================================================= */}
            {/* 1. SEARCH BAR & ACTION BUTTONS (IN LINE)                                  */}
            {/* ========================================================================= */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Single white search box (stretches to fill available space until buttons) */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78716c] dark:text-[#8a99ab]" />
                    <input
                        type="text"
                        placeholder="Search student, dojo, belt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#111a2b] border border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#f8fafc] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7b8f] focus:outline-none focus:border-[#0d9488] dark:focus:border-[#2dd4b4] shadow-xs transition"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1c1917] dark:text-[#8a99ab] dark:hover:text-[#e8eef5] p-1 cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Print Team Cards & Add Student to the right side of print */}
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    {approvedCount && approvedCount > 0 && eventId && (
                        <Link href={`/dashboard/events/${eventId}/print`} target="_blank" className="flex-1 sm:flex-initial">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto h-11 px-4 gap-1.5 rounded-xl font-semibold border-[#0d9488]/40 dark:border-[#2dd4b4]/40 text-[#0d9488] dark:text-[#2dd4b4] hover:bg-[#0d9488]/5 bg-white dark:bg-[#111a2b] shadow-xs cursor-pointer"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print Team Cards ({approvedCount})</span>
                            </Button>
                        </Link>
                    )}

                    {onAddStudent && !isReadOnly && !isRegistrationClosed && (
                        <Button
                            onClick={onAddStudent}
                            size="sm"
                            className="flex-1 sm:flex-initial h-11 px-4 gap-2 font-semibold shadow-xs rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] dark:text-[#04231e] cursor-pointer"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>Add Student</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. UNIFIED ATHLETE ENTRIES CARD (HEADER + ATHLETES TABLE JOINED)          */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-[#ded8cb] bg-white shadow-xs overflow-hidden dark:border-[#1f2b40] dark:bg-[#111a2b]">
                {/* Upper Section: Pending Approvals text & Segmented Slider with curvy top arc */}
                <div className="p-4 sm:p-5 bg-white dark:bg-[#111a2b] border-b border-[#ded8cb] dark:border-[#1f2b40] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                        <h3 className={`text-xl font-bold tracking-tight ${headingColor}`}>
                            {headingInfo.title}
                        </h3>
                        <p className="text-xs text-[#78716c] dark:text-[#8a99ab] mt-0.5">
                            {headingInfo.subtitle}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Segmented Slider Switcher */}
                        <div className="p-1 rounded-xl bg-[#ede8dc]/80 dark:bg-[#070e1b] border border-[#ded8cb] dark:border-[#1f2b40] inline-flex items-center gap-1 overflow-x-auto max-w-full">
                            {[
                                { key: 'not_forwarded', label: 'Pending Approvals', count: tabCounts.not_forwarded, isPending: true },
                                { key: 'all', label: 'All', count: tabCounts.all },
                                { key: 'forwarded', label: 'Submitted', count: tabCounts.forwarded },
                                { key: 'approved', label: 'Approved', count: tabCounts.approved },
                                { key: 'rejected', label: 'Rejected', count: tabCounts.rejected },
                            ].map((tab) => {
                                const isActive = effectiveFilter === tab.key
                                const isPending = tab.isPending
                                const hasPendingItems = tab.count > 0

                                let buttonClasses = ''
                                let badgeClasses = ''

                                if (isPending) {
                                    if (hasPendingItems) {
                                        // RED if > 0
                                        buttonClasses = isActive
                                            ? 'bg-rose-500 text-white font-bold shadow-sm'
                                            : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                                        badgeClasses = isActive
                                            ? 'bg-white/25 text-white'
                                            : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                    } else {
                                        // GREEN if 0
                                        buttonClasses = isActive
                                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-bold shadow-sm'
                                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                        badgeClasses = isActive
                                            ? 'bg-white/25 text-white'
                                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                    }
                                } else {
                                    buttonClasses = isActive
                                        ? 'bg-white dark:bg-[#17243c] text-[#1c1917] dark:text-[#f8fafc] font-bold shadow-sm'
                                        : 'text-[#57534e] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] hover:bg-black/5 dark:hover:bg-white/5'
                                    badgeClasses = isActive
                                        ? 'bg-[#0d9488]/15 text-[#0d9488] dark:bg-[#2dd4b4]/20 dark:text-[#2dd4b4]'
                                        : 'bg-black/5 dark:bg-white/10 text-[#57534e] dark:text-[#8a99ab]'
                                }

                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            setStatusFilter(tab.key)
                                            if (onStatusChange) onStatusChange(tab.key)
                                        }}
                                        className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer select-none ${buttonClasses}`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-bold ${badgeClasses}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 1. DESKTOP / LAPTOP TABLE (with light dotted column dividers)            */}
                {/* ========================================================================= */}
                <div className="hidden lg:block overflow-x-auto">
                    {/* Table Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '36px 60px minmax(160px, 1.2fr) 42px 85px minmax(130px, 0.8fr) 65px 150px 176px 160px',
                            alignItems: 'center',
                            height: '48px',
                        }}
                        className="bg-[#f5f0e6] dark:bg-[#0f1828] border-b border-[#ded8cb] dark:border-[#1f2b40] text-[#78716c] dark:text-[#8a99ab] text-[11px] font-bold uppercase tracking-wider"
                    >
                        {/* Select All Checkbox */}
                        <div className="h-full flex items-center justify-center border-r border-dotted border-[#ded8cb] dark:border-[#223552] px-2">
                            <span
                                onClick={selectableEntries.length > 0 ? handleToggleSelectAll : undefined}
                                title={selectableEntries.length === 0 ? 'No selectable entries' : isAllSelected ? 'Deselect all' : 'Select all'}
                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                    selectableEntries.length === 0
                                        ? 'opacity-30 cursor-not-allowed border-[#ded8cb] dark:border-[#34455f] bg-transparent'
                                        : isAllSelected
                                        ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4] cursor-pointer'
                                        : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent hover:border-[#0d9488]/60 cursor-pointer'
                                }`}
                            >
                                {isAllSelected && selectableEntries.length > 0 && <CheckmarkSvg />}
                            </span>
                        </div>

                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Chest</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Athlete</div>
                        <div className="h-full flex items-center justify-center px-1 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Age</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Dojo</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Belt</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Weight</div>
                        <div className="h-full flex items-center px-2 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">Events applied</div>

                        {/* Payment Header with Mark all Pill */}
                        <div className="h-full flex items-center justify-between px-3 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">
                            <span>Payment</span>
                            <button
                                onClick={handleMarkAllPaid}
                                className="h-6 px-2.5 rounded-full border border-[#0d9488] dark:border-[#2dd4b4] text-[#0d9488] dark:text-[#2dd4b4] text-[10.5px] font-bold inline-flex items-center gap-1 hover:bg-[#0d9488]/10 dark:hover:bg-[#2dd4b4]/10 cursor-pointer transition whitespace-nowrap"
                            >
                                <PillCheckmarkSvg />
                                Mark all
                            </button>
                        </div>

                        <div className="h-full flex items-center justify-start px-4 text-left">Action</div>
                    </div>

                    {/* Table Body Rows (82px spacious height, light dotted column dividers) */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-16 text-center text-[#78716c] dark:text-[#8a99ab] space-y-3">
                            <p className="text-sm font-medium">
                                {effectiveFilter === 'not_forwarded'
                                    ? 'No pending approvals! All entries have been processed.'
                                    : effectiveFilter === 'forwarded'
                                    ? 'No submitted entries awaiting organiser review.'
                                    : effectiveFilter === 'approved'
                                    ? 'No approved entries yet.'
                                    : effectiveFilter === 'rejected'
                                    ? 'No rejected entries.'
                                    : 'No tournament entries found matching your criteria.'}
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
                                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shadow-2xs"
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
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#ede8dc] dark:bg-[#1f2b40] text-[#1c1917] dark:text-[#f8fafc] hover:bg-[#ded8cb] dark:hover:bg-[#2a3b57] cursor-pointer transition"
                                    >
                                        View All Entries ({tabCounts.all})
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
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '36px 60px minmax(160px, 1.2fr) 42px 85px minmax(130px, 0.8fr) 65px 150px 176px 160px',
                                        alignItems: 'center',
                                        height: '82px',
                                    }}
                                    className={`border-b border-[#ded8cb] dark:border-[#1f2b40] transition-colors ${
                                        isSelected
                                            ? 'bg-[#0d9488]/10 dark:bg-[rgba(45,212,180,0.07)]'
                                            : 'bg-white dark:bg-[#111a2b] hover:bg-[#faf8f3] dark:hover:bg-[#15233c]'
                                    }`}
                                >
                                    {/* Col 1: Checkbox (Disabled if approved) */}
                                    <div className="h-full flex items-center justify-center border-r border-dotted border-[#ded8cb] dark:border-[#223552] px-2">
                                        {entry.status === 'approved' ? (
                                            <span
                                                title="Approved athletes cannot be selected"
                                                className="w-5 h-5 rounded-[6px] border border-[#ded8cb]/80 dark:border-[#2a3b57] bg-[#ede8dc]/40 dark:bg-white/5 opacity-30 cursor-not-allowed flex items-center justify-center select-none"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => handleToggleSelect(entry.id)}
                                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center cursor-pointer transition ${
                                                    isSelected
                                                        ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                                        : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent hover:border-[#0d9488]/60'
                                                } ${isLocked ? 'opacity-35' : ''}`}
                                            >
                                                {isSelected && <CheckmarkSvg />}
                                            </span>
                                        )}
                                    </div>

                                    {/* Col 2: Chest Number */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">
                                        {entry.chest_no ? (
                                            <span className="text-[16px] font-bold text-[#0d9488] dark:text-[#2dd4b4] tracking-tight">
                                                #{String(entry.chest_no).padStart(3, '0')}
                                            </span>
                                        ) : (
                                            <span className="text-[17px] text-[#a8a29e] dark:text-[#8a99ab]">—</span>
                                        )}
                                    </div>

                                    {/* Col 3: Athlete Info (46px avatar with verified badge) */}
                                    <div className="h-full flex items-center gap-3 px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552] min-w-0">
                                        <AthletePfp
                                            photoUrl={entry.students?.photo_url}
                                            name={entry.students?.name || 'Athlete'}
                                            subtitle={entry.dojos?.name || entry.parent_email || 'Athlete'}
                                            size={46}
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
                                            <div className="text-[15.5px] font-bold text-[#1c1917] dark:text-[#e8eef5] truncate">
                                                {entry.students?.name || 'Athlete'}
                                            </div>
                                            <div className="text-[12.5px] text-[#78716c] dark:text-[#8a99ab] truncate mt-0.5">
                                                {entry.parent_email || entry.students?.phone || 'athlete@email.com'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Col 4: Age (No yrs, shrunk) */}
                                    <div className="h-full flex items-center justify-center px-1 border-r border-dotted border-[#ded8cb] dark:border-[#223552] text-[15px] font-bold text-[#1c1917] dark:text-[#e8eef5]">
                                        {age}
                                    </div>

                                    {/* Col 5: Dojo */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552] text-[14.5px] text-[#1c1917] dark:text-[#e8eef5] truncate" title={dojo}>
                                        {dojo}
                                    </div>

                                    {/* Col 6: Belt */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552] text-[14.5px] font-semibold text-[#1c1917] dark:text-[#e8eef5] truncate">
                                        {rank}
                                    </div>

                                    {/* Col 7: Weight */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-[#ded8cb] dark:border-[#223552] text-[14.5px] font-semibold text-[#1c1917] dark:text-[#e8eef5]">
                                        {weight !== '—' ? `${weight} kg` : '—'}
                                    </div>

                                    {/* Col 8: Events Applied Tags (2 rows up and down) */}
                                    <div className="h-full flex items-center px-2 border-r border-dotted border-[#ded8cb] dark:border-[#223552] overflow-hidden">
                                        <div className="grid grid-cols-2 gap-1 w-full max-w-[155px]">
                                            {tags.map((t, idx) => {
                                                const isDay = t.toLowerCase().startsWith('day')
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`text-[10px] sm:text-[10.5px] font-semibold rounded-md px-1 py-0.5 text-center truncate leading-tight whitespace-nowrap ${
                                                            isDay
                                                                ? 'bg-[#0d9488]/12 text-[#0d9488] dark:bg-[#2dd4b4]/18 dark:text-[#2dd4b4] border border-[#0d9488]/30 dark:border-[#2dd4b4]/35 font-bold'
                                                                : 'bg-[#f5f0e6] dark:bg-[#1a2a44] text-[#57534e] dark:text-[#c9d3df] border border-[#ded8cb] dark:border-transparent'
                                                        }`}
                                                        title={t}
                                                    >
                                                        {t}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Col 9: Payment Toggle Box (CoachLaptop.dc.html height 40px) */}
                                    <div className="h-full flex items-center px-3 border-r border-dotted border-[#ded8cb] dark:border-[#223552]">
                                        <div
                                            onClick={() => handleTogglePaid(entry)}
                                            className={`h-10 px-3.5 rounded-[10px] text-[13.5px] font-semibold inline-flex items-center gap-2.5 transition select-none cursor-pointer w-full ${
                                                isPaid
                                                    ? 'bg-[#0d9488]/12 dark:bg-[rgba(45,212,180,0.14)] border-[1.5px] border-[#0d9488] dark:border-[#2dd4b4] text-[#0d9488] dark:text-[#2dd4b4] font-bold'
                                                    : 'bg-white dark:bg-transparent border-[1.5px] border-[#ded8cb] dark:border-[#34455f] text-[#57534e] dark:text-[#c9d3df] hover:border-[#0d9488]/50'
                                            } ${isLocked ? 'opacity-55 cursor-default' : ''}`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition shrink-0 ${
                                                    isPaid
                                                        ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                                        : 'border-[#ded8cb] dark:border-[#34455f]'
                                                }`}
                                            >
                                                {isPaid && <CheckmarkSvg />}
                                            </span>
                                            <span className="truncate">Paid &amp; verified</span>
                                        </div>
                                    </div>

                                    {/* Col 10: Action: Status + 3-Dot Button */}
                                    <div className="h-full flex items-center justify-start gap-2.5 px-4">
                                        {/* Status Text with SVG */}
                                        {entry.status === 'approved' ? (
                                            <span className="text-[13.5px] font-semibold text-[#0d9488] dark:text-[#2dd4b4] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#2dd4b4" strokeWidth="2.2" strokeLinecap="round" />
                                                </svg>
                                                Approved
                                            </span>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="text-[13.5px] font-semibold text-[#78716c] dark:text-[#8a99ab] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#6b7b8f" strokeWidth="2.2" strokeLinecap="round" />
                                                </svg>
                                                Forwarded
                                            </span>
                                        ) : entry.status === 'rejected' || entry.status === 'coach_declined' ? (
                                            <span className="text-[13.5px] font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <X className="h-3.5 w-3.5" />
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="text-[13.5px] font-semibold text-[#78716c] dark:text-[#8a99ab] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#8a99ab" strokeWidth="1.6">
                                                    <circle cx="7" cy="7" r="5" />
                                                </svg>
                                                Not forwarded
                                            </span>
                                        )}

                                        {/* Three-dot Button (CoachMenu.dc.html: 40x40 rounded-[10px] border border-[#2a3b57]) */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-10 h-10 rounded-[10px] border border-[#ded8cb] dark:border-[#2a3b57] text-[#78716c] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] hover:border-[#0d9488] dark:hover:border-[#2dd4b4] inline-flex items-center justify-center text-lg font-bold tracking-widest transition cursor-pointer shrink-0"
                                                    aria-label="Row menu"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-60 bg-white dark:bg-[#16233a] border border-[#ded8cb] dark:border-[#34455f] text-[#1c1917] dark:text-[#e8eef5] rounded-xl shadow-xl p-1.5 z-50"
                                            >
                                                {/* Download ID Card */}
                                                {entry.status === 'approved' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(`/parent/entries/${entry.id}/id-card`, '_blank')
                                                        }
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] hover:bg-[#faf8f3] dark:hover:bg-[#1f2f4d] rounded-lg cursor-pointer transition"
                                                    >
                                                        <span className="text-[#0d9488] dark:text-[#2dd4b4] flex">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs">
                                                                Download ID card
                                                            </div>
                                                            <div className="text-[#78716c] dark:text-[#8a99ab] text-[10.5px]">
                                                                PDF · Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 cursor-not-allowed select-none opacity-50">
                                                        <span className="flex text-[#78716c] dark:text-[#8a99ab]">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs text-[#78716c] dark:text-[#8a99ab]">
                                                                Download ID card
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10.5px] text-[#78716c] dark:text-[#8a99ab]">
                                                                <MenuLockSvg />
                                                                Not generated yet
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="h-[1px] bg-[#ded8cb] dark:bg-[#2a3b57] my-1" />

                                                {/* Reject Entry */}
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
                                ? 'opacity-40 cursor-not-allowed text-[#78716c] dark:text-[#8a99ab]'
                                : 'text-[#78716c] dark:text-[#e8eef5] cursor-pointer'
                        }`}
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                selectableEntries.length === 0
                                    ? 'opacity-30 cursor-not-allowed border-[#ded8cb] dark:border-[#34455f] bg-transparent'
                                    : isAllSelected
                                    ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                    : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent'
                            }`}
                        >
                            {isAllSelected && selectableEntries.length > 0 && <CheckmarkSvg />}
                        </span>
                        <span>Select all ({selectableEntries.length})</span>
                    </div>

                    <button
                        onClick={handleMarkAllPaid}
                        className="h-8 px-3 border border-[#0d9488] dark:border-[#2dd4b4] text-[#0d9488] dark:text-[#2dd4b4] rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#0d9488]/10 transition"
                    >
                        <PillCheckmarkSvg />
                        Mark all paid &amp; verified
                    </button>
                </div>

                {/* Mobile Cards List */}
                <div className="flex flex-col gap-3">
                    {filteredEntries.length === 0 ? (
                        <div className="py-12 px-4 text-center text-[#78716c] dark:text-[#8a99ab] text-sm bg-white dark:bg-[#111a2b] rounded-2xl border border-[#ded8cb] dark:border-[#1f2b40] shadow-xs space-y-3">
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
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ede8dc] dark:bg-[#1f2b40] text-[#1c1917] dark:text-[#f8fafc] hover:bg-[#ded8cb] cursor-pointer transition"
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
                                            ? 'bg-[#0d9488]/5 dark:bg-[#15233c] border-[#0d9488]/60 dark:border-[#2dd4b4]/60 ring-1 ring-[#0d9488]/30 dark:ring-[#2dd4b4]/30'
                                            : 'bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] shadow-xs'
                                    }`}
                                >
                                    {/* Card Header: Checkbox + Avatar + Name/Email + Chest */}
                                    <div className="flex gap-3 items-center">
                                        {entry.status === 'approved' ? (
                                            <span
                                                title="Approved athletes cannot be selected"
                                                className="w-5 h-5 rounded-[6px] border border-[#ded8cb]/80 dark:border-[#2a3b57] bg-[#ede8dc]/40 dark:bg-white/5 opacity-30 cursor-not-allowed flex items-center justify-center select-none shrink-0"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => handleToggleSelect(entry.id)}
                                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center cursor-pointer transition shrink-0 ${
                                                    isSelected
                                                        ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                                        : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent'
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
                                            <div className="text-sm font-bold text-[#1c1917] dark:text-[#e8eef5] truncate">
                                                {entry.students?.name || 'Athlete'}
                                            </div>
                                            <div className="text-xs text-[#78716c] dark:text-[#8a99ab] mt-0.5 truncate">
                                                {entry.parent_email || entry.students?.phone || 'athlete@email.com'}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] tracking-wider uppercase font-bold text-[#78716c] dark:text-[#6b7b8f]">
                                                Chest
                                            </div>
                                            <div
                                                className={`text-sm font-bold ${
                                                    entry.chest_no ? 'text-[#0d9488] dark:text-[#2dd4b4]' : 'text-[#a8a29e] dark:text-[#6b7b8f]'
                                                }`}
                                            >
                                                {entry.chest_no ? `#${String(entry.chest_no).padStart(3, '0')}` : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4-Item Spec Grid (Age / Belt / Weight / Dojo) */}
                                    <div className="grid grid-cols-4 gap-2 mt-3 py-2.5 border-t border-b border-[#ded8cb]/80 dark:border-[#1f2b40] text-xs">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-[#78716c] dark:text-[#6b7b8f]">
                                                Age
                                            </div>
                                            <div className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5 truncate">
                                                {age}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-[#78716c] dark:text-[#6b7b8f]">
                                                Belt
                                            </div>
                                            <div className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5 truncate">
                                                {rank}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-[#78716c] dark:text-[#6b7b8f]">
                                                Weight
                                            </div>
                                            <div className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5 truncate">
                                                {weight !== '—' ? `${weight} kg` : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-[#78716c] dark:text-[#6b7b8f]">
                                                Dojo
                                            </div>
                                            <div className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5 truncate">
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
                                                            ? 'bg-[#0d9488]/12 text-[#0d9488] dark:bg-[#2dd4b4]/20 dark:text-[#2dd4b4] border border-[#0d9488]/30 dark:border-[#2dd4b4]/40 font-bold'
                                                            : 'bg-[#f5f0e6] dark:bg-[#1a2a44] text-[#57534e] dark:text-[#c9d3df] border border-[#ded8cb] dark:border-[#2a3b57]'
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
                                                    ? 'bg-[#0d9488]/10 dark:bg-[#2dd4b4]/15 border border-[#0d9488]/40 dark:border-[#2dd4b4] text-[#0d9488] dark:text-[#2dd4b4] font-bold'
                                                    : 'bg-white dark:bg-transparent border border-[#ded8cb] dark:border-[#34455f] text-[#57534e] dark:text-[#c9d3df]'
                                            } ${isLocked ? 'opacity-55 cursor-default' : ''}`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition shrink-0 ${
                                                    isPaid
                                                        ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                                        : 'border-[#ded8cb] dark:border-[#34455f]'
                                                }`}
                                            >
                                                {isPaid && <CheckmarkSvg />}
                                            </span>
                                            <span>Paid &amp; verified</span>
                                        </div>

                                        {/* Status */}
                                        {entry.status === 'approved' ? (
                                            <span className="text-xs font-bold text-[#0d9488] dark:text-[#2dd4b4] inline-flex items-center gap-1 whitespace-nowrap">
                                                <Check className="h-3 w-3" />
                                                Approved
                                            </span>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="text-xs font-semibold text-[#78716c] dark:text-[#8a99ab] inline-flex items-center gap-1 whitespace-nowrap">
                                                <Check className="h-3 w-3" />
                                                Forwarded
                                            </span>
                                        ) : entry.status === 'rejected' || entry.status === 'coach_declined' ? (
                                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 whitespace-nowrap">
                                                <X className="h-3 w-3" />
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-[#a8a29e] dark:text-[#6b7b8f] inline-flex items-center gap-1 whitespace-nowrap">
                                                <Circle className="h-2.5 w-2.5" />
                                                Not forwarded
                                            </span>
                                        )}

                                        {/* Three-dot Button */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-9 h-9 rounded-xl border border-[#ded8cb] dark:border-[#2a3b57] text-[#78716c] dark:text-[#8a99ab] inline-flex items-center justify-center text-xs hover:text-[#1c1917] dark:hover:text-[#e8eef5] transition shrink-0"
                                                    aria-label="Row menu"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-56 bg-white dark:bg-[#16233a] border border-[#ded8cb] dark:border-[#34455f] rounded-xl p-1.5 shadow-xl z-50 text-[#1c1917] dark:text-[#e8eef5]"
                                            >
                                                {entry.status === 'approved' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(`/parent/entries/${entry.id}/id-card`, '_blank')
                                                        }
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-[#faf8f3] dark:hover:bg-[#1f304d] rounded-lg cursor-pointer transition"
                                                    >
                                                        <span className="text-[#0d9488] dark:text-[#2dd4b4] flex">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs">
                                                                Download ID card
                                                            </div>
                                                            <div className="text-[#78716c] dark:text-[#8a99ab] text-[10.5px]">
                                                                PDF · Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 cursor-not-allowed select-none opacity-50">
                                                        <span className="flex text-[#78716c] dark:text-[#8a99ab]">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs text-[#78716c] dark:text-[#8a99ab]">
                                                                Download ID card
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10.5px] text-[#78716c] dark:text-[#8a99ab]">
                                                                <MenuLockSvg />
                                                                Not generated yet
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="h-[1px] bg-[#ded8cb] dark:bg-[#2a3b57] my-1" />

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

            {/* ========================================================================= */}
            {/* FIXED FOOTER (Desktop & Mobile) — Fixed above mobile nav on mobile        */}
            {/* ========================================================================= */}
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-[#faf8f3]/95 dark:bg-[#0d1626]/95 backdrop-blur-md border-t border-[#ded8cb] dark:border-[#1f2b40] shadow-[0_-12px_28px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_30px_rgba(10,18,32,0.95)]">
                {/* Desktop View */}
                <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-3.5 items-center justify-between">
                    {selectedCount > 0 ? (
                        <>
                            <div className="text-[15px] text-[#1c1917] dark:text-[#e8eef5]">
                                <b className="font-bold">{selectedCount} selected</b> &nbsp;·&nbsp;
                                <button
                                    onClick={handleClearSelection}
                                    className="text-[#0d9488] dark:text-[#2dd4b4] font-semibold cursor-pointer hover:underline ml-1"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleForwardAllPaid}
                                    disabled={isSubmitting || countPaid === 0}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] border-[1.5px] border-[#0d9488] dark:border-[#2dd4b4] text-[#0d9488] dark:text-[#2dd4b4] hover:bg-[#0d9488]/10 dark:hover:bg-[#2dd4b4]/10 transition disabled:opacity-40 cursor-pointer"
                                >
                                    Forward all paid &amp; verified ({countPaid})
                                </button>
                                <button
                                    onClick={handleForwardSelected}
                                    disabled={isSubmitting || selectedCount === 0}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] text-white dark:text-[#04231e] inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                    Forward selected ({selectedCount})
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[14.5px] text-[#78716c] dark:text-[#8a99ab]">
                                <b className="text-[#1c1917] dark:text-[#e8eef5] font-bold">{countPaid}</b> paid &amp; verified, ready to forward &nbsp;·&nbsp; {countNotPaid} not paid yet
                            </div>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] text-white dark:text-[#04231e] inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                Forward all paid &amp; verified ({countPaid})
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile View */}
                <div className="block lg:hidden px-4 py-3 space-y-2">
                    {selectedCount > 0 ? (
                        <>
                            <div className="flex justify-between items-center text-[14px] text-[#1c1917] dark:text-[#e8eef5]">
                                <b className="font-bold">{selectedCount} selected</b>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-[#0d9488] dark:text-[#2dd4b4] font-semibold cursor-pointer hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                            <button
                                onClick={handleForwardSelected}
                                disabled={isSubmitting || selectedCount === 0}
                                className="h-[48px] w-full text-[15px] font-bold bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] text-white dark:text-[#04231e] rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                Forward selected ({selectedCount})
                            </button>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[42px] w-full text-[14px] font-bold border-[1.5px] border-[#0d9488] dark:border-[#2dd4b4] text-[#0d9488] dark:text-[#2dd4b4] rounded-xl hover:bg-[#0d9488]/10 dark:hover:bg-[#2dd4b4]/10 transition disabled:opacity-40 cursor-pointer"
                            >
                                Forward all paid &amp; verified ({countPaid})
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-[13.5px] text-[#78716c] dark:text-[#8a99ab]">
                                <b className="text-[#1c1917] dark:text-[#e8eef5] font-bold">{countPaid}</b> paid &amp; verified · {countNotPaid} not paid yet
                            </div>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[48px] w-full text-[15.5px] font-bold bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] text-white dark:text-[#04231e] rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ButtonCheckmarkSvg />}
                                Forward all paid &amp; verified ({countPaid})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Reject Entry Confirmation Modal */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-[#111a2b] border border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] rounded-2xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                            <MenuRejectSvg />
                            Reject Tournament Entry
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#78716c] dark:text-[#8a99ab] mt-1.5 leading-relaxed">
                            Are you sure you want to reject the entry for{' '}
                            <strong className="text-[#1c1917] dark:text-[#e8eef5]">
                                {entryToReject?.students?.name || 'this athlete'}
                            </strong>
                            ? This athlete will be removed from your tournament entry list.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectDialogOpen(false)
                                setEntryToReject(null)
                            }}
                            className="h-9 px-4 rounded-xl border-[#ded8cb] dark:border-[#1f2b40] bg-[#faf8f3] dark:bg-[#16233a] text-[#78716c] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmReject}
                            disabled={isRejecting}
                            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-xs"
                        >
                            {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
