'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import * as XLSX from 'xlsx'
import { exportEventEntries } from "@/app/dashboard/events/[id]/entries/actions"
import { toast } from "sonner"

interface ExportEntriesProps {
    eventId: string;
    searchParams: { q?: string, status?: string, coach?: string, day?: string };
}

export function ExportEntries({ eventId, searchParams }: ExportEntriesProps) {
    const [busy, setBusy] = useState<null | 'entries'>(null)

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

    return (
        <div className="flex">
            <Button variant="outline" className="min-h-12 w-full gap-2 text-base" onClick={handleExport} disabled={busy !== null}>
                {busy === 'entries' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
                {busy === 'entries' ? "Preparing…" : "Download Excel"}
            </Button>
        </div>
    )
}
