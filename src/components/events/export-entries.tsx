'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import * as XLSX from 'xlsx'
import { exportEventEntries, exportEventForRingFlow } from "@/app/dashboard/events/[id]/entries/actions"
import { RINGFLOW_HEADERS } from "@/lib/export/ringflow"
import { toast } from "sonner"

interface ExportEntriesProps {
    eventId: string;
    searchParams: { q?: string, status?: string, coach?: string, day?: string };
}

function safeFileName(title: string) {
    return title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'event'
}

export function ExportEntries({ eventId, searchParams }: ExportEntriesProps) {
    const [busy, setBusy] = useState<null | 'entries' | 'ringflow'>(null)

    const handleExport = async () => {
        try {
            setBusy('entries')
            const data = await exportEventEntries(eventId, searchParams)

            if (!data || data.length === 0) {
                toast.error("No entries found to export")
                return
            }

            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Entries")
            XLSX.writeFile(wb, "entries_export.xlsx")
            toast.success("Export successful")
        } catch (error) {
            console.error("Export failed:", error)
            toast.error("Failed to export entries")
        } finally {
            setBusy(null)
        }
    }

    // RingFlow official-roster format: approved entries only, one sheet, exact headers.
    const handleRingFlow = async () => {
        try {
            setBusy('ringflow')
            const res = await exportEventForRingFlow(eventId)
            if (res.error) {
                toast.error(res.error)
                return
            }
            const rows = res.rows ?? []
            if (rows.length === 0) {
                toast.error("No approved entries with chest numbers yet")
                return
            }
            const ws = XLSX.utils.json_to_sheet(rows, { header: [...RINGFLOW_HEADERS] })
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Roster")
            XLSX.writeFile(wb, `ringflow_${safeFileName(res.title ?? 'event')}.xlsx`)
            toast.success(`Exported ${rows.length} athletes for RingFlow`)
        } catch (error) {
            console.error("RingFlow export failed:", error)
            toast.error("Failed to export for RingFlow")
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} disabled={busy !== null}>
                {busy === 'entries' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {busy === 'entries' ? "Exporting..." : "Export CSV/Excel"}
            </Button>
            <Button variant="outline" onClick={handleRingFlow} disabled={busy !== null} title="Approved entries in RingFlow's official roster format">
                {busy === 'ringflow' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {busy === 'ringflow' ? "Exporting..." : "Export for RingFlow"}
            </Button>
        </div>
    )
}
