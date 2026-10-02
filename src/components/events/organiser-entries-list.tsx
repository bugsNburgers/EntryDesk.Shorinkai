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
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
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
            {/* Unified Card Container */}
            <div className="rounded-2xl border border-[#ded8cb] bg-white shadow-xs overflow-hidden dark:border-[#1f2b40] dark:bg-[#111a2b]">
                {/* Header with Search and Status Filter Tabs */}
                <div className="border-b border-[#ded8cb] bg-[#faf8f3] px-4 py-3 sm:px-5 sm:py-3.5 dark:border-[#1f2b40] dark:bg-[#0d1624]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-base font-bold text-[#1c1917] dark:text-[#f8fafc] tracking-tight">
                                Tournament Entries
                            </h3>
                            <p className="text-xs text-[#78716c] dark:text-[#8a99ab]">
                                Review, verify, and accept athlete entries submitted by coaches.
                            </p>
                        </div>

                        {/* Search + Tabs Unified */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search entries..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8.5 pl-8 pr-7 text-xs rounded-lg bg-white dark:bg-[#0f1828] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#f8fafc] placeholder:text-muted-foreground focus:ring-1 focus:ring-[#0d9488]"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Status Tabs */}
                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                        activeTab === 'pending'
                                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-bold'
                                            : 'bg-white dark:bg-[#0f1828] text-[#57534e] dark:text-[#8a99ab] border border-[#ded8cb] dark:border-[#1f2b40] hover:bg-[#f5f0e6] dark:hover:bg-[#16233a]'
                                    }`}
                                >
                                    <span>Pending</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200">
                                        {counts.pending}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                        activeTab === 'all'
                                            ? 'bg-[#0d9488]/15 text-[#0d9488] dark:bg-[#2dd4b4]/15 dark:text-[#2dd4b4] border border-[#0d9488]/40 dark:border-[#2dd4b4]/40 font-bold'
                                            : 'bg-white dark:bg-[#0f1828] text-[#57534e] dark:text-[#8a99ab] border border-[#ded8cb] dark:border-[#1f2b40] hover:bg-[#f5f0e6] dark:hover:bg-[#16233a]'
                                    }`}
                                >
                                    <span>All</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-black/5 dark:bg-white/10">
                                        {counts.all}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('approved')}
                                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                        activeTab === 'approved'
                                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                                            : 'bg-white dark:bg-[#0f1828] text-[#57534e] dark:text-[#8a99ab] border border-[#ded8cb] dark:border-[#1f2b40] hover:bg-[#f5f0e6] dark:hover:bg-[#16233a]'
                                    }`}
                                >
                                    <span>Accepted</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                                        {counts.approved}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('rejected')}
                                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                        activeTab === 'rejected'
                                            ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/40 font-bold'
                                            : 'bg-white dark:bg-[#0f1828] text-[#57534e] dark:text-[#8a99ab] border border-[#ded8cb] dark:border-[#1f2b40] hover:bg-[#f5f0e6] dark:hover:bg-[#16233a]'
                                    }`}
                                >
                                    <span>Rejected</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-900 dark:text-rose-200">
                                        {counts.rejected}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 1. DESKTOP / LAPTOP TABLE */}
                <div className="hidden lg:block overflow-x-auto">
                    {/* Table Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '28px 50px 185px 48px 80px 95px 60px 52px 1fr 115px 125px',
                            columnGap: '10px',
                            alignItems: 'center',
                            padding: '0 16px',
                            height: '42px',
                        }}
                        className="bg-[#f5f0e6] dark:bg-[#0f1828] border-b border-[#ded8cb] dark:border-[#1f2b40] text-[#78716c] dark:text-[#8a99ab] text-[11px] font-bold uppercase tracking-wider"
                    >
                        {/* Select All Checkbox */}
                        <span
                            onClick={handleToggleSelectAll}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition ${
                                isAllSelected
                                    ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                    : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent'
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>

                        <span>Chest</span>
                        <span>Athlete</span>
                        <span>Age</span>
                        <span>Dojo</span>
                        <span>Coach</span>
                        <span>Belt</span>
                        <span>Weight</span>
                        <span>Events applied</span>
                        <span>Status</span>
                        <span className="text-right">Action</span>
                    </div>

                    {/* Table Body Rows */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-12 text-center text-[#78716c] dark:text-[#8a99ab] text-sm">
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
                                        gridTemplateColumns: '28px 50px 185px 48px 80px 95px 60px 52px 1fr 115px 125px',
                                        columnGap: '10px',
                                        alignItems: 'center',
                                        padding: '0 16px',
                                        height: '58px',
                                    }}
                                    className={`border-b border-[#ded8cb]/80 dark:border-[#1f2b40] transition-colors ${
                                        isSelected
                                            ? 'bg-[#0d9488]/10 dark:bg-[#2dd4b4]/10'
                                            : 'hover:bg-[#faf8f3] dark:hover:bg-[#15233c]'
                                    }`}
                                >
                                    {/* Row Checkbox */}
                                    <span
                                        onClick={() => handleToggleSelectOne(entry.id)}
                                        className={`w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition ${
                                            isSelected
                                                ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                                : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent hover:border-[#0d9488]/60'
                                        }`}
                                    >
                                        {isSelected && <CheckmarkSvg />}
                                    </span>

                                    {/* Chest # */}
                                    <div className="flex items-center">
                                        {entry.chest_no ? (
                                            <span className="text-xs font-bold text-[#0d9488] dark:text-[#2dd4b4] tracking-tight">
                                                #{String(entry.chest_no).padStart(3, '0')}
                                            </span>
                                        ) : (
                                            <span className="text-[#a8a29e] dark:text-[#6b7b8f] text-xs">—</span>
                                        )}
                                    </div>

                                    {/* Athlete Avatar + Name */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <AthletePfp
                                            photoUrl={entry.student_photo}
                                            name={entry.student_name}
                                            subtitle={entry.dojo_name || entry.student_registration_no}
                                            size={36}
                                            extraDetails={{
                                                dojo: entry.dojo_name,
                                                chestNo: entry.chest_no,
                                                age: age !== '—' ? age : undefined,
                                                rank: entry.student_rank,
                                                gender: entry.student_gender,
                                                category: entry.category_name || undefined,
                                                email: entry.coach_email,
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-[#1c1917] dark:text-[#e8eef5] truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-[11px] text-[#78716c] dark:text-[#8a99ab] truncate">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Age */}
                                    <span className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5]">
                                        {age}
                                    </span>

                                    {/* Dojo */}
                                    <span className="text-xs text-[#1c1917] dark:text-[#e8eef5] truncate" title={dojo}>
                                        {dojo}
                                    </span>

                                    {/* Coach */}
                                    <span className="text-xs text-[#78716c] dark:text-[#8a99ab] truncate" title={coach}>
                                        {coach}
                                    </span>

                                    {/* Belt */}
                                    <span className="text-xs font-semibold text-[#1c1917] dark:text-[#e8eef5] truncate">
                                        {rank}
                                    </span>

                                    {/* Weight */}
                                    <span className="text-xs text-[#1c1917] dark:text-[#e8eef5]">
                                        {weight !== '—' ? `${weight} kg` : '—'}
                                    </span>

                                    {/* Events Applied Tags */}
                                    <div className="flex gap-1 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10.5px] font-semibold bg-[#f2eee5] dark:bg-[#1a2a44] text-[#44403c] dark:text-[#c9d3df] border border-[#ded8cb] dark:border-transparent rounded-full px-2 py-0.5 whitespace-nowrap"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Status Pill */}
                                    <div>
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/35">
                                                <Check className="h-3 w-3" />
                                                Accepted ✓
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/35">
                                                <Clock className="h-3 w-3" />
                                                Pending Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/35">
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
                                                    className="h-7 px-2.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#26bfa2] text-white dark:text-[#04231e] font-bold text-xs cursor-pointer shadow-xs"
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isActionPending}
                                                    onClick={() => handleOpenRejectSingle(entry)}
                                                    className="h-7 w-7 p-0 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/15 cursor-pointer"
                                                    title="Reject entry"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}

                                        {isApproved && (
                                            <Link
                                                href={`/parent/entries/${entry.id}/id-card`}
                                                target="_blank"
                                                className="h-7 px-2 rounded-lg border border-[#0d9488]/40 dark:border-[#2dd4b4]/40 text-[#0d9488] dark:text-[#2dd4b4] hover:bg-[#0d9488]/10 text-xs font-semibold inline-flex items-center gap-1 transition"
                                                title="View official ID pass"
                                            >
                                                <Eye className="h-3 w-3" />
                                                ID Pass
                                            </Link>
                                        )}

                                        {isRejected && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isActionPending}
                                                onClick={() => handleApproveSingle(entry)}
                                                className="h-7 px-2.5 rounded-lg border-[#0d9488]/40 dark:border-[#2dd4b4]/40 text-[#0d9488] dark:text-[#2dd4b4] hover:bg-[#0d9488]/10 text-xs font-semibold"
                                            >
                                                Re-approve
                                            </Button>
                                        )}

                                        {/* 3-Dot Row Menu (···) */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-7 h-7 rounded-lg border border-[#ded8cb] dark:border-[#2a3b57] text-[#78716c] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] hover:border-border inline-flex items-center justify-center text-xs transition cursor-pointer"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-56 bg-white dark:bg-[#16233a] border border-[#ded8cb] dark:border-[#34455f] text-[#1c1917] dark:text-[#e8eef5] rounded-xl shadow-xl p-1.5"
                                            >
                                                {/* ID Card / Pass Action */}
                                                {isApproved ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/parent/entries/${entry.id}/id-card`}
                                                            target="_blank"
                                                            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#faf8f3] dark:hover:bg-[#1f2f4d] rounded-lg cursor-pointer"
                                                        >
                                                            <span className="text-[#0d9488] dark:text-[#2dd4b4]">
                                                                <FileText className="h-4 w-4" />
                                                            </span>
                                                            <div>
                                                                <div className="font-semibold text-xs">Download ID Pass</div>
                                                                <div className="text-[10.5px] text-[#78716c] dark:text-[#8a99ab]">
                                                                    Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 opacity-50 cursor-not-allowed">
                                                        <FileText className="h-4 w-4 text-[#78716c] dark:text-[#8a99ab]" />
                                                        <div>
                                                            <div className="font-semibold text-xs text-[#78716c] dark:text-[#8a99ab]">Download ID Pass</div>
                                                            <div className="text-[10.5px] text-[#78716c] dark:text-[#8a99ab]">
                                                                Available after approval
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <DropdownMenuSeparator className="bg-[#ded8cb] dark:bg-[#2a3b57] my-1" />

                                                {/* Athlete Details */}
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedDetailEntry(entry)
                                                        setDetailDialogOpen(true)
                                                    }}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] hover:bg-[#faf8f3] dark:hover:bg-[#1f2f4d] rounded-lg cursor-pointer"
                                                >
                                                    <User className="h-4 w-4" />
                                                    View Athlete Details
                                                </DropdownMenuItem>

                                                {/* Assign / Edit Chest # */}
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenChestDialog(entry)}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] hover:bg-[#faf8f3] dark:hover:bg-[#1f2f4d] rounded-lg cursor-pointer"
                                                >
                                                    <Hash className="h-4 w-4 text-[#0d9488] dark:text-[#2dd4b4]" />
                                                    {entry.chest_no ? 'Edit Chest Number' : 'Assign Chest Number'}
                                                </DropdownMenuItem>

                                                {/* Rejection / Approval Toggle */}
                                                {!isApproved && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleApproveSingle(entry)}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#0d9488] dark:text-[#2dd4b4] hover:bg-[#0d9488]/10 rounded-lg cursor-pointer"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Accept Entry
                                                    </DropdownMenuItem>
                                                )}

                                                {!isRejected && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleOpenRejectSingle(entry)}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer"
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

                {/* Desktop Card Footer Actions (In-flow, clean) */}
                <div className="hidden lg:flex border-t border-[#ded8cb] dark:border-[#1f2b40] bg-[#faf8f3] dark:bg-[#0f1828] px-4 py-2.5 items-center justify-between text-xs text-[#78716c] dark:text-[#8a99ab]">
                    {selectedIds.size > 0 ? (
                        <>
                            <div className="flex items-center gap-3">
                                <span>
                                    <strong className="text-[#1c1917] dark:text-[#e8eef5] font-bold">{selectedIds.size}</strong> entries selected
                                </span>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-xs text-[#0d9488] dark:text-[#2dd4b4] hover:underline font-semibold cursor-pointer"
                                >
                                    Deselect all
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    disabled={isActionPending}
                                    onClick={handleBulkApprove}
                                    className="h-8 px-3 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#25c4a5] text-white dark:text-[#04231e] font-bold text-xs shadow-xs"
                                >
                                    {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                                    Approve selected ({selectedIds.size})
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isActionPending}
                                    onClick={handleOpenRejectBulk}
                                    className="h-8 px-3 rounded-lg border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Reject selected ({selectedIds.size})
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <span>Showing {filteredEntries.length} of {entries.length} entries</span>
                            <span className="text-[11px] opacity-75">Click checkbox to select entries for bulk actions</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. MOBILE CARD VIEW (Responsive Light & Dark Modes)                       */}
            {/* ========================================================================= */}
            <div className="lg:hidden space-y-3 pb-8">
                {/* Mobile Select All */}
                <div className="flex items-center justify-between px-2 py-1">
                    <span
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-2 text-xs font-semibold text-[#78716c] dark:text-[#8a99ab] cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                isAllSelected
                                    ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                    : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent'
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>
                        <span>Select All ({filteredEntries.length})</span>
                    </span>

                    {selectedIds.size > 0 && (
                        <span className="text-xs text-[#0d9488] dark:text-[#2dd4b4] font-semibold">
                            {selectedIds.size} selected
                        </span>
                    )}
                </div>

                {filteredEntries.length === 0 ? (
                    <div className="py-12 text-center text-[#78716c] dark:text-[#8a99ab] text-sm bg-white dark:bg-[#111a2b] border border-[#ded8cb] dark:border-[#1f2b40] rounded-2xl shadow-xs">
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
                                        ? 'bg-[#0d9488]/5 dark:bg-[#15233c] border-[#0d9488]/60 dark:border-[#2dd4b4]/60 ring-1 ring-[#0d9488]/30 dark:ring-[#2dd4b4]/30'
                                        : 'bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] shadow-xs'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            onClick={() => handleToggleSelectOne(entry.id)}
                                            className={`w-5 h-5 rounded-[6px] border-2 cursor-pointer flex items-center justify-center shrink-0 transition ${
                                                isSelected
                                                    ? 'bg-[#0d9488] dark:bg-[#2dd4b4] border-[#0d9488] dark:border-[#2dd4b4]'
                                                    : 'border-[#ded8cb] dark:border-[#34455f] bg-white dark:bg-transparent'
                                            }`}
                                        >
                                            {isSelected && <CheckmarkSvg />}
                                        </span>

                                        <AthletePfp
                                            photoUrl={entry.student_photo}
                                            name={entry.student_name}
                                            subtitle={entry.dojo_name || entry.student_registration_no}
                                            size={44}
                                            extraDetails={{
                                                dojo: entry.dojo_name,
                                                chestNo: entry.chest_no,
                                                age: age !== '—' ? age : undefined,
                                                rank: entry.student_rank,
                                                gender: entry.student_gender,
                                                category: entry.category_name || undefined,
                                                email: entry.coach_email,
                                            }}
                                        />

                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-[#1c1917] dark:text-[#e8eef5] truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-xs text-[#78716c] dark:text-[#8a99ab] truncate">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chest # badge */}
                                    {entry.chest_no ? (
                                        <span className="text-xs font-bold text-[#0d9488] dark:text-[#2dd4b4] bg-[#0d9488]/10 dark:bg-[#2dd4b4]/10 border border-[#0d9488]/30 dark:border-[#2dd4b4]/30 rounded-lg px-2 py-0.5 shrink-0">
                                            #{String(entry.chest_no).padStart(3, '0')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-[#a8a29e] dark:text-[#6b7b8f]">—</span>
                                    )}
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-[#ded8cb]/80 dark:border-[#1f2b40]/80 text-xs">
                                    <div>
                                        <span className="text-[#78716c] dark:text-[#6b7b8f]">Age / Belt: </span>
                                        <span className="text-[#1c1917] dark:text-[#e8eef5] font-semibold">{age} · {rank}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#78716c] dark:text-[#6b7b8f]">Weight: </span>
                                        <span className="text-[#1c1917] dark:text-[#e8eef5] font-semibold">{weight !== '—' ? `${weight} kg` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#78716c] dark:text-[#6b7b8f]">Dojo: </span>
                                        <span className="text-[#1c1917] dark:text-[#e8eef5] font-semibold truncate">{dojo}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#78716c] dark:text-[#6b7b8f]">Coach: </span>
                                        <span className="text-[#1c1917] dark:text-[#e8eef5] font-semibold truncate">{coach}</span>
                                    </div>
                                </div>

                                {/* Tags + Status */}
                                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#ded8cb]/60 dark:border-[#1f2b40]/60">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[11px] font-semibold bg-[#f5f0e6] dark:bg-[#1a2a44] text-[#57534e] dark:text-[#c9d3df] border border-[#ded8cb] dark:border-[#2a3b57] rounded-full px-2 py-0.5"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    <div>
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35">
                                                Accepted ✓
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35">
                                                Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/35">
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[#ded8cb]/60 dark:border-[#1f2b40]/60">
                                    {isPending && (
                                        <>
                                            <Button
                                                size="sm"
                                                disabled={isActionPending}
                                                onClick={() => handleApproveSingle(entry)}
                                                className="h-8 px-3 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] text-white dark:text-[#04231e] font-bold text-xs"
                                            >
                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isActionPending}
                                                onClick={() => handleOpenRejectSingle(entry)}
                                                className="h-8 px-3 rounded-xl border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-xs font-semibold"
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}

                                    {isApproved && (
                                        <Link
                                            href={`/parent/entries/${entry.id}/id-card`}
                                            target="_blank"
                                            className="h-8 px-3 rounded-xl border border-[#0d9488]/40 dark:border-[#2dd4b4]/40 text-[#0d9488] dark:text-[#2dd4b4] hover:bg-[#0d9488]/10 text-xs font-semibold inline-flex items-center gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View Pass
                                        </Link>
                                    )}

                                    {/* Mobile 3-dot dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 rounded-xl border border-[#ded8cb] dark:border-[#2a3b57] text-[#78716c] dark:text-[#8a99ab] inline-flex items-center justify-center text-xs">
                                                ···
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-48 bg-white dark:bg-[#16233a] border border-[#ded8cb] dark:border-[#34455f] text-[#1c1917] dark:text-[#e8eef5] rounded-xl shadow-xl p-1"
                                        >
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedDetailEntry(entry)
                                                    setDetailDialogOpen(true)
                                                }}
                                                className="text-xs py-2 cursor-pointer"
                                            >
                                                Athlete Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenChestDialog(entry)}
                                                className="text-xs py-2 text-[#0d9488] dark:text-[#2dd4b4] cursor-pointer"
                                            >
                                                Edit Chest #
                                            </DropdownMenuItem>
                                            {!isApproved && (
                                                <DropdownMenuItem
                                                    onClick={() => handleApproveSingle(entry)}
                                                    className="text-xs py-2 text-[#0d9488] dark:text-[#2dd4b4] cursor-pointer"
                                                >
                                                    Accept Entry
                                                </DropdownMenuItem>
                                            )}
                                            {!isRejected && (
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenRejectSingle(entry)}
                                                    className="text-xs py-2 text-rose-600 dark:text-rose-400 cursor-pointer"
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

                {/* Mobile In-flow Action Bar (NO fixed overlay) */}
                {selectedIds.size > 0 && (
                    <div className="p-3.5 bg-[#faf8f3] dark:bg-[#0d1626] border border-[#ded8cb] dark:border-[#1f2b40] rounded-2xl shadow-xs flex items-center justify-between">
                        <span className="text-xs text-[#1c1917] dark:text-[#e8eef5] font-bold">
                            {selectedIds.size} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                disabled={isActionPending}
                                onClick={handleBulkApprove}
                                className="h-8 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] text-white dark:text-[#04231e] font-bold text-xs"
                            >
                                Approve ({selectedIds.size})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isActionPending}
                                onClick={handleOpenRejectBulk}
                                className="h-8 rounded-xl border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs"
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
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#1c1917] dark:text-[#e8eef5]">
                            {isBulkReject
                                ? `Reject ${selectedIds.size} selected entries?`
                                : `Reject entry for ${targetEntryForReject?.student_name}?`}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#78716c] dark:text-[#8a99ab]">
                            The coach and parent will be notified. You can specify a reason below (optional).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Quick Reason Chips */}
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#78716c] dark:text-[#8a99ab] uppercase tracking-wider">
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
                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/50'
                                                : 'bg-[#faf8f3] dark:bg-[#16233a] text-[#57534e] dark:text-[#8a99ab] border-[#ded8cb] dark:border-[#243349] hover:text-[#1c1917] dark:hover:text-[#e8eef5]'
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Reason Input */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-[#78716c] dark:text-[#8a99ab] uppercase tracking-wider">
                                Specific Note / Reason
                            </span>
                            <Input
                                placeholder="Explain why this entry is rejected..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="bg-white dark:bg-[#0f1828] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7b8f] text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setRejectDialogOpen(false)}
                            className="text-[#78716c] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] rounded-xl text-xs"
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
                <DialogContent className="sm:max-w-xs bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-[#1c1917] dark:text-[#e8eef5]">
                            Assign Chest Number
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#78716c] dark:text-[#8a99ab]">
                            Athlete: <b className="text-[#1c1917] dark:text-[#e8eef5]">{targetEntryForChest?.student_name}</b>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            type="number"
                            placeholder="e.g. 12"
                            value={chestInputValue}
                            onChange={(e) => setChestInputValue(e.target.value)}
                            className="bg-[#faf8f3] dark:bg-[#0f1828] border-[#ded8cb] dark:border-[#1f2b40] text-[#0d9488] dark:text-[#2dd4b4] font-bold text-center text-xl h-12 rounded-xl focus:border-[#0d9488] dark:focus:border-[#2dd4b4]"
                        />
                        <p className="text-[11px] text-[#78716c] dark:text-[#6b7b8f] text-center mt-2">
                            Leave empty or clear to unassign.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setChestDialogOpen(false)}
                            className="text-[#78716c] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isActionPending}
                            onClick={handleSaveChestNo}
                            className="bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#26bfa2] text-white dark:text-[#04231e] font-bold rounded-xl text-xs"
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
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#111a2b] border-[#ded8cb] dark:border-[#1f2b40] text-[#1c1917] dark:text-[#e8eef5] rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#1c1917] dark:text-[#e8eef5]">
                            Entry Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDetailEntry && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#f5f0e6] dark:bg-[#16233a] border-2 border-[#0d9488] dark:border-[#2dd4b4] flex items-center justify-center font-bold text-[#0d9488] dark:text-[#2dd4b4] text-lg">
                                    {selectedDetailEntry.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-[#1c1917] dark:text-[#e8eef5]">
                                        {selectedDetailEntry.student_name}
                                    </h4>
                                    <p className="text-xs text-[#78716c] dark:text-[#8a99ab]">
                                        Reg: {selectedDetailEntry.student_registration_no || '—'} · {selectedDetailEntry.student_gender}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs bg-[#faf8f3] dark:bg-[#0f1828] border border-[#ded8cb] dark:border-[#1f2b40] rounded-xl p-3">
                                <div>
                                    <span className="text-[#78716c] dark:text-[#6b7b8f]">Dojo:</span>
                                    <p className="font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.dojo_name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#78716c] dark:text-[#6b7b8f]">Coach:</span>
                                    <p className="font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.coach_name || selectedDetailEntry.coach_email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#78716c] dark:text-[#6b7b8f]">Rank / Belt:</span>
                                    <p className="font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.student_rank || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#78716c] dark:text-[#6b7b8f]">Weight:</span>
                                    <p className="font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight
                                            ? `${selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight} kg`
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#78716c] dark:text-[#6b7b8f]">Category:</span>
                                    <p className="font-semibold text-[#1c1917] dark:text-[#e8eef5] mt-0.5">
                                        {selectedDetailEntry.category_name || 'Standard'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#78716c] dark:text-[#6b7b8f]">Chest Number:</span>
                                    <p className="font-bold text-[#0d9488] dark:text-[#2dd4b4] mt-0.5">
                                        {selectedDetailEntry.chest_no ? `#${selectedDetailEntry.chest_no}` : 'Not assigned'}
                                    </p>
                                </div>
                            </div>

                            {selectedDetailEntry.rejection_reason && (
                                <div className="text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-700 dark:text-rose-300">
                                    <span className="font-bold">Rejection Note: </span>
                                    {selectedDetailEntry.rejection_reason}
                                </div>
                            )}

                            {selectedDetailEntry.coach_notes && (
                                <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-800 dark:text-amber-300">
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
                                <Button className="w-full rounded-xl bg-[#0d9488] hover:bg-[#0f766e] dark:bg-[#2dd4b4] dark:hover:bg-[#26bfa2] text-white dark:text-[#04231e] font-bold text-xs">
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    Open ID Card Pass
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setDetailDialogOpen(false)}
                            className="text-[#78716c] dark:text-[#8a99ab] hover:text-[#1c1917] dark:hover:text-[#e8eef5] rounded-xl text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
