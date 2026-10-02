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
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
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
    return age > 0 ? `${age} yrs` : '—'
}

function getAppliedTags(entry: any): string[] {
    const tags: string[] = []
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

export function CoachEntriesList({
    entries: initialEntries,
    dojos = [],
    statusPreset = 'all',
    onStatusChange,
    isReadOnly = false,
}: CoachEntriesListProps) {
    const [entries, setEntries] = useState<any[]>(initialEntries)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [genericCheckedMap, setGenericCheckedMap] = useState<Record<string, boolean>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState(statusPreset || 'all')
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
            setStatusFilter(statusPreset)
        }
    }, [statusPreset])

    const eventId = entries[0]?.event_id

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
            if (statusFilter === 'not_forwarded') {
                if (e.status !== 'draft' && e.status !== 'pending_coach') return false
            } else if (statusFilter === 'forwarded') {
                if (e.status !== 'submitted') return false
            } else if (statusFilter === 'approved') {
                if (e.status !== 'approved') return false
            } else if (statusFilter === 'rejected') {
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
    }, [entries, statusFilter, searchQuery, dojoNameById])

    // Counts for bottom floating bar
    const countPaid = useMemo(() => {
        return entries.filter(
            (e) => genericCheckedMap[e.id] && (e.status === 'draft' || e.status === 'pending_coach')
        ).length
    }, [entries, genericCheckedMap])

    const countNotPaid = useMemo(() => {
        return entries.filter(
            (e) => !genericCheckedMap[e.id] && (e.status === 'draft' || e.status === 'pending_coach')
        ).length
    }, [entries, genericCheckedMap])

    const selectedEntries = useMemo(() => {
        return entries.filter((e) => selectedIds.has(e.id))
    }, [entries, selectedIds])

    const selectedCount = selectedIds.size

    const isAllSelected = useMemo(() => {
        if (!filteredEntries.length) return false
        return filteredEntries.every((e) => selectedIds.has(e.id))
    }, [filteredEntries, selectedIds])

    const isAllPaid = useMemo(() => {
        const eligible = filteredEntries.filter((e) => e.status !== 'approved' && e.status !== 'submitted')
        if (!eligible.length) return false
        return eligible.every((e) => genericCheckedMap[e.id])
    }, [filteredEntries, genericCheckedMap])

    // Toggle single selection
    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Toggle select all
    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set())
        } else {
            const next = new Set(filteredEntries.map((e) => e.id))
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
        <div className="w-full text-[#e8eef5] select-text font-['Google_Sans','Product_Sans',system-ui,sans-serif]">
            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a99ab]" />
                    <input
                        type="text"
                        placeholder="Search student, dojo, belt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#111a2b] border border-[#1f2b40] text-sm text-[#e8eef5] placeholder-[#8a99ab] focus:outline-none focus:border-[#2dd4b4] transition"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'not_forwarded', label: 'Not forwarded' },
                        { key: 'forwarded', label: 'Forwarded' },
                        { key: 'approved', label: 'Approved' },
                        { key: 'rejected', label: 'Rejected' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setStatusFilter(tab.key)
                                if (onStatusChange) onStatusChange(tab.key)
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                                statusFilter === tab.key
                                    ? 'bg-[#2dd4b4] text-[#04231e]'
                                    : 'bg-[#111a2b] text-[#8a99ab] hover:text-[#e8eef5] border border-[#1f2b40]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Subtitle from Design Specification */}
            <div className="text-[#8a99ab] text-[14.5px] mb-3.5">
                Mark each student as paid &amp; verified. Then forward them to the organiser.
            </div>

            {/* ========================================================================= */}
            {/* 1. DESKTOP / LAPTOP TABLE (CoachLaptop.dc.html & CoachLaptopSel.dc.html)   */}
            {/* ========================================================================= */}
            <div className="hidden lg:block relative pb-28">
                <div className="bg-[#111a2b] border border-[#1f2b40] rounded-2xl overflow-hidden shadow-xl">
                    {/* Table Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '28px 56px 190px 58px 72px 58px 60px 1fr 168px 170px',
                            columnGap: '10px',
                            alignItems: 'center',
                            padding: '0 20px',
                            height: '48px',
                            background: '#0f1828',
                            borderBottom: '1px solid #1f2b40',
                        }}
                    >
                        {/* Select All Checkbox */}
                        <span
                            onClick={handleToggleSelectAll}
                            className={`w-5 h-5 rounded-[6px] border-2 border-[#34455f] flex items-center justify-center cursor-pointer transition ${
                                isAllSelected ? 'bg-[#2dd4b4] border-[#2dd4b4]' : ''
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>

                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Chest
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Athlete
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Age
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Dojo
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Belt
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Weight
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Events applied
                        </span>

                        {/* Payment Header with Mark all Pill */}
                        <span className="flex items-center justify-between">
                            <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                                Payment
                            </span>
                            <button
                                onClick={handleMarkAllPaid}
                                className="h-7 px-2.5 border-[1.5px] border-[#2dd4b4] text-[#2dd4b4] rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#2dd4b4]/10 transition"
                            >
                                <PillCheckmarkSvg />
                                Mark all
                            </button>
                        </span>

                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f] text-right">
                            Action
                        </span>
                    </div>

                    {/* Table Body Rows */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-16 text-center text-[#8a99ab] text-sm">
                            No tournament entries found matching your criteria.
                        </div>
                    ) : (
                        filteredEntries.map((entry) => {
                            const isSelected = selectedIds.has(entry.id)
                            const isPaid = Boolean(genericCheckedMap[entry.id])
                            const isLocked = entry.status === 'approved' || entry.status === 'submitted'
                            const tags = getAppliedTags(entry)
                            const age = getAthleteAge(entry.students?.date_of_birth)
                            const dojo = getDojo(entry)
                            const rank = entry.students?.rank || 'White'
                            const weight = entry.declared_weight_kg || entry.students?.weight || '—'

                            return (
                                <div
                                    key={entry.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '28px 56px 190px 58px 72px 58px 60px 1fr 168px 170px',
                                        columnGap: '10px',
                                        alignItems: 'center',
                                        padding: '0 20px',
                                        height: '82px',
                                        borderBottom: '1px solid #1f2b40',
                                        background: isSelected ? 'rgba(45, 212, 180, 0.07)' : 'transparent',
                                    }}
                                    className="transition-colors hover:bg-[#152238]/60"
                                >
                                    {/* Row Checkbox */}
                                    <span
                                        onClick={() => handleToggleSelect(entry.id)}
                                        className={`w-5 h-5 rounded-[6px] border-2 border-[#34455f] flex items-center justify-center cursor-pointer transition ${
                                            isSelected ? 'bg-[#2dd4b4] border-[#2dd4b4]' : ''
                                        }`}
                                    >
                                        {isSelected && <CheckmarkSvg />}
                                    </span>

                                    {/* Chest Number */}
                                    {entry.chest_no ? (
                                        <span className="text-[17px] font-bold text-[#2dd4b4]">
                                            #{String(entry.chest_no).padStart(3, '0')}
                                        </span>
                                    ) : (
                                        <span className="text-[17px] text-[#8a99ab]">—</span>
                                    )}

                                    {/* Athlete Info */}
                                    <div className="flex items-center gap-3 min-w-0">
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
                                        <div className="min-w-0">
                                            <div className="text-[16px] font-bold text-[#e8eef5] truncate">
                                                {entry.students?.name || 'Athlete'}
                                            </div>
                                            <div className="text-[13px] text-[#8a99ab] mt-0.5 truncate max-w-[130px]">
                                                {entry.parent_email || entry.students?.phone || 'athlete@email.com'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Age */}
                                    <span className="text-[16px] font-bold text-[#e8eef5]">{age}</span>

                                    {/* Dojo */}
                                    <span className="text-[15px] text-[#e8eef5] truncate">{dojo}</span>

                                    {/* Belt */}
                                    <span className="text-[15px] font-semibold text-[#e8eef5] truncate">{rank}</span>

                                    {/* Weight */}
                                    <span className="text-[15px] font-semibold text-[#e8eef5]">
                                        {weight !== '—' ? `${weight} kg` : '—'}
                                    </span>

                                    {/* Events Applied Tags */}
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[12.5px] font-semibold bg-[#1a2a44] rounded-full px-2.5 py-1 whitespace-nowrap text-[#e8eef5]"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Payment Toggle Box */}
                                    <div
                                        onClick={() => handleTogglePaid(entry)}
                                        style={{
                                            height: '40px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '0 14px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            background: isPaid ? 'rgba(45, 212, 180, 0.14)' : 'transparent',
                                            border: isPaid ? '1.5px solid #2dd4b4' : '1.5px solid #34455f',
                                            color: isPaid ? '#2dd4b4' : '#c9d3df',
                                            opacity: isLocked ? 0.55 : 1,
                                            cursor: isLocked ? 'default' : 'pointer',
                                            width: '100%',
                                        }}
                                        className="transition-all select-none"
                                    >
                                        <span
                                            className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition shrink-0 ${
                                                isPaid
                                                    ? 'bg-[#2dd4b4] border-[#2dd4b4]'
                                                    : 'border-[#34455f]'
                                            }`}
                                        >
                                            {isPaid && <CheckmarkSvg />}
                                        </span>
                                        Paid &amp; verified
                                    </div>

                                    {/* Action: Status + Three-dot Menu */}
                                    <div className="flex gap-2.5 justify-end items-center">
                                        {/* Status Text with SVG */}
                                        {entry.status === 'approved' ? (
                                            <span className="text-[13.5px] font-semibold text-[#2dd4b4] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path
                                                        d="M2 7.5l3 3 7-7.5"
                                                        fill="none"
                                                        stroke="#2dd4b4"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                Approved
                                            </span>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="text-[13.5px] font-semibold text-[#6b7b8f] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path
                                                        d="M2 7.5l3 3 7-7.5"
                                                        fill="none"
                                                        stroke="#6b7b8f"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                Forwarded
                                            </span>
                                        ) : entry.status === 'rejected' || entry.status === 'coach_declined' ? (
                                            <span className="text-[13.5px] font-semibold text-[#f87171] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#f87171" strokeWidth="1.6">
                                                    <circle cx="7" cy="7" r="5" />
                                                </svg>
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="text-[13.5px] font-semibold text-[#8a99ab] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#8a99ab" strokeWidth="1.6">
                                                    <circle cx="7" cy="7" r="5" />
                                                </svg>
                                                Not forwarded
                                            </span>
                                        )}

                                        {/* Three-dot Button (CoachMenu.dc.html) */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-10 h-10 rounded-[10px] border border-[#2a3b57] text-[#8a99ab] inline-flex items-center justify-center text-[18px] tracking-[1px] hover:text-[#e8eef5] hover:border-[#3d5173] hover:bg-[#16233a] cursor-pointer transition shrink-0"
                                                    aria-label="Row menu"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-[276px] bg-[#16233a] border border-[#34455f] rounded-[14px] p-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 text-[#e8eef5]"
                                            >
                                                {/* Download ID Card (Before vs After Organiser Approval) */}
                                                {entry.status === 'approved' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(`/parent/entries/${entry.id}/id-card`, '_blank')
                                                        }
                                                        className="flex items-center gap-3 p-[12px_14px] text-[#e8eef5] hover:bg-[#1f304d] rounded-lg cursor-pointer transition focus:bg-[#1f304d]"
                                                    >
                                                        <span className="text-[#2dd4b4] flex">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="text-[15.5px] font-semibold">
                                                                Download ID card
                                                            </div>
                                                            <div className="text-[#8a99ab] text-[12.5px] mt-0.5">
                                                                PDF · Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-3 p-[12px_14px] cursor-not-allowed select-none">
                                                        <span className="flex text-[#8a99ab] opacity-50 blur-[1.5px]">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="text-[15.5px] font-semibold text-[#8a99ab] opacity-55 blur-[2.6px]">
                                                                Download ID card
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[12.5px] text-[#8a99ab] mt-1">
                                                                <MenuLockSvg />
                                                                Not generated yet
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="h-[1px] bg-[#2a3b57] mx-2 my-1" />

                                                {/* Reject Entry */}
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEntryToReject(entry)
                                                        setRejectDialogOpen(true)
                                                    }}
                                                    className="flex items-center gap-3 p-[13px_14px] text-[#f87171] hover:bg-red-500/10 rounded-lg cursor-pointer font-semibold text-[15.5px] transition focus:bg-red-500/10 focus:text-[#f87171]"
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

                {/* Desktop Sticky Floating Bottom Bar */}
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: '#0d1626',
                        borderTop: '1px solid #1f2b40',
                        boxShadow: '0 -16px 30px rgba(10, 18, 32, 0.95)',
                        padding: '14px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '0 0 16px 16px',
                    }}
                >
                    {selectedCount > 0 ? (
                        /* Selected Mode (CoachLaptopSel.dc.html) */
                        <>
                            <div className="text-[15px] text-[#e8eef5]">
                                <b>{selectedCount} selected</b> &nbsp;
                                <button
                                    onClick={handleClearSelection}
                                    className="text-[#2dd4b4] font-semibold cursor-pointer hover:underline bg-transparent border-none p-0"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={handleForwardAllPaid}
                                    disabled={isSubmitting || countPaid === 0}
                                    className="h-[46px] px-5 text-[15.5px] font-bold border-[1.5px] border-[#2dd4b4] text-[#2dd4b4] rounded-xl hover:bg-[#2dd4b4]/10 transition disabled:opacity-40 cursor-pointer"
                                >
                                    Forward all paid &amp; verified ({countPaid})
                                </button>
                                <button
                                    onClick={handleForwardSelected}
                                    disabled={isSubmitting || selectedCount === 0}
                                    className="h-[46px] px-5 text-[15.5px] font-bold bg-[#2dd4b4] text-[#04231e] rounded-xl inline-flex items-center gap-2 hover:bg-[#25c4a5] transition disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-[#04231e]" />
                                    ) : (
                                        <ButtonCheckmarkSvg />
                                    )}
                                    Forward selected ({selectedCount})
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Normal Mode (CoachLaptop.dc.html) */
                        <>
                            <div className="text-[#8a99ab] text-[14.5px]">
                                <b className="text-[#e8eef5]">{countPaid}</b> paid &amp; verified, ready to forward &nbsp;·&nbsp; {countNotPaid} not paid yet
                            </div>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[46px] px-5 text-[15.5px] font-bold bg-[#2dd4b4] text-[#04231e] rounded-xl inline-flex items-center gap-2 hover:bg-[#25c4a5] transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-[#04231e]" />
                                ) : (
                                    <ButtonCheckmarkSvg />
                                )}
                                Forward all paid &amp; verified ({countPaid})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. MOBILE VIEW (CoachMobile.dc.html & CoachMobileSel.dc.html)             */}
            {/* ========================================================================= */}
            <div className="block lg:hidden relative pb-44">
                {/* Mobile Top Controls Bar */}
                <div className="flex justify-between items-center mb-3">
                    <div
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-2.5 text-[15px] font-semibold text-[#e8eef5] cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 border-[#34455f] flex items-center justify-center transition ${
                                isAllSelected ? 'bg-[#2dd4b4] border-[#2dd4b4]' : ''
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>
                        Select all
                    </div>

                    <button
                        onClick={handleMarkAllPaid}
                        className="h-9 px-3 border-[1.5px] border-[#2dd4b4] text-[#2dd4b4] rounded-full text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#2dd4b4]/10 transition"
                    >
                        <PillCheckmarkSvg />
                        Mark all paid &amp; verified
                    </button>
                </div>

                {/* Mobile Cards List */}
                <div className="flex flex-col gap-3.5">
                    {filteredEntries.length === 0 ? (
                        <div className="py-12 text-center text-[#8a99ab] text-sm bg-[#111a2b] rounded-2xl border border-[#1f2b40]">
                            No tournament entries found.
                        </div>
                    ) : (
                        filteredEntries.map((entry) => {
                            const isSelected = selectedIds.has(entry.id)
                            const isPaid = Boolean(genericCheckedMap[entry.id])
                            const isLocked = entry.status === 'approved' || entry.status === 'submitted'
                            const tags = getAppliedTags(entry)
                            const age = getAthleteAge(entry.students?.date_of_birth)
                            const dojo = getDojo(entry)
                            const rank = entry.students?.rank || 'White'
                            const weight = entry.declared_weight_kg || entry.students?.weight || '—'

                            return (
                                <div
                                    key={entry.id}
                                    style={{
                                        border: isSelected ? '1.5px solid #2dd4b4' : '1.5px solid #1f2b40',
                                        background: isSelected ? 'rgba(45, 212, 180, 0.06)' : '#111a2b',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        boxSizing: 'border-box',
                                    }}
                                    className="shadow-md transition-all"
                                >
                                    {/* Card Header: Checkbox + Avatar + Name/Email + Chest */}
                                    <div className="flex gap-3 items-center">
                                        <span
                                            onClick={() => handleToggleSelect(entry.id)}
                                            className={`w-5 h-5 rounded-[6px] border-2 border-[#34455f] flex items-center justify-center cursor-pointer transition shrink-0 ${
                                                isSelected ? 'bg-[#2dd4b4] border-[#2dd4b4]' : ''
                                            }`}
                                        >
                                            {isSelected && <CheckmarkSvg />}
                                        </span>

                                        <AthletePfp
                                            photoUrl={entry.students?.photo_url}
                                            name={entry.students?.name || 'Athlete'}
                                            subtitle={entry.dojos?.name || entry.parent_email || 'Athlete'}
                                            size={54}
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
                                            <div className="text-[17px] font-bold text-[#e8eef5] truncate">
                                                {entry.students?.name || 'Athlete'}
                                            </div>
                                            <div className="text-[13px] text-[#8a99ab] mt-0.5 truncate">
                                                {entry.parent_email || entry.students?.phone || 'athlete@email.com'}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                                                Chest
                                            </div>
                                            <div
                                                className={`text-[19px] font-bold ${
                                                    entry.chest_no ? 'text-[#2dd4b4]' : 'text-[#6b7b8f]'
                                                }`}
                                            >
                                                {entry.chest_no ? `#${String(entry.chest_no).padStart(3, '0')}` : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4-Item Spec Grid (Age / Belt / Weight / Dojo) */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                            gap: '8px',
                                            marginTop: '14px',
                                            padding: '12px 0',
                                            borderTop: '1px solid #1f2b40',
                                            borderBottom: '1px solid #1f2b40',
                                        }}
                                    >
                                        <div>
                                            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                                                Age
                                            </div>
                                            <div className="text-[15px] font-semibold text-[#e8eef5] mt-1 truncate">
                                                {age}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                                                Belt
                                            </div>
                                            <div className="text-[15px] font-semibold text-[#e8eef5] mt-1 truncate">
                                                {rank}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                                                Weight
                                            </div>
                                            <div className="text-[15px] font-semibold text-[#e8eef5] mt-1 truncate">
                                                {weight !== '—' ? `${weight} kg` : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                                                Dojo
                                            </div>
                                            <div className="text-[15px] font-semibold text-[#e8eef5] mt-1 truncate">
                                                {dojo}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Events Applied Tags */}
                                    <div className="flex gap-1.5 flex-wrap mt-3.5">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[12.5px] font-semibold bg-[#1a2a44] rounded-full px-2.5 py-1 text-[#e8eef5] whitespace-nowrap"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Card Footer: Paid Toggle + Status + Three-dot Menu */}
                                    <div className="flex gap-2.5 mt-3.5 items-center">
                                        {/* Paid Toggle Button */}
                                        <div
                                            onClick={() => handleTogglePaid(entry)}
                                            style={{
                                                height: '48px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '0 14px',
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                background: isPaid ? 'rgba(45, 212, 180, 0.14)' : 'transparent',
                                                border: isPaid ? '1.5px solid #2dd4b4' : '1.5px solid #34455f',
                                                color: isPaid ? '#2dd4b4' : '#c9d3df',
                                                opacity: isLocked ? 0.55 : 1,
                                                flex: 1,
                                                cursor: isLocked ? 'default' : 'pointer',
                                            }}
                                            className="transition-all select-none"
                                        >
                                            <span
                                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition shrink-0 ${
                                                    isPaid
                                                        ? 'bg-[#2dd4b4] border-[#2dd4b4]'
                                                        : 'border-[#34455f]'
                                                }`}
                                            >
                                                {isPaid && <CheckmarkSvg />}
                                            </span>
                                            Paid &amp; verified
                                        </div>

                                        {/* Status */}
                                        {entry.status === 'approved' ? (
                                            <span className="text-[13.5px] font-semibold text-[#2dd4b4] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path
                                                        d="M2 7.5l3 3 7-7.5"
                                                        fill="none"
                                                        stroke="#2dd4b4"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                Approved
                                            </span>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="text-[13.5px] font-semibold text-[#6b7b8f] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path
                                                        d="M2 7.5l3 3 7-7.5"
                                                        fill="none"
                                                        stroke="#6b7b8f"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                Forwarded
                                            </span>
                                        ) : entry.status === 'rejected' || entry.status === 'coach_declined' ? (
                                            <span className="text-[13.5px] font-semibold text-[#f87171] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#f87171" strokeWidth="1.6">
                                                    <circle cx="7" cy="7" r="5" />
                                                </svg>
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="text-[13.5px] font-semibold text-[#8a99ab] inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#8a99ab" strokeWidth="1.6">
                                                    <circle cx="7" cy="7" r="5" />
                                                </svg>
                                                Not forwarded
                                            </span>
                                        )}

                                        {/* Three-dot Button */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-12 h-12 rounded-[10px] border border-[#2a3b57] text-[#8a99ab] inline-flex items-center justify-center text-[18px] tracking-[1px] hover:text-[#e8eef5] hover:border-[#3d5173] hover:bg-[#16233a] cursor-pointer transition shrink-0"
                                                    aria-label="Row menu"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-[276px] bg-[#16233a] border border-[#34455f] rounded-[14px] p-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 text-[#e8eef5]"
                                            >
                                                {entry.status === 'approved' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(`/parent/entries/${entry.id}/id-card`, '_blank')
                                                        }
                                                        className="flex items-center gap-3 p-[12px_14px] text-[#e8eef5] hover:bg-[#1f304d] rounded-lg cursor-pointer transition focus:bg-[#1f304d]"
                                                    >
                                                        <span className="text-[#2dd4b4] flex">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="text-[15.5px] font-semibold">
                                                                Download ID card
                                                            </div>
                                                            <div className="text-[#8a99ab] text-[12.5px] mt-0.5">
                                                                PDF · Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-3 p-[12px_14px] cursor-not-allowed select-none">
                                                        <span className="flex text-[#8a99ab] opacity-50 blur-[1.5px]">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="text-[15.5px] font-semibold text-[#8a99ab] opacity-55 blur-[2.6px]">
                                                                Download ID card
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[12.5px] text-[#8a99ab] mt-1">
                                                                <MenuLockSvg />
                                                                Not generated yet
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="h-[1px] bg-[#2a3b57] mx-2 my-1" />

                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEntryToReject(entry)
                                                        setRejectDialogOpen(true)
                                                    }}
                                                    className="flex items-center gap-3 p-[13px_14px] text-[#f87171] hover:bg-red-500/10 rounded-lg cursor-pointer font-semibold text-[15.5px] transition focus:bg-red-500/10 focus:text-[#f87171]"
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

                {/* Mobile Fixed Floating Bottom Bar */}
                <div
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: '#0d1626',
                        borderTop: '1px solid #1f2b40',
                        boxShadow: '0 -16px 30px rgba(10, 18, 32, 0.95)',
                        padding: '12px 16px 16px',
                        zIndex: 40,
                    }}
                >
                    {selectedCount > 0 ? (
                        /* Mobile Selected Mode (CoachMobileSel.dc.html) */
                        <>
                            <div className="flex justify-between items-center text-[14px] mb-2.5 text-[#e8eef5]">
                                <b>{selectedCount} selected</b>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-[#2dd4b4] font-semibold cursor-pointer hover:underline bg-transparent border-none p-0"
                                >
                                    Clear
                                </button>
                            </div>
                            <button
                                onClick={handleForwardSelected}
                                disabled={isSubmitting || selectedCount === 0}
                                className="h-[50px] w-full text-[16px] font-bold bg-[#2dd4b4] text-[#04231e] rounded-xl inline-flex items-center justify-center gap-2 hover:bg-[#25c4a5] transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-[#04231e]" />
                                ) : (
                                    <ButtonCheckmarkSvg />
                                )}
                                Forward selected ({selectedCount})
                            </button>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[44px] w-full text-[14.5px] font-bold border-[1.5px] border-[#2dd4b4] text-[#2dd4b4] rounded-xl hover:bg-[#2dd4b4]/10 transition disabled:opacity-40 cursor-pointer mt-2"
                            >
                                Forward all paid &amp; verified ({countPaid})
                            </button>
                        </>
                    ) : (
                        /* Mobile Normal Mode (CoachMobile.dc.html) */
                        <>
                            <div className="text-[#8a99ab] text-[13.5px] mb-2.5">
                                <b className="text-[#e8eef5]">{countPaid}</b> paid &amp; verified · {countNotPaid} not paid yet
                            </div>
                            <button
                                onClick={handleForwardAllPaid}
                                disabled={isSubmitting || countPaid === 0}
                                className="h-[50px] w-full text-[16px] font-bold bg-[#2dd4b4] text-[#04231e] rounded-xl inline-flex items-center justify-center gap-2 hover:bg-[#25c4a5] transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-[#04231e]" />
                                ) : (
                                    <ButtonCheckmarkSvg />
                                )}
                                Forward all paid &amp; verified ({countPaid})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Reject Entry Confirmation Modal */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md bg-[#111a2b] border border-[#1f2b40] text-[#e8eef5] rounded-2xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
                            <MenuRejectSvg />
                            Reject Tournament Entry
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#8a99ab] mt-1.5 leading-relaxed">
                            Are you sure you want to reject the entry for{' '}
                            <strong className="text-[#e8eef5]">
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
                            className="h-10 px-4 rounded-xl border-[#1f2b40] bg-[#16233a] text-[#8a99ab] hover:text-[#e8eef5] hover:bg-[#1a2b47] text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmReject}
                            disabled={isRejecting}
                            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-md"
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
