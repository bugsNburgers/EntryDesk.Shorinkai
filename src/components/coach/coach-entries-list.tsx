'use client'

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Trash2, Send, ChevronLeft, ChevronRight, AlertTriangle, Pencil, RotateCcw, XCircle, Check, Search, X } from "lucide-react"
import { bulkSubmitEntries, bulkDeleteEntries } from "@/app/dashboard/entries/actions"
import {
    coachForwardEntry,
    coachBulkForwardEntries,
    coachRequestCorrection,
    coachDeclineEntry,
} from "@/app/dashboard/parent-entries/actions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { StudentDialog } from "@/components/students/student-dialog"
import { isSimpleEntryEventType } from '@/lib/events/type'
import { updateEntryGenericChecked } from "@/app/dashboard/entries/actions"
import { IdCardDownload } from "@/components/id-card/id-card-download"

interface CoachEntriesListProps {
    entries: any[]
    eventDays: any[]
    dojos: any[]
    eventType?: string | null
    statusPreset?: string
    onStatusChange?: (status: string) => void
    isReadOnly?: boolean
}

const ITEMS_PER_PAGE = 50

export function CoachEntriesList({
    entries,
    eventDays,
    dojos,
    eventType,
    statusPreset,
    onStatusChange,
    isReadOnly = false
}: CoachEntriesListProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [editingEntry, setEditingEntry] = useState<any>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Parent review actions state
    const [actionEntryId, setActionEntryId] = useState<string | null>(null)
    const [correctionTarget, setCorrectionTarget] = useState<any>(null)
    const [correctionNotes, setCorrectionNotes] = useState('')
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false)
    const [declineTarget, setDeclineTarget] = useState<any>(null)
    const [declineReason, setDeclineReason] = useState('')
    const [isSubmittingDecline, setIsSubmittingDecline] = useState(false)

    const [genericCheckedMap, setGenericCheckedMap] = useState<Record<string, boolean>>(() => {
        const map: Record<string, boolean> = {}
        for (const entry of entries) {
            map[entry.id] = !!entry.generic_checked
        }
        return map
    })

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState(statusPreset || 'pending_submission')
    const [beltFilter, setBeltFilter] = useState('all')
    const [dayFilter, setDayFilter] = useState('all')
    const [dojoFilter, setDojoFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [page, setPage] = useState(1)
    const isSimpleEntryEvent = isSimpleEntryEventType(eventType)

    useEffect(() => {
        if (!statusPreset) return

        setStatusFilter(statusPreset)
        setPage(1)
        setSelectedIds(new Set())
    }, [statusPreset])

    // Derived filter options
    const uniqueRanks = Array.from(
        new Set(entries.map((e) => e.students?.rank).filter(Boolean))
    ).sort()

    const dojoNameById = useMemo(() => {
        const map = new Map<string, string>()
        dojos.forEach((dojo) => {
            if (dojo?.id && dojo?.name) {
                map.set(String(dojo.id), dojo.name)
            }
        })
        return map
    }, [dojos])

    const getDojoName = (entry: any) => {
        const joinedDojoName = entry.students?.dojos?.name
        if (joinedDojoName) return String(joinedDojoName)

        const dojoId = entry.students?.dojo_id
        if (!dojoId) return ''

        return dojoNameById.get(String(dojoId)) || ''
    }

    const getDojoId = (entry: any) => {
        const joinedDojoId = entry.students?.dojos?.id
        if (joinedDojoId) return String(joinedDojoId)

        const dojoId = entry.students?.dojo_id
        if (!dojoId) return ''

        return String(dojoId)
    }

    const dojoFilterOptions = useMemo(() => {
        const uniqueDojos = new Map<string, string>()

        entries.forEach((entry) => {
            const dojoId = getDojoId(entry)
            const dojoName = getDojoName(entry)
            if (dojoId && dojoName) {
                uniqueDojos.set(dojoId, dojoName)
            }
        })

        return Array.from(uniqueDojos.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [entries, dojos])

    useEffect(() => {
        if (dojoFilter === 'all') return
        const hasSelectedDojo = dojoFilterOptions.some((dojo) => dojo.id === dojoFilter)
        if (!hasSelectedDojo) {
            setDojoFilter('all')
            setPage(1)
        }
    }, [dojoFilter, dojoFilterOptions])

    // Filter Counts
    const pendingSubmissionCount = useMemo(() => {
        return entries.filter(e => e.status === 'draft' || e.status === 'pending_coach' || e.status === 'correction_needed').length
    }, [entries])

    const pendingReviewCount = useMemo(() => {
        return entries.filter(e => e.status === 'pending_coach' || e.status === 'correction_needed').length
    }, [entries])

    const submittedCount = useMemo(() => {
        return entries.filter(e => e.status === 'submitted').length
    }, [entries])

    const approvedCount = useMemo(() => {
        return entries.filter(e => e.status === 'approved').length
    }, [entries])

    const rejectedCount = useMemo(() => {
        return entries.filter(e => e.status === 'rejected' || e.status === 'coach_declined').length
    }, [entries])

    const unpaidCount = useMemo(() => {
        return entries.filter(e => {
            const isPaid = genericCheckedMap[e.id] ?? !!e.generic_checked
            return !isPaid
        }).length
    }, [entries, genericCheckedMap])

    const statusTabs = useMemo(() => {
        return [
            {
                id: 'pending_submission',
                label: 'Not Submitted',
                count: pendingSubmissionCount,
                isRed: pendingSubmissionCount > 0,
                isGreen: pendingSubmissionCount === 0,
                isDanger: false,
            },
            { id: 'all', label: 'All', count: entries.length, isRed: false, isGreen: false, isDanger: false },
            { id: 'submitted', label: 'Under Review', count: submittedCount, isRed: false, isGreen: false, isDanger: false },
            { id: 'approved', label: 'Approved', count: approvedCount, isRed: false, isGreen: false, isDanger: false },
            { id: 'rejected', label: 'Rejected', count: rejectedCount, isRed: false, isGreen: false, isDanger: rejectedCount > 0 },
        ]
    }, [pendingSubmissionCount, entries.length, submittedCount, approvedCount, rejectedCount])

    const currentHeading = useMemo(() => {
        switch (statusFilter) {
            case 'pending_submission':
            case 'draft':
            case 'pending_coach':
                return {
                    title: `Not Submitted (${pendingSubmissionCount})`,
                    subtitle: pendingSubmissionCount === 0
                        ? 'All team entries have been submitted to the organiser.'
                        : 'Entries created or saved that need to be sent to organiser.',
                    isRed: pendingSubmissionCount > 0,
                    isGreen: pendingSubmissionCount === 0,
                }
            case 'submitted':
                return {
                    title: `Under Review (${submittedCount})`,
                    subtitle: 'Entries submitted to tournament organiser awaiting review.',
                    isRed: false,
                    isGreen: false,
                }
            case 'approved':
                return {
                    title: `Approved Entries (${approvedCount})`,
                    subtitle: 'Athletes officially accepted and registered for the tournament.',
                    isRed: false,
                }
            case 'rejected':
                return {
                    title: `Rejected Entries (${rejectedCount})`,
                    subtitle: 'Entries declined or requiring correction from organiser.',
                    isRed: false,
                }
            case 'all':
            default:
                return {
                    title: `All Entries (${entries.length})`,
                    subtitle: 'Manage all team athletes.',
                    isRed: false,
                }
        }
    }, [statusFilter, pendingSubmissionCount, submittedCount, approvedCount, rejectedCount, entries.length])

    const hasActiveFilters = searchQuery !== '' || beltFilter !== 'all' || dayFilter !== 'all' || dojoFilter !== 'all' || paymentFilter !== 'all'

    const handleResetFilters = () => {
        setSearchQuery('')
        setBeltFilter('all')
        setDayFilter('all')
        setDojoFilter('all')
        setPaymentFilter('all')
        setPage(1)
    }

    // Filter Logic
    const filteredEntries = entries.filter(e => {
        const matchesSearch = (e.students?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'pending_submission'
                ? (e.status === 'draft' || e.status === 'pending_coach' || e.status === 'correction_needed')
                : statusFilter === 'draft'
                    ? (e.status === 'draft')
                    : statusFilter === 'pending_coach'
                        ? (e.status === 'pending_coach' || e.status === 'correction_needed')
                        : statusFilter === 'submitted'
                            ? (e.status === 'submitted')
                            : statusFilter === 'approved'
                                ? (e.status === 'approved')
                                : statusFilter === 'rejected'
                                    ? (e.status === 'rejected' || e.status === 'coach_declined')
                                    : e.status === statusFilter
        const matchesBelt = beltFilter === 'all' || e.students?.rank === beltFilter
        const matchesDay = isSimpleEntryEvent || dayFilter === 'all' || e.event_day_id === dayFilter
        const matchesDojo = dojoFilter === 'all' || getDojoId(e) === dojoFilter
        
        const isPaid = genericCheckedMap[e.id] ?? !!e.generic_checked
        const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' && isPaid) || (paymentFilter === 'unpaid' && !isPaid)
        
        return matchesSearch && matchesStatus && matchesBelt && matchesDay && matchesDojo && matchesPayment
    })

    // Pagination Logic
    const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE)
    const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages))
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE
    const paginatedEntries = filteredEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    // Selection Logic
    const isAllSelected = filteredEntries.length > 0 && filteredEntries.every(e => selectedIds.has(e.id))
    const isIndeterminate = selectedIds.size > 0 && !isAllSelected

    const handleSelectAll = (checked: boolean) => {
        const next = new Set(selectedIds)
        if (checked) {
            filteredEntries.forEach(e => next.add(e.id))
        } else {
            filteredEntries.forEach(e => next.delete(e.id))
        }
        setSelectedIds(next)
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

    const handleForwardSingle = async (entryId: string) => {
        setActionEntryId(entryId)
        try {
            const res = await coachForwardEntry(entryId)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Entry approved & forwarded to organiser!')
                router.refresh()
            }
        } catch {
            toast.error('Failed to forward entry')
        } finally {
            setActionEntryId(null)
        }
    }

    const handleBulkForward = async () => {
        const pendingSelected = Array.from(selectedIds).filter((id) => {
            const entry = entries.find((e) => e.id === id)
            return entry && (entry.status === 'pending_coach' || entry.status === 'correction_needed')
        })
        if (pendingSelected.length === 0) return
        if (!confirm(`Forward ${pendingSelected.length} entries to the organiser?`)) return
        setIsSubmitting(true)
        try {
            const res = await coachBulkForwardEntries(pendingSelected)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Forwarded ${res.count ?? pendingSelected.length} entries to organiser!`)
                setSelectedIds(new Set())
                router.refresh()
            }
        } catch {
            toast.error('Failed to forward entries')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCorrectionSubmit = async () => {
        if (!correctionTarget) return
        if (!correctionNotes.trim()) {
            toast.error('Please enter notes explaining the correction needed')
            return
        }
        setIsSubmittingCorrection(true)
        try {
            const res = await coachRequestCorrection(correctionTarget.id, correctionNotes.trim())
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Correction request sent to parent.')
                setCorrectionTarget(null)
                setCorrectionNotes('')
                router.refresh()
            }
        } catch {
            toast.error('Failed to request correction')
        } finally {
            setIsSubmittingCorrection(false)
        }
    }

    const handleDeclineSubmit = async () => {
        if (!declineTarget) return
        if (!declineReason.trim()) {
            toast.error('Please enter a reason for declining')
            return
        }
        setIsSubmittingDecline(true)
        try {
            const res = await coachDeclineEntry(declineTarget.id, declineReason.trim())
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Entry declined.')
                setDeclineTarget(null)
                setDeclineReason('')
                router.refresh()
            }
        } catch {
            toast.error('Failed to decline entry')
        } finally {
            setIsSubmittingDecline(false)
        }
    }

    const handleSubmit = async () => {
        if (!confirm(`Submit ${selectedIds.size} entries?`)) return
        setIsSubmitting(true)
        try {
            const result = await bulkSubmitEntries(Array.from(selectedIds))
            if (result?.success === false && result?.message) {
                alert(result.message)
                return
            }
            setSelectedIds(new Set())
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to submit'
            alert(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} entries? This cannot be undone.`)) return
        setIsDeleting(true)
        try {
            await bulkDeleteEntries(Array.from(selectedIds))
            setSelectedIds(new Set())
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete'
            alert(message)
        } finally {
            setIsDeleting(false)
        }
    }

    const getMissingFields = (student: any) => {
        if (!student) return []
        const missing = []
        if (!student.rank) missing.push('Rank')
        if (!student.date_of_birth) missing.push('DOB')
        if (!student.gender) missing.push('Gender')
        return missing
    }

    const startEdit = (entry: any) => {
        setEditingStudent(entry.students)
        setEditingEntry(entry)
        setDialogOpen(true)
    }

    const handleToggleGeneric = async (entryId: string, checked: boolean) => {
        const previous = genericCheckedMap[entryId] ?? false
        setGenericCheckedMap((prev) => ({ ...prev, [entryId]: checked }))

        try {
            await updateEntryGenericChecked(entryId, checked, entries[0]?.event_id)
        } catch (error) {
            setGenericCheckedMap((prev) => ({ ...prev, [entryId]: previous }))
            alert('Failed to save payment status')
        }
    }

    return (
        <div className="space-y-4">
            {!isReadOnly && (
                <StudentDialog
                    dojos={dojos}
                    student={editingStudent}
                    entry={editingEntry}
                    eventDays={eventDays}
                    eventType={eventType}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    showTrigger={false}
                />
            )}

            {/* View Switcher Tabs & Controls Toolbar */}
            <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-4 space-y-3.5 shadow-xs">
                {/* 1. Status View Switcher Tabs (Executive Underline Tab Bar) */}
                <div className="flex items-center gap-1 sm:gap-2 border-b border-border/60 overflow-x-auto scrollbar-none px-1">
                    {statusTabs.map((tab) => {
                        const isActive = statusFilter === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(tab.id)
                                    setPage(1)
                                    setSelectedIds(new Set())
                                    onStatusChange?.(tab.id)
                                }}
                                className={cn(
                                    "group relative pb-3 pt-1 px-3 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none",
                                    tab.isGreen
                                        ? isActive
                                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                            : "text-emerald-600/85 hover:text-emerald-600 dark:text-emerald-400/85 dark:hover:text-emerald-300 font-semibold"
                                        : tab.isRed
                                            ? isActive
                                                ? "text-rose-600 dark:text-rose-400 font-bold"
                                                : "text-rose-500/85 hover:text-rose-600 dark:text-rose-400/85 dark:hover:text-rose-300 font-semibold"
                                            : isActive
                                                ? "text-primary font-bold"
                                                : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="tabular-nums">
                                    {tab.label} - {tab.count}
                                </span>

                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <span
                                        className={cn(
                                            "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                                            tab.isGreen
                                                ? "bg-emerald-500 shadow-[0_1px_4px_rgba(16,185,129,0.5)]"
                                                : tab.isRed
                                                    ? "bg-rose-500 shadow-[0_1px_4px_rgba(244,63,94,0.5)]"
                                                    : "bg-primary shadow-[0_1px_4px_rgba(var(--primary-rgb),0.5)]"
                                        )}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* 2. Secondary Filter Bar: Search + Granular Chips + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                    {/* Left: Search Athlete */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                        <Input
                            placeholder="Search athlete by name..."
                            className="h-8.5 pl-9 pr-8 text-xs rounded-xl bg-background/70 border-border/70 focus:border-primary"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setPage(1); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Middle: Secondary Filter Chips (Fee, Belt, Dojo, Day) */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Fee Filter Chip */}
                        {!isReadOnly && (
                            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
                                <SelectTrigger className={cn(
                                    "h-8 w-auto min-w-[95px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
                                    paymentFilter !== 'all'
                                        ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                        : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                )}>
                                    <span className="text-muted-foreground font-normal">Fee:</span>
                                    <span className="font-semibold">
                                        {paymentFilter === 'all' ? 'All' : paymentFilter === 'paid' ? 'Paid' : `Unpaid (${unpaidCount})`}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fees</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid ({unpaidCount})</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {/* Belt Filter Chip */}
                        <Select value={beltFilter} onValueChange={(v) => { setBeltFilter(v); setPage(1); }}>
                            <SelectTrigger className={cn(
                                "h-8 w-auto min-w-[95px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
                                beltFilter !== 'all'
                                    ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                    : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            )}>
                                <span className="text-muted-foreground font-normal">Belt:</span>
                                <span className="font-semibold">{beltFilter === 'all' ? 'All' : beltFilter}</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Belts</SelectItem>
                                {uniqueRanks.map((r) => (
                                    <SelectItem key={r} value={r as string}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Dojo Filter Chip */}
                        {dojoFilterOptions.length > 1 && (
                            <Select value={dojoFilter} onValueChange={(v) => { setDojoFilter(v); setPage(1); }}>
                                <SelectTrigger className={cn(
                                    "h-8 w-auto min-w-[105px] max-w-[180px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
                                    dojoFilter !== 'all'
                                        ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                        : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                )}>
                                    <span className="text-muted-foreground font-normal">Dojo:</span>
                                    <span className="font-semibold truncate">
                                        {dojoFilter === 'all' ? 'All' : dojoFilterOptions.find(d => String(d.id) === dojoFilter)?.name || 'Dojo'}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Dojos</SelectItem>
                                    {dojoFilterOptions.map((dojo) => (
                                        <SelectItem key={dojo.id} value={String(dojo.id)}>{dojo.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Event Day Filter Chip */}
                        {!isSimpleEntryEvent && eventDays && eventDays.length > 0 && (
                            <Select value={dayFilter} onValueChange={(v) => { setDayFilter(v); setPage(1); }}>
                                <SelectTrigger className={cn(
                                    "h-8 w-auto min-w-[95px] text-xs font-medium rounded-lg px-2.5 py-1 gap-1.5 transition-all",
                                    dayFilter !== 'all'
                                        ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                        : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                )}>
                                    <span className="text-muted-foreground font-normal">Day:</span>
                                    <span className="font-semibold">
                                        {dayFilter === 'all' ? 'All' : eventDays.find(d => d.id === dayFilter)?.name || 'Day'}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Days</SelectItem>
                                    {eventDays.map(d => {
                                        const dateStr = d.date ? (typeof d.date === 'string' ? d.date.slice(0, 10) : new Date(d.date).toISOString().slice(0, 10)) : ''
                                        return (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.name ? `${d.name} (${dateStr})` : dateStr || 'Day'}
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="h-8 px-2.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Right: Bulk Action Controls or Counter */}
                    <div className="flex items-center gap-2 ml-auto">
                        {!isReadOnly && selectedIds.size > 0 ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/25">
                                    {selectedIds.size} selected
                                </span>
                                {Array.from(selectedIds).some((id) => {
                                    const entry = entries.find((e) => e.id === id)
                                    return entry && (entry.status === 'pending_coach' || entry.status === 'correction_needed')
                                }) && (
                                    <Button size="sm" className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleBulkForward} disabled={isSubmitting || isDeleting}>
                                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                                        Forward
                                    </Button>
                                )}
                                {Array.from(selectedIds).some((id) => entries.find((e) => e.id === id)?.status === 'draft') && (
                                    <Button size="sm" className="h-8 text-xs rounded-lg" onClick={handleSubmit} disabled={isSubmitting || isDeleting}>
                                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                                        Submit
                                    </Button>
                                )}
                                <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg" onClick={handleDelete} disabled={isSubmitting || isDeleting}>
                                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                                    Delete
                                </Button>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground hidden sm:block">
                                Showing <span className="font-semibold text-foreground">{filteredEntries.length}</span> of {entries.length} athletes
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dynamic View Header — Directly precedes and identifies the data table below */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1 pt-1 pb-0.5">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className={cn(
                        "text-base sm:text-lg font-bold tracking-tight transition-colors",
                        currentHeading.isGreen
                            ? "text-emerald-600 dark:text-emerald-400"
                            : currentHeading.isRed
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-foreground"
                    )}>
                        {currentHeading.title}
                    </h4>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        — {currentHeading.subtitle}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filteredEntries.length}</span> of {entries.length} athletes
                </div>
            </div>

            <div className="relative w-full min-h-[300px] overflow-auto rounded-2xl border border-white/[0.06] bg-background/20 dark:bg-white/[0.02]">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="sticky top-0 z-10 bg-muted/35 backdrop-blur-sm [&_tr]:border-b">
                        <tr className="border-b border-white/[0.06] transition-colors hover:bg-muted/45 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle w-[50px]">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={(c) => handleSelectAll(!!c)}
                                    disabled={isReadOnly}
                                    ref={input => {
                                        if (input) {
                                            // @ts-ignore
                                            input.indeterminate = isIndeterminate
                                        }
                                    }}
                                />
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[80px]">Chest</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Student</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Dojo</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Belt</th>
                            {!isSimpleEntryEvent && <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Day</th>}
                            {!isSimpleEntryEvent && <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>}
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                            {!isReadOnly && <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[90px]">Payment</th>}
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[120px]">Card</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {paginatedEntries.length === 0 ? (
                            <tr>
                                <td colSpan={isSimpleEntryEvent ? (isReadOnly ? 7 : 8) : (isReadOnly ? 9 : 10)} className="h-32 text-center text-muted-foreground p-6">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <p className="text-sm font-medium">
                                            {statusFilter === 'pending_submission' && entries.length > 0
                                                ? "No unsubmitted entries. All team athletes have been sent to organiser or approved."
                                                : statusFilter === 'rejected' && entries.length > 0
                                                    ? "No rejected entries. All team athletes are in good standing."
                                                    : filteredEntries.length === 0
                                                        ? "No entries match your filters."
                                                        : "No active entries. Go to 'Register' tab to add students."}
                                        </p>
                                        {statusFilter !== 'all' && entries.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-1 h-7 text-xs rounded-lg font-semibold"
                                                onClick={() => {
                                                    setStatusFilter('all')
                                                    onStatusChange?.('all')
                                                }}
                                            >
                                                View All Entries ({entries.length})
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedEntries.map((entry) => {
                            const missing = getMissingFields(entry.students)
                            const isEditable = !isReadOnly && entry.status === 'draft'
                            return (
                                <tr key={entry.id} className="border-b border-white/[0.05] transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted">
                                    <td className="p-4 align-middle">
                                        <Checkbox
                                            checked={selectedIds.has(entry.id)}
                                            onCheckedChange={(c) => handleSelectOne(entry.id, !!c)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    {/* Chest No */}
                                    <td className="p-4 align-middle font-bold text-emerald-600 dark:text-emerald-400">
                                        {entry.chest_no || '-'}
                                    </td>
                                    {/* Student */}
                                    {/* @ts-ignore */}
                                    <td className="p-4 align-middle font-medium">
                                        <div className="flex items-center gap-2">
                                            {/* Photo thumbnail */}
                                            {entry.students?.photo_url ? (
                                                <div className="relative h-7 w-7 rounded-full overflow-hidden shrink-0 border border-border">
                                                    <Image
                                                        src={entry.students.photo_url}
                                                        alt={entry.students.name || ''}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
                                                    {(entry.students?.name || 'A').slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                            {missing.length > 0 && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Missing: {missing.join(', ')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span>{entry.students?.name}</span>
                                                    {(entry.submitted_by || entry.students?.parent_id) && (
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                            Parent Entry
                                                        </span>
                                                    )}
                                                    {!isReadOnly && isEditable && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground"
                                                            onClick={() => startEdit(entry)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {entry.parent_name && (
                                                    <span className="text-[11px] text-muted-foreground font-normal">
                                                        Parent: {entry.parent_name} {entry.parent_phone ? `(${entry.parent_phone})` : ''}
                                                    </span>
                                                )}
                                                {entry.category_name && (
                                                    <span className="text-[11px] text-muted-foreground font-normal">
                                                        Category: {entry.category_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Dojo */}
                                    <td className="p-4 align-middle">{getDojoName(entry) || '-'}</td>

                                    {/* Belt */}
                                    <td className="p-4 align-middle capitalize">{entry.students?.rank || '-'}</td>

                                    {!isSimpleEntryEvent && (
                                        <>
                                            {/* Day */}
                                            {/* @ts-ignore */}
                                            <td className="p-4 align-middle">{entry.event_days?.name || '-'}</td>

                                            {/* Type */}
                                            <td className="p-4 align-middle capitalize">{entry.participation_type || '-'}</td>
                                        </>
                                    )}

                                    {/* Status */}
                                    <td className="p-4 align-middle">
                                        {entry.status === 'pending_coach' ? (
                                            <div className="flex flex-col gap-1.5 min-w-[140px]">
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60 w-fit">
                                                    Pending Review
                                                </span>
                                                {!isReadOnly && (
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 px-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800"
                                                                        onClick={() => handleForwardSingle(entry.id)}
                                                                        disabled={actionEntryId === entry.id}
                                                                    >
                                                                        {actionEntryId === entry.id ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                                                Forward
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Approve & forward to tournament organiser</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                                                                        onClick={() => {
                                                                            setCorrectionTarget(entry)
                                                                            setCorrectionNotes(entry.coach_notes || '')
                                                                        }}
                                                                    >
                                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Request correction from parent</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                                        onClick={() => {
                                                                            setDeclineTarget(entry)
                                                                            setDeclineReason('')
                                                                        }}
                                                                    >
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Decline entry</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                )}
                                            </div>
                                        ) : entry.status === 'correction_needed' ? (
                                            <div className="flex flex-col gap-1 min-w-[130px]">
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/60 w-fit">
                                                    Needs Correction
                                                </span>
                                                {entry.coach_notes && (
                                                    <span className="text-[11px] text-muted-foreground line-clamp-1" title={entry.coach_notes}>
                                                        {entry.coach_notes}
                                                    </span>
                                                )}
                                                {!isReadOnly && (
                                                    <Button
                                                        size="sm"
                                                        variant="link"
                                                        className="h-auto p-0 text-xs text-primary justify-start"
                                                        onClick={() => handleForwardSingle(entry.id)}
                                                        disabled={actionEntryId === entry.id}
                                                    >
                                                        Forward now →
                                                    </Button>
                                                )}
                                            </div>
                                        ) : entry.status === 'rejected' ? (
                                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60 w-fit">
                                                    <XCircle className="h-3 w-3 text-rose-500" />
                                                    Rejected by Organiser
                                                </span>
                                                {entry.rejection_reason && (
                                                    <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1.5 leading-snug">
                                                        <span className="font-bold">Reason:</span> {entry.rejection_reason}
                                                    </p>
                                                )}
                                                {!isReadOnly && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2.5 text-xs font-semibold rounded-lg border-primary/40 text-primary hover:bg-primary/10 gap-1 w-fit mt-0.5"
                                                        onClick={() => startEdit(entry)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                        Edit & Resubmit
                                                    </Button>
                                                )}
                                            </div>
                                        ) : entry.status === 'coach_declined' ? (
                                            <div className="flex flex-col gap-1 min-w-[130px]">
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 w-fit">
                                                    Declined by Coach
                                                </span>
                                                {entry.rejection_reason && (
                                                    <span className="text-[11px] text-muted-foreground line-clamp-1" title={entry.rejection_reason}>
                                                        {entry.rejection_reason}
                                                    </span>
                                                )}
                                            </div>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60 w-fit">
                                                Submitted
                                            </span>
                                        ) : entry.status === 'approved' ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60 w-fit">
                                                Approved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60 w-fit">
                                                Draft
                                            </span>
                                        )}
                                    </td>
                                    
                                    {/* Payment Checkbox */}
                                    {!isReadOnly && (
                                        <td className="p-4 align-middle">
                                            <Checkbox
                                                checked={!!genericCheckedMap[entry.id]}
                                                onCheckedChange={(c) => handleToggleGeneric(entry.id, !!c)}
                                            />
                                        </td>
                                    )}

                                    {/* ID Card Download */}
                                    <td className="p-4 align-middle">
                                        {entry.status === 'approved' ? (
                                            <IdCardDownload
                                                entryId={entry.id}
                                                size="sm"
                                                variant="ghost"
                                                label="ID Card"
                                            />
                                        ) : (
                                            <span className="text-xs text-muted-foreground/40">—</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] px-3 py-2">
                    <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredEntries.length)} of {filteredEntries.length}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium">
                            Page {safePage} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Request Correction Dialog */}
            <Dialog open={!!correctionTarget} onOpenChange={(open) => !open && setCorrectionTarget(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Request Correction</DialogTitle>
                        <DialogDescription>
                            Send a note to the parent explaining what needs to be fixed (e.g. upload clear photo, update weight, verify belt rank).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="correction-notes">Notes for Parent</Label>
                        <Textarea
                            id="correction-notes"
                            placeholder="e.g. Please update student photo with face clearly visible and white background."
                            value={correctionNotes}
                            onChange={(e) => setCorrectionNotes(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCorrectionTarget(null)} disabled={isSubmittingCorrection}>
                            Cancel
                        </Button>
                        <Button onClick={handleCorrectionSubmit} disabled={isSubmittingCorrection || !correctionNotes.trim()}>
                            {isSubmittingCorrection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send to Parent
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Decline Dialog */}
            <Dialog open={!!declineTarget} onOpenChange={(open) => !open && setDeclineTarget(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Decline Entry</DialogTitle>
                        <DialogDescription>
                            Provide a reason for declining this tournament application. The parent will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="decline-reason">Reason</Label>
                        <Textarea
                            id="decline-reason"
                            placeholder="e.g. Athlete not eligible for this division or coach quota full."
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeclineTarget(null)} disabled={isSubmittingDecline}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeclineSubmit} disabled={isSubmittingDecline || !declineReason.trim()}>
                            {isSubmittingDecline && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Decline Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
