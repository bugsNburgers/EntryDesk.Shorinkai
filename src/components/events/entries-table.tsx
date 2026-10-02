'use client'

import { useState } from "react"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { EntryApprovalButtons } from "@/components/events/entry-approval-buttons"
import { bulkUpdateEntryStatus } from "@/app/dashboard/events/[id]/entries/actions"
import { Loader2 } from "lucide-react"
import { toast } from "sonner" // Assuming we have sonner or use alert for now
import { getStatusLabel, getStatusBgClass } from "@/lib/status"

interface EntriesTableProps {
    entries: any[]
}

export function EntriesTable({ entries }: EntriesTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    // Derived state
    const allSelected = entries.length > 0 && selectedIds.size === entries.length
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < entries.length

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(entries.map(e => e.id)))
        } else {
            setSelectedIds(new Set())
        }
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

    const handleBulkUpdate = async (status: 'approved' | 'rejected') => {
        if (!confirm(`Are you sure you want to ${status} ${selectedIds.size} entries? , please do verify the belt`)) return

        setIsBulkUpdating(true)
        try {
            await bulkUpdateEntryStatus(Array.from(selectedIds), status)
            setSelectedIds(new Set()) // Clear selection on success
            // toast.success(`Entries ${status}`)
        } catch (e) {
            console.error(e)
            alert('Failed to update entries')
        } finally {
            setIsBulkUpdating(false)
        }
    }

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-4 rounded-md border border-white/[0.06] bg-muted/25 px-3 py-2">
                    <span className="pl-2 text-sm font-medium">{selectedIds.size} selected</span>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleBulkUpdate('approved')} disabled={isBulkUpdating} className="rounded-md bg-emerald-600 hover:bg-emerald-700">
                            {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Approve Selected
                        </Button>
                        <Button size="sm" variant="destructive" className="rounded-md" onClick={() => handleBulkUpdate('rejected')} disabled={isBulkUpdating}>
                            {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Reject Selected
                        </Button>
                    </div>
                </div>
            )}

            <div className="relative w-full overflow-auto rounded-2xl border border-white/[0.06] bg-background/20 dark:bg-white/[0.02]">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="sticky top-0 z-10 bg-muted/35 backdrop-blur-sm [&_tr]:border-b">
                        <tr className="border-b border-white/[0.06] transition-colors hover:bg-muted/45 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle w-[50px]">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(c) => handleSelectAll(!!c)}
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
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Category</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No entries found.
                                </td>
                            </tr>
                        ) : entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-white/[0.05] transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle">
                                    <Checkbox
                                        checked={selectedIds.has(entry.id)}
                                        onCheckedChange={(c) => handleSelectOne(entry.id, !!c)}
                                    />
                                </td>
                                {/* Chest No */}
                                <td className="p-4 align-middle font-bold text-emerald-600 dark:text-emerald-400">
                                    {entry.chest_no || '-'}
                                </td>
                                {/* @ts-ignore */}
                                <td className="p-4 align-middle font-medium">
                                    <div className="flex items-center gap-2.5">
                                        {entry.students?.photo_url ? (
                                            <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-border">
                                                <Image
                                                    src={entry.students.photo_url}
                                                    alt={entry.students.name || ''}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                                {(entry.students?.name || 'A').slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex flex-col">
                                                <span className="truncate">{entry.students?.name}</span>
                                                <span className="text-[10px] font-mono text-muted-foreground">{entry.students?.registration_no}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{entry.profiles?.full_name} (Coach)</div>
                                        </div>
                                    </div>
                                </td>
                                {/* @ts-ignore */}
                                <td className="p-4 align-middle">{entry.students?.dojos?.name}</td>
                                {/* @ts-ignore */}
                                <td className="p-4 align-middle">
                                    {entry.categories?.name ? (
                                        <div className="flex flex-col">
                                            <span>{entry.categories.name}</span>
                                            <span className="text-xs text-muted-foreground">{entry.event_days?.name}</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="p-4 align-middle capitalize">{entry.participation_type}</td>
                                <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBgClass(entry.status)}`}>
                                        {getStatusLabel(entry.status)}
                                    </span>
                                </td>
                                <td className="p-4 align-middle text-right">
                                    <EntryApprovalButtons entryId={entry.id} currentStatus={entry.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
