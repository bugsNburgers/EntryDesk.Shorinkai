'use client'

// ============================================================================
// EntryDesk — Official Tournament ID Card & A4 Pass Download Component
// Dynamically loads html2canvas + jsPDF to avoid SSR bundle weight.
// Supports:
//  - Full A4 Printable Sheet (PDF, 210mm × 297mm with fold & cut guides)
//  - Single Accreditation Badge (PDF, A6)
//  - High-Resolution Digital Badge (PNG for mobile/wallet)
// ============================================================================

import React, { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, AlertCircle, ChevronDown, FileText, Image as ImageIcon, Printer } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IdCardPreview, IdCardA4Sheet, type IdCardData } from './id-card-preview'

interface IdCardDownloadProps {
    entryId: string
    /** Optional pre-fetched card data */
    initialData?: IdCardData | null
    /** Label on the main button */
    label?: string
    size?: 'sm' | 'default'
    variant?: 'default' | 'outline' | 'ghost'
}

type DownloadFormat = 'a4-pdf' | 'badge-pdf' | 'badge-png'

export function IdCardDownload({
    entryId,
    initialData,
    label = 'Download ID Card',
    size = 'default',
    variant = 'default',
}: IdCardDownloadProps) {
    const [isPending, startTransition] = useTransition()
    const [pendingAction, setPendingAction] = useState<string | null>(null)
    const [data, setData] = useState<IdCardData | null>(initialData ?? null)
    const [error, setError] = useState<string | null>(null)

    const a4PrintRef = useRef<HTMLDivElement>(null)
    const badgePrintRef = useRef<HTMLDivElement>(null)

    const fetchData = async (): Promise<IdCardData | null> => {
        const res = await fetch(`/api/id-card/${entryId}`)
        if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j.error || `Failed to load credential data (${res.status})`)
        }
        return res.json()
    }

    const executeDownload = (format: DownloadFormat) => {
        setError(null)
        setPendingAction(format)

        startTransition(async () => {
            try {
                // 1. Fetch data if missing
                let cardData = data
                if (!cardData) {
                    cardData = await fetchData()
                    setData(cardData)
                    // Wait for React to render off-screen DOM
                    await new Promise((r) => setTimeout(r, 100))
                }
                if (!cardData) throw new Error('No credential data returned')

                const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                    import('html2canvas'),
                    import('jspdf'),
                ])

                const safeName = cardData.student.name.replace(/[^a-z0-9]/gi, '_')
                const safeEvent = cardData.event.title.replace(/[^a-z0-9]/gi, '_').slice(0, 25)

                if (format === 'a4-pdf') {
                    // Capture full A4 sheet
                    const el = a4PrintRef.current
                    if (!el) throw new Error('A4 print element not ready')

                    const canvas = await html2canvas(el, {
                        scale: 2.2,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        logging: false,
                        onclone: (clonedDoc) => {
                            // Strip modern CSS color functions that html2canvas cannot parse
                            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => s.remove())
                        },
                    })

                    const imgData = canvas.toDataURL('image/png')
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4', // 210mm × 297mm
                    })

                    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
                    pdf.save(`EntryDesk_${safeName}_A4_Pass.pdf`)
                } else if (format === 'badge-pdf') {
                    // Capture badge only as A6 PDF
                    const el = badgePrintRef.current
                    if (!el) throw new Error('Badge element not ready')

                    const canvas = await html2canvas(el, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        logging: false,
                        onclone: (clonedDoc) => {
                            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => s.remove())
                        },
                    })

                    const imgData = canvas.toDataURL('image/png')
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a6', // 105mm × 148mm
                    })

                    pdf.addImage(imgData, 'PNG', 0, 0, 105, 148)
                    pdf.save(`EntryDesk_${safeName}_Badge.pdf`)
                } else if (format === 'badge-png') {
                    // Capture badge as high-res PNG
                    const el = badgePrintRef.current
                    if (!el) throw new Error('Badge element not ready')

                    const canvas = await html2canvas(el, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        logging: false,
                        onclone: (clonedDoc) => {
                            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => s.remove())
                        },
                    })

                    const link = document.createElement('a')
                    link.download = `EntryDesk_${safeName}_Badge.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                }
            } catch (err: any) {
                setError(err.message || 'Failed to generate credential')
            } finally {
                setPendingAction(null)
            }
        })
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            {/* Hidden off-screen targets for html2canvas */}
            {data && (
                <div
                    style={{
                        position: 'fixed',
                        left: -9999,
                        top: -9999,
                        pointerEvents: 'none',
                        zIndex: -1,
                    }}
                    aria-hidden="true"
                >
                    {/* A4 Sheet Target */}
                    <IdCardA4Sheet data={data} printRef={a4PrintRef} />

                    {/* Single Badge Target */}
                    <IdCardPreview data={data} printRef={badgePrintRef} scale={1} />
                </div>
            )}

            {/* Split / Dropdown Action Button */}
            <div className="inline-flex rounded-xl shadow-sm">
                <Button
                    onClick={() => executeDownload('a4-pdf')}
                    disabled={isPending}
                    size={size}
                    variant={variant}
                    className="gap-2 rounded-l-xl rounded-r-none font-semibold"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Printer className="h-4 w-4" />
                    )}
                    {isPending ? 'Generating...' : (size === 'sm' ? 'A4 Pass' : label)}
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={variant}
                            size={size}
                            disabled={isPending}
                            className="rounded-l-none rounded-r-xl border-l px-2"
                            aria-label="Download options"
                        >
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                            onClick={() => executeDownload('a4-pdf')}
                            className="flex items-center gap-2 cursor-pointer font-medium"
                        >
                            <Printer className="h-4 w-4 text-primary" />
                            <div>
                                <p className="text-xs font-semibold leading-none">Printable A4 Sheet (PDF)</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">With fold & cut guides</p>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => executeDownload('badge-pdf')}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs font-medium leading-none">Single Badge (PDF)</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">A6 Lanyard size</p>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => executeDownload('badge-png')}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs font-medium leading-none">Digital Pass (PNG)</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">For phone & mobile</p>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {error && (
                <p className="text-xs text-destructive flex items-center gap-1.5 max-w-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </p>
            )}
        </div>
    )
}
