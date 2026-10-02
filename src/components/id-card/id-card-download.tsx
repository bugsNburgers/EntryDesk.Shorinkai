'use client'

// ============================================================================
// EntryDesk — Official Tournament ID Card A4 Pass Print / Download
// Pixel-perfect A4 Sheet (794px × 1123px, standard 210mm × 297mm PDF)
// ============================================================================

import React, { useRef, useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Printer } from 'lucide-react'
import { IdCardA4Sheet, type IdCardData } from './id-card-preview'

interface IdCardDownloadProps {
    entryId: string
    /** Optional pre-fetched card data */
    initialData?: IdCardData | null
    /** Label on the button */
    label?: string
    size?: 'sm' | 'default' | 'lg'
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    customButtonClass?: string
    hideMenu?: boolean
    onShowPhoneId?: () => void
}

export function IdCardDownload({
    entryId,
    initialData,
    label = 'Print A4 Pass',
    size = 'default',
    variant = 'default',
    customButtonClass,
}: IdCardDownloadProps) {
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<IdCardData | null>(initialData ?? null)
    const [error, setError] = useState<string | null>(null)

    const a4PrintRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (initialData) {
            setData(initialData)
        }
    }, [initialData])

    const fetchData = async (): Promise<IdCardData | null> => {
        const res = await fetch(`/api/id-card/${entryId}`)
        if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j.error || `Failed to load credential data (${res.status})`)
        }
        return res.json()
    }

    const handlePrint = () => {
        setError(null)

        startTransition(async () => {
            try {
                let cardData = data
                if (!cardData) {
                    cardData = await fetchData()
                    setData(cardData)
                    // Wait for React to render off-screen DOM
                    await new Promise((r) => setTimeout(r, 150))
                }
                if (!cardData) throw new Error('No credential data returned')

                const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                    import('html2canvas'),
                    import('jspdf'),
                ])

                const safeName = (cardData.student.name || 'Athlete').replace(/[^a-z0-9]/gi, '_')

                // Capture full A4 sheet (794px × 1123px)
                const el = a4PrintRef.current
                if (!el) throw new Error('A4 print element not ready')

                const canvas = await html2canvas(el, {
                    scale: 2.5, // 2.5x for crisp 300-DPI-equivalent print output
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                })

                const imgData = canvas.toDataURL('image/png')
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4', // 210mm × 297mm
                })

                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
                pdf.save(`EntryDesk_${safeName}_A4_Pass.pdf`)
            } catch (err: any) {
                setError(err.message || 'Failed to generate A4 pass')
            }
        })
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            {/* Hidden off-screen target for html2canvas */}
            <div
                style={{
                    position: 'fixed',
                    left: -9999,
                    top: -9999,
                    pointerEvents: 'none',
                    zIndex: -9999,
                    width: 794,
                    height: 1123,
                    overflow: 'hidden',
                }}
                aria-hidden="true"
            >
                {data && (
                    <div ref={a4PrintRef} style={{ width: 794, height: 1123 }}>
                        <IdCardA4Sheet data={data} />
                    </div>
                )}
            </div>

            {/* Direct A4 Print Button — No Dropdown */}
            <Button
                onClick={handlePrint}
                disabled={isPending}
                size={size}
                variant={variant}
                className={customButtonClass || "gap-2 rounded-xl font-semibold"}
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-[#3fd8c3]" />
                ) : (
                    <Printer className="h-4 w-4 text-emerald-600 dark:text-[#3fd8c3]" />
                )}
                {isPending ? 'Generating PDF...' : label}
            </Button>

            {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
        </div>
    )
}
