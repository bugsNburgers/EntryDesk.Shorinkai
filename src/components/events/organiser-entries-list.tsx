'use client'

// ============================================================================
// EntryDesk — Organiser Tournament Entries List (Laptop & Mobile Pixel-Perfect)
// Implements the same Obsidian dark theme (#0a1220, #111a2b, #2dd4b4)
// and structure as the Coach's side list:
//  - Tabs: Pending Approvals, All, Accepted, Rejected (with counts)
//  - Real-time search across athlete, coach, dojo, chest #
//  - Desktop grid with Chest, Athlete, Age, Dojo, Coach, Belt, Weight, Events, Status, Actions
//  - Mobile card view with full responsive support
//  - Floating batch selection bar with Approve / Reject selected
//  - 3-Dot row menu (···) with View Pass, Details, Assign Chest #, Reject
// ============================================================================

import React, { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    updateEntryStatus,
    bulkUpdateEntryStatus,
    updateEntryChestNo,
} from '@/app/dashboard/events/[id]/entries/actions'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
import { Input } from '@/components/ui/input'
import {
    Search,
    Loader2,
    Check,
    X,
    ExternalLink,
    Printer,
    FileText,
    Hash,
    User,
    Mail,
    Phone,
    Shield,
    Clock,
    AlertCircle,
    Eye,
} from 'lucide-react'
import { toast } from 'sonner'

export interface OrganiserEntryItem {
    id: string
    entry_id?: string
    event_id: string
    status: string
    participation_type: string | null
    chest_no: number | null
    declared_weight_kg?: number | null
    coach_notes?: string | null
    rejection_reason?: string | null
    created_at?: string
    coach_id: string
    coach_name: string | null
    coach_email: string
    student_id: string
    student_name: string
    student_gender: string
    student_rank: string | null
    student_weight: number | null
    student_dob: string | null
    student_photo: string | null
    student_registration_no: string | null
    dojo_id?: string | null
    dojo_name: string | null
    category_name: string | null
    event_day_name?: string | null
}

interface OrganiserEntriesListProps {
    entries: OrganiserEntryItem[]
    eventId: string
    eventTitle?: string
}

// ----------------------------------------------------------------------------
// SVG Icons matching Coach view
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

