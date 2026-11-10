'use client'

import { useState } from 'react'
import { exportEventForRingFlow } from '@/app/dashboard/events/[id]/entries/actions'
import { RINGFLOW_HEADERS, type RingFlowRow } from '@/lib/export/ringflow'
import { Button } from '@/components/ui/button'

export function RingFlowDownload({ eventId, days }: {
    eventId: string
    days: { id: string; name: string }[]
}) {
    const [dayId, setDayId] = useState('')
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

    const [rows, setRows] = useState<RingFlowRow[]>([])

    async function preview() {
        setBusy(true)
        setRows([])
        setMessage('')
        try {
            const result = await exportEventForRingFlow(eventId, dayId || undefined)
            if (!result.rows?.length) {
                setMessage(result.error ?? 'No accepted entries to export.')
                return
            }
            setRows(result.rows)
            const incomplete = result.rows.filter((row) => row.age === '' || row.sex === '' ||
                (row.kumite === 'Yes' && row.weight === '')).length
            setMessage(`${result.rows.length} accepted entries. ${incomplete} with missing age, sex or kumite weight.`)
        } catch {
            setMessage('Could not load the roster.')
        } finally {
            setBusy(false)
        }
    }

    async function download() {
        try {
            const XLSX = await import('xlsx')
            const book = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows, { header: [...RINGFLOW_HEADERS] }), 'Roster')
            XLSX.writeFile(book, 'RingFlow-roster.xlsx')
        } catch {
            setMessage('Could not download the roster.')
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <select aria-label="RingFlow event day" value={dayId} disabled={busy} onChange={(event) => {
                setDayId(event.target.value)
                setRows([])
                setMessage('')
            }}>
                <option value="">All days</option>
                {days.map((day) => <option key={day.id} value={day.id}>{day.name}</option>)}
            </select>
            <Button type="button" variant="outline" disabled={busy} onClick={preview}>Preview RingFlow roster</Button>
            {!!rows.length && <Button type="button" onClick={download}>Download workbook</Button>}
            <span role="status">{message}</span>
        </div>
    )
}
