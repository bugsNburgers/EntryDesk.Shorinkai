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
    return age > 0 ? String(age) : '—'
}

function formatBelt(rank: string | null | undefined): string {
    if (!rank) return 'White'
    const cleaned = rank.replace(/\bbelts?\b/gi, '').replace(/\s+/g, ' ').trim()
    return cleaned || 'White'
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
                await updateEntryChestNo(targetEntryForChest.id, parsed)
                toast.success(`Chest number updated for ${targetEntryForChest.student_name}`)
                setChestDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || 'Failed to update chest number')
            }
        })
    }

    return (
        <div className="w-full text-foreground select-text font-['Google_Sans','Product_Sans',system-ui,sans-serif] space-y-4 pb-44 md:pb-28">
            {/* ========================================================================= */}
            {/* 1. SEARCH BAR & ACTION BUTTONS (IN LINE)                                  */}
            {/* ========================================================================= */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Single white search box (stretches to fill available space until buttons) */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search student, dojo, coach, belt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary shadow-xs transition"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground p-1 cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Print ID Cards in line on the right */}
                {counts.approved > 0 && eventId && (
                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                        <Link href={`/dashboard/events/${eventId}/print`} target="_blank" className="flex-1 sm:flex-initial">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto h-11 px-4 gap-1.5 rounded-xl font-semibold border-primary/40 text-primary hover:bg-primary/5 bg-card shadow-xs cursor-pointer"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print ID Cards ({counts.approved})</span>
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 2. UNIFIED ATHLETE ENTRIES CARD (HEADER + ATHLETES TABLE JOINED)          */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden dark:border-border dark:bg-card">
                {/* Upper Section: Pending Approvals text & Segmented Slider with curvy top arc */}
                <div className="p-4 sm:p-5 bg-card border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                        <h3 className={`text-xl font-bold tracking-tight ${headingColor}`}>
                            {headingInfo.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {headingInfo.subtitle}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Segmented Slider Switcher */}
                        <div className="p-1 rounded-xl bg-muted/80 dark:bg-[#070e1b] border border-border inline-flex items-center gap-1 overflow-x-auto max-w-full">
                            {[
                                { key: 'pending' as const, label: 'Pending Approvals', count: counts.pending, isPending: true },
                                { key: 'all' as const, label: 'All', count: counts.all },
                                { key: 'approved' as const, label: 'Accepted', count: counts.approved },
                                { key: 'rejected' as const, label: 'Rejected', count: counts.rejected },
                            ].map((tab) => {
                                const isActive = activeTab === tab.key
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
                                        ? 'bg-white dark:bg-[#17243c] text-foreground font-bold shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                    badgeClasses = isActive
                                        ? 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary'
                                        : 'bg-black/5 dark:bg-white/10 text-muted-foreground'
                                }

                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
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
                {/* 1. DESKTOP / LAPTOP TABLE                                                 */}
                {/* ========================================================================= */}
                <div className="hidden lg:block overflow-x-auto">
                    {/* Table Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '36px 60px minmax(160px, 1.2fr) 42px 85px 95px minmax(130px, 0.8fr) 65px 150px 125px 120px',
                            alignItems: 'center',
                            height: '48px',
                        }}
                        className="bg-muted dark:bg-card border-b border-border text-muted-foreground text-[11px] font-bold uppercase tracking-wider"
                    >
                        {/* Select All Checkbox */}
                        <div className="h-full flex items-center justify-center border-r border-dotted border-border px-2">
                            <span
                                onClick={handleToggleSelectAll}
                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center cursor-pointer transition ${
                                    isAllSelected
                                        ? 'bg-primary border-primary'
                                        : 'border-border bg-white dark:bg-transparent'
                                }`}
                            >
                                {isAllSelected && <CheckmarkSvg />}
                            </span>
                        </div>

                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Chest</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Athlete</div>
                        <div className="h-full flex items-center justify-center px-1 border-r border-dotted border-border">Age</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Dojo</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Coach</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Belt</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Weight</div>
                        <div className="h-full flex items-center px-2 border-r border-dotted border-border">Events applied</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Status</div>
                        <div className="h-full flex items-center justify-start px-4 text-left">Action</div>
                    </div>

                    {/* Table Body Rows (82px spacious height with light dotted column divider lines) */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-sm">
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
                            const rank = formatBelt(entry.student_rank)
                            const weight = entry.declared_weight_kg || entry.student_weight || '—'

                            return (
                                <div
                                    key={entry.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '36px 60px minmax(160px, 1.2fr) 42px 85px 95px minmax(130px, 0.8fr) 65px 150px 125px 120px',
                                        alignItems: 'center',
                                        height: '82px',
                                    }}
                                    className={`border-b border-border transition-colors ${
                                        isSelected
                                            ? 'bg-primary/10 dark:bg-[rgba(45,212,180,0.07)]'
                                            : 'bg-card hover:bg-background dark:hover:bg-muted'
                                    }`}
                                >
                                    {/* Col 1: Checkbox */}
                                    <div className="h-full flex items-center justify-center border-r border-dotted border-border px-2">
                                        <span
                                            onClick={() => handleToggleSelectOne(entry.id)}
                                            className={`w-5 h-5 rounded-[6px] border-2 cursor-pointer flex items-center justify-center transition ${
                                                isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border bg-white dark:bg-transparent hover:border-primary/60'
                                            }`}
                                        >
                                            {isSelected && <CheckmarkSvg />}
                                        </span>
                                    </div>

                                    {/* Col 2: Chest # */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">
                                        {entry.chest_no ? (
                                            <span className="text-[16px] font-bold text-primary tracking-tight">
                                                #{String(entry.chest_no).padStart(3, '0')}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-[17px]">—</span>
                                        )}
                                    </div>

                                    {/* Col 3: Athlete Avatar + Name (46px avatar) */}
                                    <div className="h-full flex items-center gap-3 px-2.5 border-r border-dotted border-border min-w-0">
                                        <AthletePfp
                                            photoUrl={entry.student_photo}
                                            name={entry.student_name}
                                            subtitle={entry.dojo_name || entry.student_registration_no}
                                            size={46}
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
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[15.5px] font-bold text-foreground truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Col 4: Age (No yrs, shrunk) */}
                                    <div className="h-full flex items-center justify-center px-1 border-r border-dotted border-border text-[15px] font-bold text-foreground">
                                        {age}
                                    </div>

                                    {/* Col 5: Dojo */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border text-[14.5px] text-foreground truncate" title={dojo}>
                                        {dojo}
                                    </div>

                                    {/* Col 6: Coach */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border text-[14.5px] text-muted-foreground truncate" title={coach}>
                                        {coach}
                                    </div>

                                    {/* Col 7: Belt */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border text-[14.5px] font-semibold text-foreground truncate">
                                        {rank}
                                    </div>

                                    {/* Col 8: Weight */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border text-[14.5px] font-semibold text-foreground">
                                        {weight !== '—' ? `${weight} kg` : '—'}
                                    </div>

                                    {/* Col 9: Events Applied Tags (2 rows up and down) */}
                                    <div className="h-full flex items-center px-2 border-r border-dotted border-border overflow-hidden">
                                        <div className="grid grid-cols-2 gap-1 w-full max-w-[155px]">
                                            {tags.map((t, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-[10px] sm:text-[10.5px] font-semibold bg-muted text-muted-foreground dark:text-foreground border border-border dark:border-transparent rounded-md px-1 py-0.5 text-center truncate leading-tight whitespace-nowrap"
                                                    title={t}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Col 10: Status Pill */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/35">
                                                <Check className="h-3 w-3" />
                                                Accepted ✓
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/35">
                                                <Clock className="h-3 w-3" />
                                                Pending Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/35">
                                                <X className="h-3 w-3" />
                                                Rejected
                                            </span>
                                        )}
                                    </div>

                                    {/* Col 11: Quick Actions & 3-Dot Row Menu */}
                                    <div className="h-full flex items-center justify-start gap-2 px-4">
                                        {isPending && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    disabled={isActionPending}
                                                    onClick={() => handleApproveSingle(entry)}
                                                    className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-[#26bfa2] text-white dark:text-primary-foreground font-bold text-xs cursor-pointer shadow-xs"
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isActionPending}
                                                    onClick={() => handleOpenRejectSingle(entry)}
                                                    className="h-8 w-8 p-0 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/15 cursor-pointer"
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
                                                className="h-8 px-2.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold inline-flex items-center gap-1 transition"
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
                                                className="h-8 px-2.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold"
                                            >
                                                Re-approve
                                            </Button>
                                        )}

                                        {/* 3-Dot Row Menu (···) */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-10 h-10 rounded-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary inline-flex items-center justify-center text-lg font-bold tracking-widest transition cursor-pointer shrink-0"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-56 bg-muted border border-border text-foreground rounded-xl shadow-xl p-1.5"
                                            >
                                                {/* ID Card / Pass Action */}
                                                {isApproved ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/parent/entries/${entry.id}/id-card`}
                                                            target="_blank"
                                                            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-background dark:hover:bg-border rounded-lg cursor-pointer"
                                                        >
                                                            <span className="text-primary">
                                                                <FileText className="h-4 w-4" />
                                                            </span>
                                                            <div>
                                                                <div className="font-semibold text-xs">Download ID Pass</div>
                                                                <div className="text-[10.5px] text-muted-foreground">
                                                                    Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 opacity-50 cursor-not-allowed">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-semibold text-xs text-muted-foreground">Download ID Pass</div>
                                                            <div className="text-[10.5px] text-muted-foreground">
                                                                Available after approval
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <DropdownMenuSeparator className="bg-border my-1" />

                                                {/* Athlete Details */}
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedDetailEntry(entry)
                                                        setDetailDialogOpen(true)
                                                    }}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-border rounded-lg cursor-pointer"
                                                >
                                                    <User className="h-4 w-4" />
                                                    View Athlete Details
                                                </DropdownMenuItem>

                                                {/* Assign / Edit Chest # */}
                                                <DropdownMenuItem
                                                    onClick={() => handleOpenChestDialog(entry)}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-border rounded-lg cursor-pointer"
                                                >
                                                    <Hash className="h-4 w-4 text-primary" />
                                                    {entry.chest_no ? 'Edit Chest Number' : 'Assign Chest Number'}
                                                </DropdownMenuItem>

                                                {/* Rejection / Approval Toggle */}
                                                {!isApproved && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleApproveSingle(entry)}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
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
            </div>

            {/* ========================================================================= */}
            {/* 4. MOBILE CARD VIEW (Responsive Light & Dark Modes)                       */}
            {/* ========================================================================= */}
            <div className="lg:hidden space-y-3 pb-8">
                {/* Mobile Select All */}
                <div className="flex items-center justify-between px-2 py-1">
                    <span
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                isAllSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-border bg-white dark:bg-transparent'
                            }`}
                        >
                            {isAllSelected && <CheckmarkSvg />}
                        </span>
                        <span>Select All ({filteredEntries.length})</span>
                    </span>

                    {selectedIds.size > 0 && (
                        <span className="text-xs text-primary font-semibold">
                            {selectedIds.size} selected
                        </span>
                    )}
                </div>

                {filteredEntries.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-2xl shadow-xs">
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
                        const rank = formatBelt(entry.student_rank)
                        const weight = entry.declared_weight_kg || entry.student_weight || '—'

                        return (
                            <div
                                key={entry.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-primary/5 dark:bg-muted border-primary/60 ring-1 ring-primary/30'
                                        : 'bg-card border-border shadow-xs'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            onClick={() => handleToggleSelectOne(entry.id)}
                                            className={`w-5 h-5 rounded-[6px] border-2 cursor-pointer flex items-center justify-center shrink-0 transition ${
                                                isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border bg-white dark:bg-transparent'
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
                                            <div className="font-bold text-sm text-foreground truncate">
                                                {entry.student_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {entry.student_registration_no || entry.student_gender || 'Athlete'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chest # badge */}
                                    {entry.chest_no ? (
                                        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg px-2 py-0.5 shrink-0">
                                            #{String(entry.chest_no).padStart(3, '0')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-border/80 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Age / Belt: </span>
                                        <span className="text-foreground font-semibold">{age} · {rank}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Weight: </span>
                                        <span className="text-foreground font-semibold">{weight !== '—' ? `${weight} kg` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Dojo: </span>
                                        <span className="text-foreground font-semibold truncate">{dojo}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Coach: </span>
                                        <span className="text-foreground font-semibold truncate">{coach}</span>
                                    </div>
                                </div>

                                {/* Tags + Status */}
                                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/60">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[11px] font-semibold bg-muted text-muted-foreground dark:text-foreground border border-border rounded-full px-2 py-0.5"
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
                                <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-border/60">
                                    {isPending && (
                                        <>
                                            <Button
                                                size="sm"
                                                disabled={isActionPending}
                                                onClick={() => handleApproveSingle(entry)}
                                                className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 dark:bg-primary text-white dark:text-primary-foreground font-bold text-xs"
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
                                            className="h-8 px-3 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold inline-flex items-center gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View Pass
                                        </Link>
                                    )}

                                    {/* Mobile 3-dot dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 rounded-xl border border-border text-muted-foreground inline-flex items-center justify-center text-xs">
                                                ···
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-48 bg-muted border border-border text-foreground rounded-xl shadow-xl p-1"
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
                                                className="text-xs py-2 text-primary cursor-pointer"
                                            >
                                                Edit Chest #
                                            </DropdownMenuItem>
                                            {!isApproved && (
                                                <DropdownMenuItem
                                                    onClick={() => handleApproveSingle(entry)}
                                                    className="text-xs py-2 text-primary cursor-pointer"
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

            </div>

            {/* ========================================================================= */}
            {/* FIXED FOOTER (Desktop & Mobile) — Fixed above mobile nav on mobile        */}
            {/* ========================================================================= */}
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 dark:bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-12px_28px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_30px_rgba(10,18,32,0.95)]">
                {/* Desktop View */}
                <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-3.5 items-center justify-between">
                    {selectedIds.size > 0 ? (
                        <>
                            <div className="text-[15px] text-foreground">
                                <b className="font-bold">{selectedIds.size} selected</b> &nbsp;·&nbsp;
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-primary font-semibold cursor-pointer hover:underline ml-1"
                                >
                                    Deselect all
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkApprove}
                                    disabled={isActionPending}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                    Approve selected ({selectedIds.size})
                                </button>
                                <button
                                    onClick={handleOpenRejectBulk}
                                    disabled={isActionPending}
                                    className="h-[46px] px-5 rounded-xl font-bold text-[15px] border-[1.5px] border-rose-400 dark:border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition disabled:opacity-40 cursor-pointer"
                                >
                                    <X className="h-4 w-4 mr-1 inline" />
                                    Reject selected ({selectedIds.size})
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[14.5px] text-muted-foreground">
                                <b className="text-foreground font-bold">{counts.pending}</b> pending review &nbsp;·&nbsp; {counts.approved} accepted &nbsp;·&nbsp; {counts.rejected} rejected
                            </div>
                            <button
                                onClick={handleApproveAllPending}
                                disabled={isActionPending || counts.pending === 0}
                                className="h-[46px] px-5 rounded-xl font-bold text-[15px] bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground inline-flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Accept all pending ({counts.pending})
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile View */}
                <div className="block lg:hidden px-4 py-3 space-y-2">
                    {selectedIds.size > 0 ? (
                        <>
                            <div className="flex justify-between items-center text-[14px] text-foreground">
                                <b className="font-bold">{selectedIds.size} selected</b>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-primary font-semibold cursor-pointer hover:underline"
                                >
                                    Deselect all
                                </button>
                            </div>
                            <button
                                onClick={handleBulkApprove}
                                disabled={isActionPending}
                                className="h-[48px] w-full text-[15px] font-bold bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Approve selected ({selectedIds.size})
                            </button>
                            <button
                                onClick={handleOpenRejectBulk}
                                disabled={isActionPending}
                                className="h-[42px] w-full text-[14px] font-bold border-[1.5px] border-rose-400 dark:border-rose-500/50 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition disabled:opacity-40 cursor-pointer"
                            >
                                Reject selected ({selectedIds.size})
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-[13.5px] text-muted-foreground">
                                <b className="text-foreground font-bold">{counts.pending}</b> pending review · {counts.approved} accepted
                            </div>
                            <button
                                onClick={handleApproveAllPending}
                                disabled={isActionPending || counts.pending === 0}
                                className="h-[48px] w-full text-[15.5px] font-bold bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl inline-flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md"
                            >
                                {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Accept all pending ({counts.pending})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. REJECT DIALOG MODAL                                                    */}
            {/* ========================================================================= */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            {isBulkReject
                                ? `Reject ${selectedIds.size} selected entries?`
                                : `Reject entry for ${targetEntryForReject?.student_name}?`}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            The coach and parent will be notified. You can specify a reason below (optional).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Quick Reason Chips */}
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                                                : 'bg-background dark:bg-muted text-muted-foreground border-border hover:text-foreground'
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Reason Input */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Specific Note / Reason
                            </span>
                            <Input
                                placeholder="Explain why this entry is rejected..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="bg-card border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setRejectDialogOpen(false)}
                            className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
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
                <DialogContent className="sm:max-w-xs bg-card border-border text-foreground rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground">
                            Assign Chest Number
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Athlete: <b className="text-foreground">{targetEntryForChest?.student_name}</b>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            type="number"
                            placeholder="e.g. 12"
                            value={chestInputValue}
                            onChange={(e) => setChestInputValue(e.target.value)}
                            className="bg-background dark:bg-card border-border text-primary font-bold text-center text-xl h-12 rounded-xl focus:border-primary"
                        />
                        <p className="text-[11px] text-muted-foreground text-center mt-2">
                            Leave empty or clear to unassign.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setChestDialogOpen(false)}
                            className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isActionPending}
                            onClick={handleSaveChestNo}
                            className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-[#26bfa2] text-white dark:text-primary-foreground font-bold rounded-xl text-xs"
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
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Entry Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDetailEntry && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-muted border-2 border-primary flex items-center justify-center font-bold text-primary text-lg">
                                    {selectedDetailEntry.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-foreground">
                                        {selectedDetailEntry.student_name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Reg: {selectedDetailEntry.student_registration_no || '—'} · {selectedDetailEntry.student_gender}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs bg-background dark:bg-card border border-border rounded-xl p-3">
                                <div>
                                    <span className="text-muted-foreground">Dojo:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.dojo_name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Coach:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.coach_name || selectedDetailEntry.coach_email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Rank / Belt:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.student_rank || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Weight:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight
                                            ? `${selectedDetailEntry.declared_weight_kg || selectedDetailEntry.student_weight} kg`
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Category:</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {selectedDetailEntry.category_name || 'Standard'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Chest Number:</span>
                                    <p className="font-bold text-primary mt-0.5">
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
                                <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-[#26bfa2] text-white dark:text-primary-foreground font-bold text-xs">
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    Open ID Card Pass
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setDetailDialogOpen(false)}
                            className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