function getAppliedTags(entry: OrganiserEntryItem): string[] {
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

export function OrganiserEntriesList({
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
                await updateEntryChestNo(targetEntryForChest.id, parsed)
                toast.success(`Chest number updated for ${targetEntryForChest.student_name}`)
                setChestDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || 'Failed to update chest number')
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Header + Filters Card */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#111a2b] border border-[#1f2b40] rounded-2xl p-4 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-[#e8eef5] tracking-tight">Tournament Entries</h3>
                    <p className="text-xs text-[#8a99ab]">
                        Review, verify, and accept athlete entries submitted by coaches.
                    </p>
                </div>

                {/* Status Tabs Matching Coach View */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shrink-0 ${
                            activeTab === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                                : 'bg-[#0f1828] text-[#8a99ab] border border-[#1f2b40] hover:text-[#e8eef5]'
                        }`}
                    >
                        <span>Pending Approvals</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                                activeTab === 'pending'
                                    ? 'bg-amber-500/30 text-amber-200'
                                    : 'bg-[#16233a] text-[#8a99ab]'
                            }`}
                        >
                            {counts.pending}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('all')}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shrink-0 ${
                            activeTab === 'all'
                                ? 'bg-[#2dd4b4]/15 text-[#2dd4b4] border border-[#2dd4b4]/40 shadow-xs'
                                : 'bg-[#0f1828] text-[#8a99ab] border border-[#1f2b40] hover:text-[#e8eef5]'
                        }`}
                    >
                        <span>All</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                                activeTab === 'all'
                                    ? 'bg-[#2dd4b4]/30 text-[#2dd4b4]'
                                    : 'bg-[#16233a] text-[#8a99ab]'
                            }`}
                        >
                            {counts.all}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('approved')}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shrink-0 ${
                            activeTab === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                                : 'bg-[#0f1828] text-[#8a99ab] border border-[#1f2b40] hover:text-[#e8eef5]'
                        }`}
                    >
                        <span>Accepted</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                                activeTab === 'approved'
                                    ? 'bg-emerald-500/30 text-emerald-200'
                                    : 'bg-[#16233a] text-[#8a99ab]'
                            }`}
                        >
                            {counts.approved}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('rejected')}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shrink-0 ${
                            activeTab === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                                : 'bg-[#0f1828] text-[#8a99ab] border border-[#1f2b40] hover:text-[#e8eef5]'
                        }`}
                    >
                        <span>Rejected</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                                activeTab === 'rejected'
                                    ? 'bg-rose-500/30 text-rose-200'
                                    : 'bg-[#16233a] text-[#8a99ab]'
                            }`}
                        >
                            {counts.rejected}
                        </span>
                    </button>
                </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a99ab]" />
                <Input
                    placeholder="Search athlete, coach, dojo, chest #, belt rank..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-10 pr-9 rounded-xl bg-[#111a2b] border-[#1f2b40] text-[#e8eef5] placeholder:text-[#6b7b8f] text-xs focus:border-[#2dd4b4] focus:ring-1 focus:ring-[#2dd4b4]"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a99ab] hover:text-[#e8eef5] cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 1. DESKTOP / LAPTOP TABLE (Obsidian Dark Theme Pixel-Perfect)              */}
            {/* ========================================================================= */}
            <div className="hidden lg:block relative pb-28">
                <div className="bg-[#111a2b] border border-[#1f2b40] rounded-2xl overflow-hidden shadow-xl">
                    {/* Table Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '28px 56px 190px 58px 85px 105px 65px 58px 1fr 140px 160px',
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
                            Coach
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
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f]">
                            Status
                        </span>
                        <span className="text-[11px] tracking-[0.12em] uppercase font-bold text-[#6b7b8f] text-right">
                            Action
                        </span>
                    </div>

                    {/* Table Body Rows */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-16 text-center text-[#8a99ab] text-sm">
                            No tournament entries found in this view.
                        </div>
                    ) : (
                        filteredEntries.map((entry) => {
                            const isSelected = selectedIds.has(entry.id)
                            const isApproved = entry.status === 'approved'
                            const isPending = entry.status === 'submitted'
                            const isRejected = entry.status === 'rejected'
                            const tags = getAppliedTags(entry)
                            const age = getAthleteAge(entry.student_dob)
                            const dojo = entry.dojo_name || '—'
                            const coach = entry.coach_name || entry.coach_email.split('@')[0] || '—'
                            const rank = entry.student_rank || 'White'
                            const weight = entry.declared_weight_kg || entry.student_weight || '—'

                            return (
                                <div
                                    key={entry.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '28px 56px 190px 58px 85px 105px 65px 58px 1fr 140px 160px',
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
                                        onClick={() => handleToggleSelectOne(entry.id)}
                                        className={`w-5 h-5 rounded-[6px] border-2 cursor-pointer flex items-center justify-center transition ${
                                            isSelected
                                                ? 'bg-[#2dd4b4] border-[#2dd4b4]'
                                                : 'border-[#34455f] hover:border-[#2dd4b4]/60'
                                        }`}
                                    >
                                        {isSelected && <CheckmarkSvg />}
                                    </span>

                                    {/* Chest # */}
                                    <div className="flex items-center">
                                        {entry.chest_no ? (
                                            <span className="text-[16px] font-bold text-[#2dd4b4] tracking-tight">
                                                #{String(entry.chest_no).padStart(3, '0')}
                                            </span>
                                        ) : (
                                            <span className="text-[#6b7b8f] text-[16px]">—</span>
                                        )}
                                    </div>

                                    {/* Athlete Avatar + Name */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative w-[46px] h-[46px] rounded-full bg-[#16233a] border-2 border-[#243349] flex items-center justify-center shrink-0">
                                            {entry.student_photo ? (
                                                <Image
                                                    src={entry.student_photo}
                                                    alt={entry.student_name}
                                                    width={46}
                                                    height={46}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-base font-bold text-[#2dd4b4]">
                                                    {entry.student_name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            {isApproved && <AvatarVerifiedBadge />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[15.5px] font-bold text-[#e8eef5] truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-[12.5px] text-[#8a99ab] truncate mt-0.5">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Age */}
                                    <span className="text-[15.5px] font-bold text-[#e8eef5]">
                                        {age}
                                    </span>

                                    {/* Dojo */}
                                    <span className="text-[14.5px] text-[#e8eef5] truncate" title={dojo}>
                                        {dojo}
                                    </span>

                                    {/* Coach */}
                                    <span className="text-[14px] text-[#8a99ab] truncate" title={coach}>
                                        {coach}
                                    </span>

                                    {/* Belt */}
                                    <span className="text-[14.5px] font-semibold text-[#e8eef5] truncate">
                                        {rank}
                                    </span>

                                    {/* Weight */}
                                    <span className="text-[14.5px] font-semibold text-[#e8eef5]">
                                        {weight !== '—' ? `${weight} kg` : '—'}
                                    </span>

                                    {/* Events Applied Tags */}
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[12px] font-semibold bg-[#1a2a44] text-[#c9d3df] rounded-full px-2.5 py-0.5 whitespace-nowrap"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Status Pill */}
                                    <div>
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-[#2dd4b4]/12 text-[#2dd4b4] border border-[#2dd4b4]/35">
                                                <Check className="h-3 w-3" />
                                                Accepted ✓
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                                                <Clock className="h-3 w-3" />
                                                Waiting for Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35">
                                                <X className="h-3 w-3" />
                                                Rejected
                                            </span>
                                        )}
                                    </div>

                                    {/* Quick Actions & 3-Dot Row Menu */}
                                    <div className="flex items-center justify-end gap-1.5">
                                        {isPending && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    disabled={isActionPending}
                                                    onClick={() => handleApproveSingle(entry)}
                                                    className="h-8 px-2.5 rounded-lg bg-[#2dd4b4] text-[#04231e] font-bold text-xs hover:bg-[#26bfa2] cursor-pointer shadow-xs"
                                                >
                                                    <Check className="h-3.5 w-3.5 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isActionPending}
                                                    onClick={() => handleOpenRejectSingle(entry)}
                                                    className="h-8 w-8 p-0 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                                                    title="Reject entry"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}

                                        {isApproved && (
                                            <Link
                                                href={`/parent/entries/${entry.id}/id-card`}
                                                target="_blank"
                                                className="h-8 px-2.5 rounded-lg border border-[#2dd4b4]/40 text-[#2dd4b4] hover:bg-[#2dd4b4]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                                                title="View official ID pass"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                ID Pass
                                            </Link>
                                        )}

                                        {isRejected && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isActionPending}
                                                onClick={() => handleApproveSingle(entry)}
                                                className="h-8 px-2.5 rounded-lg border-[#2dd4b4]/40 text-[#2dd4b4] hover:bg-[#2dd4b4]/10 text-xs font-semibold"
                                            >
                                                Re-approve
                                            </Button>
                                        )}

                                        {/* 3-Dot Row Menu (···) Matching CoachMenu.dc.html */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-8 h-8 rounded-lg border border-[#2a3b57] text-[#8a99ab] hover:text-[#e8eef5] hover:border-[#34455f] inline-flex items-center justify-center text-sm transition cursor-pointer"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-56 bg-[#16233a] border border-[#34455f] text-[#e8eef5] rounded-xl shadow-2xl p-1.5"
                                            >
                                                {/* ID Card / Pass Action */}
                                                {isApproved ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/parent/entries/${entry.id}/id-card`}
                                                            target="_blank"
                                                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#e8eef5] hover:bg-[#1f2f4d] rounded-lg cursor-pointer"
                                                        >
                                                            <span className="text-[#2dd4b4]">
                                                                <FileText className="h-4 w-4" />
                                                            </span>
                                                            <div>
                                                                <div className="font-semibold text-xs">Download ID Pass</div>
                                                                <div className="text-[10.5px] text-[#8a99ab]">
                                                                    Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 opacity-50 cursor-not-allowed">
                                                        <FileText className="h-4 w-4 text-[#8a99ab]" />
                                                        <div>
                                                            <div className="font-semibold text-xs text-[#8a99ab]">Download ID Pass</div>
                                                            <div className="text-[10.5px] text-[#8a99ab]">
                                                                Available after approval
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <DropdownMenuSeparator className="bg-[#2a3b57] my-1" />

                                                {/* Athlete Details */}
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedDetailEntry(entry)
                                                        setDetailDialogOpen(true)
                                                    }}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#8a99ab] hover:text-[#e8eef5] hover:bg-[#1f2f4d] rounded-lg cursor-pointer"
                                                >
                                                    <User className="h-4 w-4" />
                                                    View Athlete Details
                                                </DropdownMenuItem>

                                                {/* Assign / Edit Chest # */}
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenChestDialog(entry)}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#8a99ab] hover:text-[#e8eef5] hover:bg-[#1f2f4d] rounded-lg cursor-pointer"
                                                >
                                                    <Hash className="h-4 w-4 text-[#2dd4b4]" />
                                                    {entry.chest_no ? 'Edit Chest Number' : 'Assign Chest Number'}
                                                </DropdownMenuItem>

                                                {/* Rejection / Approval Toggle */}
                                                {!isApproved && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleApproveSingle(entry)}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#2dd4b4] hover:bg-[#2dd4b4]/10 rounded-lg cursor-pointer"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Accept Entry
                                                    </DropdownMenuItem>
                                                )}

                                                {!isRejected && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleOpenRejectSingle(entry)}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                    >
                                                        <X className="h-4 w-4" />
                                                        Reject Entry
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Floating Batch Selection Bar (Matching CoachLaptopSel.dc.html) */}
                {selectedIds.size > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: '#0d1626',
                            borderTop: '1px solid #1f2b40',
                            boxShadow: '0 -16px 30px rgba(10,18,32,.95)',
                            padding: '14px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: '0 0 16px 16px',
                            zIndex: 40,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-[#8a99ab]">
                                <b className="text-[#e8eef5] font-bold text-base">{selectedIds.size}</b> entries selected
                            </span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-[#2dd4b4] hover:underline cursor-pointer"
                            >
                                Deselect all
                            </button>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Button
                                disabled={isActionPending}
                                onClick={handleBulkApprove}
                                className="h-10 px-5 rounded-xl bg-[#2dd4b4] text-[#04231e] font-bold text-sm hover:bg-[#26bfa2] cursor-pointer shadow-md inline-flex items-center gap-2"
                            >
                                {isActionPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 stroke-[2.5]" />
                                )}
                                Approve selected ({selectedIds.size})
                            </Button>

                            <Button
                                variant="outline"
                                disabled={isActionPending}
                                onClick={handleOpenRejectBulk}
                                className="h-10 px-4 rounded-xl border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-sm font-semibold cursor-pointer"
                            >
                                <X className="h-4 w-4 mr-1.5" />
                                Reject selected ({selectedIds.size})
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 2. MOBILE CARD VIEW (Obsidian Dark Theme Pixel-Perfect)                   */}
            {/* ========================================================================= */}
            <div className="lg:hidden space-y-3 pb-24">
                {/* Mobile Select All */}
                <div className="flex items-center justify-between px-2 py-1">
                    <span
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-2 text-xs font-semibold text-[#8a99ab] cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 border-[#34455f] flex items-center justify-center transition ${
                                isAllSelected ? 'bg-[#2dd4b4] border-[#2dd4b4]' : ''
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>
                        <span>Select All ({filteredEntries.length})</span>
                    </span>

                    {selectedIds.size > 0 && (
                        <span className="text-xs text-[#2dd4b4] font-semibold">
                            {selectedIds.size} selected
                        </span>
                    )}
                </div>

                {filteredEntries.length === 0 ? (
                    <div className="py-12 text-center text-[#8a99ab] text-sm bg-[#111a2b] border border-[#1f2b40] rounded-2xl">
                        No tournament entries found.
                    </div>
                ) : (
                    filteredEntries.map((entry) => {
                        const isSelected = selectedIds.has(entry.id)
                        const isApproved = entry.status === 'approved'
                        const isPending = entry.status === 'submitted'
                        const isRejected = entry.status === 'rejected'
                        const tags = getAppliedTags(entry)
                        const age = getAthleteAge(entry.student_dob)
                        const dojo = entry.dojo_name || '—'
                        const coach = entry.coach_name || entry.coach_email.split('@')[0] || '—'
                        const rank = entry.student_rank || 'White'
                        const weight = entry.declared_weight_kg || entry.student_weight || '—'

                        return (
                            <div
                                key={entry.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-[#15233c] border-[#2dd4b4]/60 ring-1 ring-[#2dd4b4]/30'
                                        : 'bg-[#111a2b] border-[#1f2b40]'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            onClick={() => handleToggleSelectOne(entry.id)}
                                            className={`w-5 h-5 rounded-[6px] border-2 cursor-pointer flex items-center justify-center shrink-0 transition ${
                                                isSelected
                                                    ? 'bg-[#2dd4b4] border-[#2dd4b4]'
                                                    : 'border-[#34455f]'
                                            }`}
                                        >
                                            {isSelected && <CheckmarkSvg />}
                                        </span>

                                        <div className="relative w-11 h-11 rounded-full bg-[#16233a] border-2 border-[#243349] flex items-center justify-center shrink-0">
                                            {entry.student_photo ? (
                                                <Image
                                                    src={entry.student_photo}
                                                    alt={entry.student_name}
                                                    width={44}
                                                    height={44}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-sm font-bold text-[#2dd4b4]">
                                                    {entry.student_name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            {isApproved && <AvatarVerifiedBadge />}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="font-bold text-base text-[#e8eef5] truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-xs text-[#8a99ab] truncate">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chest # badge */}
                                    {entry.chest_no ? (
                                        <span className="text-sm font-bold text-[#2dd4b4] bg-[#2dd4b4]/10 border border-[#2dd4b4]/30 rounded-lg px-2 py-0.5 shrink-0">
                                            #{String(entry.chest_no).padStart(3, '0')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-[#6b7b8f]">—</span>
                                    )}
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-[#1f2b40]/80 text-xs">
                                    <div>
                                        <span className="text-[#6b7b8f]">Age / Belt: </span>
                                        <span className="text-[#e8eef5] font-semibold">{age} · {rank}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#6b7b8f]">Weight: </span>
                                        <span className="text-[#e8eef5] font-semibold">{weight !== '—' ? `${weight} kg` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#6b7b8f]">Dojo: </span>
                                        <span className="text-[#e8eef5] font-semibold truncate">{dojo}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#6b7b8f]">Coach: </span>
                                        <span className="text-[#e8eef5] font-semibold truncate">{coach}</span>
                                    </div>
                                </div>

                                {/* Tags + Status */}
                                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#1f2b40]/60">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[11px] font-semibold bg-[#1a2a44] text-[#c9d3df] rounded-full px-2 py-0.5"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    <div>
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#2dd4b4]/12 text-[#2dd4b4] border border-[#2dd4b4]/35">
                                                Accepted ✓
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                                                Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35">
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[#1f2b40]/60">
                                    {isPending && (
                                        <>
                                            <Button
                                                size="sm"
                                                disabled={isActionPending}
                                                onClick={() => handleApproveSingle(entry)}
                                                className="h-8 px-3 rounded-xl bg-[#2dd4b4] text-[#04231e] font-bold text-xs hover:bg-[#26bfa2]"
                                            >
                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isActionPending}
                                                onClick={() => handleOpenRejectSingle(entry)}
                                                className="h-8 px-3 rounded-xl border-rose-500/40 text-rose-400 hover:bg-rose-500/15 text-xs font-semibold"
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}

                                    {isApproved && (
                                        <Link
                                            href={`/parent/entries/${entry.id}/id-card`}
                                            target="_blank"
                                            className="h-8 px-3 rounded-xl border border-[#2dd4b4]/40 text-[#2dd4b4] hover:bg-[#2dd4b4]/10 text-xs font-semibold inline-flex items-center gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View Pass
                                        </Link>
                                    )}

                                    {/* Mobile 3-dot dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 rounded-xl border border-[#2a3b57] text-[#8a99ab] inline-flex items-center justify-center text-xs">
                                                ···
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-48 bg-[#16233a] border border-[#34455f] text-[#e8eef5] rounded-xl shadow-xl p-1"
                                        >
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedDetailEntry(entry)
                                                    setDetailDialogOpen(true)
                                                }}
                                                className="text-xs py-2"
                                            >
                                                Athlete Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenChestDialog(entry)}
                                                className="text-xs py-2 text-[#2dd4b4]"
                                            >
                                                Edit Chest #
                                            </DropdownMenuItem>
                                            {!isApproved && (
                                                <DropdownMenuItem
                                                    onClick={() => handleApproveSingle(entry)}
                                                    className="text-xs py-2 text-[#2dd4b4]"
                                                >
                                                    Accept Entry
                                                </DropdownMenuItem>
                                            )}
                                            {!isRejected && (
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenRejectSingle(entry)}
                                                    className="text-xs py-2 text-rose-400"
                                                >
                                                    Reject Entry
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )
                    })
                )}

                {/* Mobile Floating Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="fixed left-3 right-3 bottom-3 z-50 bg-[#0d1626] border border-[#1f2b40] rounded-2xl p-3 shadow-2xl flex items-center justify-between">
                        <span className="text-xs text-[#e8eef5] font-bold">
                            {selectedIds.size} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                disabled={isActionPending}
                                onClick={handleBulkApprove}
                                className="h-8 rounded-xl bg-[#2dd4b4] text-[#04231e] font-bold text-xs"
                            >
                                Approve ({selectedIds.size})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isActionPending}
                                onClick={handleOpenRejectBulk}
                                className="h-8 rounded-xl border-rose-500/40 text-rose-400 text-xs"
                            >
                                Reject
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 3. REJECT DIALOG MODAL                                                    */}
            {/* ========================================================================= */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-md bg-[#111a2b] border-[#1f2b40] text-[#e8eef5] rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#e8eef5]">
                            {isBulkReject
                                ? `Reject ${selectedIds.size} selected entries?`
                                : `Reject entry for ${targetEntryForReject?.student_name}?`}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#8a99ab]">
                            The coach and parent will be notified. You can specify a reason below (optional).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Quick Reason Chips */}
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#8a99ab] uppercase tracking-wider">
                                Quick Reasons
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Category full',
                                    'Weight limit exceeded',
                                    'Rank/belt mismatch',
                                    'Registration fee pending',
                                    'Incomplete documentation',
                                ].map((chip) => (
                                    <button
                                        key={chip}
                                        type="button"
                                        onClick={() => setRejectReason(chip)}
                                        className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                            rejectReason === chip
                                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                                                : 'bg-[#16233a] text-[#8a99ab] border-[#243349] hover:text-[#e8eef5]'
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Reason Input */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-[#8a99ab] uppercase tracking-wider">
                                Specific Note / Reason
                            </span>
                            <Input
                                placeholder="Explain why this entry is rejected..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="bg-[#0f1828] border-[#1f2b40] text-[#e8eef5] placeholder:text-[#6b7b8f] text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setRejectDialogOpen(false)}
                            className="text-[#8a99ab] hover:text-[#e8eef5] rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isActionPending}
                            onClick={handleConfirmReject}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                        >
                            {isActionPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            ) : null}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* 4. ASSIGN CHEST NUMBER DIALOG                                             */}
            {/* ========================================================================= */}
            <Dialog open={chestDialogOpen} onOpenChange={setChestDialogOpen}>
                <DialogContent className="sm:max-w-xs bg-[#111a2b] border-[#1f2b40] text-[#e8eef5] rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-[#e8eef5]">
                            Assign Chest Number
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#8a99ab]">
                            Athlete: <b className="text-[#e8eef5]">{targetEntryForChest?.student_name}</b>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            type="number"
                            placeholder="e.g. 12"
                            value={chestInputValue}
                            onChange={(e) => setChestInputValue(e.target.value)}
                            className="bg-[#0f1828] border-[#1f2b40] text-[#2dd4b4] font-bold text-center text-xl h-12 rounded-xl focus:border-[#2dd4b4]"
                        />
                        <p className="text-[11px] text-[#6b7b8f] text-center mt-2">
                            Leave empty or clear to unassign.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setChestDialogOpen(false)}
                            className="text-[#8a99ab] hover:text-[#e8eef5] rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isActionPending}
                            onClick={handleSaveChestNo}
                            className="bg-[#2dd4b4] text-[#04231e] font-bold rounded-xl text-xs hover:bg-[#26bfa2]"
                        >
                            {isActionPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            Save Chest #
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* 5. ATHLETE DETAIL MODAL                                                    */}
            {/* ========================================================================= */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="sm:max-w-md bg-[#111a2b] border-[#1f2b40] text-[#e8eef5] rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#e8eef5]">
                            Entry Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDetailEntry && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#16233a] border-2 border-[#2dd4b4] flex items-center justify-center font-bold text-[#2dd4b4] text-lg">
                                    {selectedDetailEntry.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-[#e8eef5]">
                                        {selectedDetailEntry.student_name}
                                    </h4>
                                    <p className="text-xs text-[#8a99ab]">
                                        Reg: {selectedDetailEntry.student_registration_no || '—'} · {selectedDetailEntry.student_gender}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs bg-[#0f1828] border border-[#1f2b40] rounded-xl p-3">
                                <div>
                                    <span className="text-[#6b7b8f]">Dojo:</span>
                                    <p className="font-semibold text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.dojo_name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#6b7b8f]">Coach:</span>
                                    <p className="font-semibold text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.coach_name || selectedDetailEntry.coach_email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#6b7b8f]">Rank / Belt:</span>
                                    <p className="font-semibold text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.student_rank || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#6b7b8f]">Weight:</span>
                                    <p className="font-semibold text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight
                                            ? `${selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight} kg`
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#6b7b8f]">Category:</span>
                                    <p className="font-semibold text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.category_name || 'Standard'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#6b7b8f]">Chest Number:</span>
                                    <p className="font-bold text-[#2dd4b4] mt-0.5">
                                        {selectedDetailEntry.chest_no ? `#${selectedDetailEntry.chest_no}` : 'Not assigned'}
                                    </p>
                                </div>
                            </div>

                            {selectedDetailEntry.rejection_reason && (
                                <div className="text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300">
                                    <span className="font-bold">Rejection Note: </span>
                                    {selectedDetailEntry.rejection_reason}
                                </div>
                            )}

                            {selectedDetailEntry.coach_notes && (
                                <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300">
                                    <span className="font-bold">Coach Note: </span>
                                    {selectedDetailEntry.coach_notes}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {selectedDetailEntry?.status === 'approved' && (
                            <Link
                                href={`/parent/entries/${selectedDetailEntry.id}/id-card`}
                                target="_blank"
                                className="w-full sm:w-auto"
                            >
                                <Button className="w-full rounded-xl bg-[#2dd4b4] text-[#04231e] font-bold text-xs hover:bg-[#26bfa2]">
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    Open ID Card Pass
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setDetailDialogOpen(false)}
                            className="text-[#8a99ab] hover:text-[#e8eef5] rounded-xl text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
