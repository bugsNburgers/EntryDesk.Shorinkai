'use client'

// Laptop entries card + table — moved verbatim from organiser-entries-list.tsx.

import { SafeAvatar } from '@/components/ui/safe-avatar'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { Check, X, FileText, Hash, User, Clock, Eye } from 'lucide-react'
import { CheckmarkSvg, getAthleteAge, formatBelt, getAppliedTags } from './shared'
import type { OrganiserEntriesListVM } from './use-organiser-entries-list'

export function OrganiserEntriesDesktopTable({ vm }: { vm: OrganiserEntriesListVM }) {
    const { entries, counts, headingInfo, headingColor, filteredEntries, isAllSelected, handleToggleSelectAll, handleToggleSelectOne, handleApproveSingle, handleOpenRejectSingle, handleOpenChestDialog, selectedIds, isActionPending, activeTab, setActiveTab, setDetailDialogOpen, setSelectedDetailEntry } = vm
    return (
        <>
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
                                    <div className="h-full flex items-center gap-2 px-2.5 border-r border-dotted border-border text-[14.5px] text-muted-foreground min-w-0" title={coach}>
                                        <SafeAvatar src={entry.coach_avatar} name={coach} size={26} enlargeable subtitle={entry.coach_email} />
                                        <span className="truncate">{coach}</span>
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
                                                href={`/athlete/entries/${entry.id}/id-card`}
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
                                                            href={`/athlete/entries/${entry.id}/id-card`}
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
        </>
    )
}
