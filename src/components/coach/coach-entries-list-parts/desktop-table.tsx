'use client'

// Laptop entries card + table — moved verbatim from coach-entries-list.tsx.

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'
import { CheckmarkSvg, PillCheckmarkSvg, MenuDownloadSvg, MenuLockSvg, MenuRejectSvg, getAthleteAge, formatBelt, getAppliedTags } from './shared'
import type { CoachEntriesListVM } from './use-coach-entries-list'

export function CoachEntriesDesktopTable({ vm }: { vm: CoachEntriesListVM }) {
    const { onStatusChange, effectiveFilter, getDojo, filteredEntries, tabCounts, headingInfo, headingColor, selectableEntries, isAllSelected, handleToggleSelect, handleToggleSelectAll, handleTogglePaid, handleMarkAllPaid, entries, selectedIds, genericCheckedMap, setStatusFilter, setRejectDialogOpen, setEntryToReject } = vm
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
                                        ? 'bg-white dark:bg-[#17243c] text-foreground font-bold shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                    badgeClasses = isActive
                                        ? 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary'
                                        : 'bg-black/5 dark:bg-white/10 text-muted-foreground'
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
                        className="bg-muted dark:bg-card border-b border-border text-muted-foreground text-[11px] font-bold uppercase tracking-wider"
                    >
                        {/* Select All Checkbox */}
                        <div className="h-full flex items-center justify-center border-r border-dotted border-border px-2">
                            <span
                                onClick={selectableEntries.length > 0 ? handleToggleSelectAll : undefined}
                                title={selectableEntries.length === 0 ? 'No selectable entries' : isAllSelected ? 'Deselect all' : 'Select all'}
                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition ${
                                    selectableEntries.length === 0
                                        ? 'opacity-30 cursor-not-allowed border-border bg-transparent'
                                        : isAllSelected
                                        ? 'bg-primary border-primary cursor-pointer'
                                        : 'border-border bg-white dark:bg-transparent hover:border-primary/60 cursor-pointer'
                                }`}
                            >
                                {isAllSelected && selectableEntries.length > 0 && <CheckmarkSvg />}
                            </span>
                        </div>

                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Chest</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Athlete</div>
                        <div className="h-full flex items-center justify-center px-1 border-r border-dotted border-border">Age</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Dojo</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Belt</div>
                        <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">Weight</div>
                        <div className="h-full flex items-center px-2 border-r border-dotted border-border">Events applied</div>

                        {/* Payment Header with Mark all Pill */}
                        <div className="h-full flex items-center justify-between px-3 border-r border-dotted border-border">
                            <span>Payment</span>
                            <button
                                onClick={handleMarkAllPaid}
                                className="h-6 px-2.5 rounded-full border border-primary text-primary text-[10.5px] font-bold inline-flex items-center gap-1 hover:bg-primary/10 cursor-pointer transition whitespace-nowrap"
                            >
                                <PillCheckmarkSvg />
                                Mark all
                            </button>
                        </div>

                        <div className="h-full flex items-center justify-start px-4 text-left">Action</div>
                    </div>

                    {/* Table Body Rows (82px spacious height, light dotted column dividers) */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground space-y-3">
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
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-muted dark:bg-border text-foreground hover:bg-border cursor-pointer transition"
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
                                    className={`border-b border-border transition-colors ${
                                        isSelected
                                            ? 'bg-primary/10 dark:bg-[rgba(45,212,180,0.07)]'
                                            : 'bg-card hover:bg-background dark:hover:bg-muted'
                                    }`}
                                >
                                    {/* Col 1: Checkbox (Disabled if approved) */}
                                    <div className="h-full flex items-center justify-center border-r border-dotted border-border px-2">
                                        {entry.status === 'approved' ? (
                                            <span
                                                title="Approved athletes cannot be selected"
                                                className="w-5 h-5 rounded-[6px] border border-border/80 dark:border-border bg-muted/40 dark:bg-white/5 opacity-30 cursor-not-allowed flex items-center justify-center select-none"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => handleToggleSelect(entry.id)}
                                                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center cursor-pointer transition ${
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border bg-white dark:bg-transparent hover:border-primary/60'
                                                } ${isLocked ? 'opacity-35' : ''}`}
                                            >
                                                {isSelected && <CheckmarkSvg />}
                                            </span>
                                        )}
                                    </div>

                                    {/* Col 2: Chest Number */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border">
                                        {entry.chest_no ? (
                                            <span className="text-[16px] font-bold text-primary tracking-tight">
                                                #{String(entry.chest_no).padStart(3, '0')}
                                            </span>
                                        ) : (
                                            <span className="text-[17px] text-muted-foreground">—</span>
                                        )}
                                    </div>

                                    {/* Col 3: Athlete Info (46px avatar with verified badge) */}
                                    <div className="h-full flex items-center gap-3 px-2.5 border-r border-dotted border-border min-w-0">
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
                                            <div className="text-[15.5px] font-bold text-foreground truncate">
                                                {entry.students?.name || 'Athlete'}
                                            </div>
                                            <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                                                {entry.parent_email || entry.students?.phone || 'athlete@email.com'}
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

                                    {/* Col 6: Belt */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border text-[14.5px] font-semibold text-foreground truncate">
                                        {rank}
                                    </div>

                                    {/* Col 7: Weight */}
                                    <div className="h-full flex items-center px-2.5 border-r border-dotted border-border text-[14.5px] font-semibold text-foreground">
                                        {weight !== '—' ? `${weight} kg` : '—'}
                                    </div>

                                    {/* Col 8: Events Applied Tags (2 rows up and down) */}
                                    <div className="h-full flex items-center px-2 border-r border-dotted border-border overflow-hidden">
                                        <div className="grid grid-cols-2 gap-1 w-full max-w-[155px]">
                                            {tags.map((t, idx) => {
                                                const isDay = t.toLowerCase().startsWith('day')
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`text-[10px] sm:text-[10.5px] font-semibold rounded-md px-1 py-0.5 text-center truncate leading-tight whitespace-nowrap ${
                                                            isDay
                                                                ? 'bg-primary/12 text-primary dark:bg-primary/18 dark:text-primary border border-primary/30 dark:border-primary/35 font-bold'
                                                                : 'bg-muted text-muted-foreground dark:text-foreground border border-border dark:border-transparent'
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
                                    <div className="h-full flex items-center px-3 border-r border-dotted border-border">
                                        <div
                                            onClick={() => handleTogglePaid(entry)}
                                            className={`h-10 px-3.5 rounded-[10px] text-[13.5px] font-semibold inline-flex items-center gap-2.5 transition select-none cursor-pointer w-full ${
                                                isPaid
                                                    ? 'bg-primary/12 dark:bg-[rgba(45,212,180,0.14)] border-[1.5px] border-primary text-primary font-bold'
                                                    : 'bg-white dark:bg-transparent border-[1.5px] border-border text-muted-foreground dark:text-foreground hover:border-primary/50'
                                            } ${isLocked ? 'opacity-55 cursor-default' : ''}`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition shrink-0 ${
                                                    isPaid
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border'
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
                                            <span className="text-[13.5px] font-semibold text-primary inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#2dd4b4" strokeWidth="2.2" strokeLinecap="round" />
                                                </svg>
                                                Approved
                                            </span>
                                        ) : entry.status === 'submitted' ? (
                                            <span className="text-[13.5px] font-semibold text-muted-foreground inline-flex items-center gap-1.5 whitespace-nowrap">
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
                                            <span className="text-[13.5px] font-semibold text-muted-foreground inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#8a99ab" strokeWidth="1.6">
                                                    <circle cx="7" cy="7" r="5" />
                                                </svg>
                                                Not forwarded
                                            </span>
                                        )}

                                        {/* Three-dot Button (CoachMenu.dc.html: 40x40 rounded-[10px] border border-border) */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="w-10 h-10 rounded-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary inline-flex items-center justify-center text-lg font-bold tracking-widest transition cursor-pointer shrink-0"
                                                    aria-label="Row menu"
                                                >
                                                    ···
                                                </button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-60 bg-muted border border-border text-foreground rounded-xl shadow-xl p-1.5 z-50"
                                            >
                                                {/* Download ID Card */}
                                                {entry.status === 'approved' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(`/athlete/entries/${entry.id}/id-card`, '_blank')
                                                        }
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background dark:hover:bg-border rounded-lg cursor-pointer transition"
                                                    >
                                                        <span className="text-primary flex">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs">
                                                                Download ID card
                                                            </div>
                                                            <div className="text-muted-foreground text-[10.5px]">
                                                                PDF · Chest #{entry.chest_no ? String(entry.chest_no).padStart(3, '0') : '001'}
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div className="flex items-center gap-2.5 px-3 py-2 cursor-not-allowed select-none opacity-50">
                                                        <span className="flex text-muted-foreground">
                                                            <MenuDownloadSvg />
                                                        </span>
                                                        <div>
                                                            <div className="font-semibold text-xs text-muted-foreground">
                                                                Download ID card
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                                                                <MenuLockSvg />
                                                                Not generated yet
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="h-[1px] bg-border my-1" />

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
        </>
    )
}
