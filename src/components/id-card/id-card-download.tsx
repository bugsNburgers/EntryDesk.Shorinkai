'use client'

// ============================================================================
// EntryDesk — Official Tournament ID Card & A4 Pass Download Component
// Features:
//  - Pixel-perfect A4 Sheet (794px × 1123px, standard 210mm × 297mm PDF)
//  - Eco-Friendly Confirmation Prompt (Save paper & protect environment)
//  - html2canvas + jsPDF dynamic loading
// ============================================================================

import React, { useRef, useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Download,
    Loader2,
    Printer,
    FileText,
    Image as ImageIcon,
    ChevronDown,
    Leaf,
    Smartphone,
    Check,
} from 'lucide-react'
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
import { IdCardA4Sheet, IdCardPhonePass, type IdCardData } from './id-card-preview'

interface IdCardDownloadProps {
    entryId: string
    /** Optional pre-fetched card data */
    initialData?: IdCardData | null
    /** Label on the main button */
    label?: string
    size?: 'sm' | 'default' | 'lg'
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    hideMenu?: boolean
    customButtonClass?: string
    onShowPhoneId?: () => void
}

type DownloadFormat = 'a4-pdf' | 'badge-pdf' | 'badge-png'

const ECO_STORAGE_KEY = 'entrydesk_skip_eco_print_notice'

export function IdCardDownload({
    entryId,
    initialData,
    label = 'Download ID Card',
    size = 'default',
    variant = 'default',
    hideMenu = false,
    customButtonClass,
    onShowPhoneId,
}: IdCardDownloadProps) {
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<IdCardData | null>(initialData ?? null)
    const [error, setError] = useState<string | null>(null)

    // Eco Prompt Dialog State
    const [showEcoPrompt, setShowEcoPrompt] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)
    const [pendingFormat, setPendingFormat] = useState<DownloadFormat>('a4-pdf')

    const a4PrintRef = useRef<HTMLDivElement>(null)
    const badgePrintRef = useRef<HTMLDivElement>(null)

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

    const handleDownloadRequest = (format: DownloadFormat) => {
        setPendingFormat(format)

        // Check if user previously checked "Don't show again"
        const skip = typeof window !== 'undefined' && localStorage.getItem(ECO_STORAGE_KEY) === 'true'

        if (!skip) {
            setShowEcoPrompt(true)
        } else {
            proceedWithDownload(format)
        }
    }

    const confirmEcoAndDownload = () => {
        if (dontShowAgain && typeof window !== 'undefined') {
            localStorage.setItem(ECO_STORAGE_KEY, 'true')
        }
        setShowEcoPrompt(false)
        proceedWithDownload(pendingFormat)
    }

    const proceedWithDownload = (format: DownloadFormat) => {
        setError(null)

        startTransition(async () => {
            try {
                // 1. Fetch data if missing
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

                if (format === 'a4-pdf') {
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
                } else if (format === 'badge-pdf') {
                    // Capture mobile pass as A6 PDF
                    const el = badgePrintRef.current
                    if (!el) throw new Error('Badge element not ready')

                    const canvas = await html2canvas(el, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        logging: false,
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
                    // Capture mobile pass as high-res PNG
                    const el = badgePrintRef.current
                    if (!el) throw new Error('Badge element not ready')

                    const canvas = await html2canvas(el, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: '#ffffff',
                        logging: false,
                    })

                    const link = document.createElement('a')
                    link.download = `EntryDesk_${safeName}_Pass.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                }
            } catch (err: any) {
                setError(err.message || 'Failed to generate credential')
            }
        })
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            {/* Hidden off-screen targets for html2canvas */}
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
                    <>
                        {/* A4 Sheet Target (794px × 1123px) */}
                        <div ref={a4PrintRef} style={{ width: 794, height: 1123 }}>
                            <IdCardA4Sheet data={data} />
                        </div>

                        {/* Mobile Pass Target */}
                        <div ref={badgePrintRef} style={{ width: 390 }}>
                            <IdCardPhonePass data={data} />
                        </div>
                    </>
                )}
            </div>

            {/* Action Buttons */}
            {hideMenu ? (
                <Button
                    onClick={() => handleDownloadRequest('a4-pdf')}
                    disabled={isPending}
                    size={size}
                    variant={variant}
                    className={customButtonClass || "gap-2 rounded-md font-semibold"}
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#087f72]" />
                    ) : (
                        <Printer className="h-4 w-4 text-emerald-600" />
                    )}
                    {isPending ? 'Generating PDF...' : label}
                </Button>
            ) : (
                <div className="inline-flex rounded-md shadow-sm">
                    <Button
                        onClick={() => handleDownloadRequest('a4-pdf')}
                        disabled={isPending}
                        size={size}
                        variant={variant}
                        className={
                            customButtonClass ||
                            "gap-2 rounded-l-md rounded-r-none font-semibold border-r-0"
                        }
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                            <Printer className="h-4 w-4 text-emerald-600" />
                        )}
                        {isPending ? 'Generating PDF...' : (size === 'sm' ? 'A4 Pass' : label)}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={variant}
                                size={size}
                                disabled={isPending}
                                className="rounded-l-none rounded-r-md border-l px-2"
                                aria-label="Download options"
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                                onClick={() => handleDownloadRequest('a4-pdf')}
                                className="flex items-center gap-2 cursor-pointer font-medium"
                            >
                                <Printer className="h-4 w-4 text-[#087f72]" />
                                <div>
                                    <p className="text-xs font-semibold leading-none">Printable A4 Sheet (PDF)</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Official Tournament Pass</p>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => handleDownloadRequest('badge-pdf')}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs font-medium leading-none">Single Badge (PDF)</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">A6 Lanyard size</p>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => handleDownloadRequest('badge-png')}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs font-medium leading-none">Digital Pass (PNG)</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">High-res phone image</p>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}

            {/* Eco-Friendly Confirmation Dialog */}
            <Dialog open={showEcoPrompt} onOpenChange={setShowEcoPrompt}>
                <DialogContent className="max-w-md p-6 rounded-3xl bg-card border shadow-2xl">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0 text-emerald-600">
                            <Leaf className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Save Paper, Protect Our Environment 🌱
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                An eco-conscious initiative by EntryDesk
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground bg-muted/40 p-4 rounded-2xl border">
                        <p>
                            <strong className="text-foreground">It is not actually needed to download or print the physical paper pass</strong> if you will have your phone with you on the day of the tournament.
                        </p>
                        <p>
                            We encourage saving paper and helping the environment! You can simply open <span className="font-semibold text-emerald-600">Show ID</span> on your phone anywhere it is required—the digital QR code scans directly at the weigh-in counter, check-in gates, and mat-side.
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 italic">
                            If you cannot carry your phone, your battery might run low, or your coach requires a physical paper pass, please feel free to download and print the official A4 document.
                        </p>
                    </div>

                    {/* Don't show again toggle */}
                    <div className="mt-4 flex items-center gap-2 cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                        <div
                            className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                dontShowAgain
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-muted-foreground/40 bg-background'
                            }`}
                        >
                            {dontShowAgain && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs text-muted-foreground select-none">
                            Don&apos;t show this eco reminder again on this device
                        </span>
                    </div>

                    <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
                        {onShowPhoneId && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEcoPrompt(false)
                                    onShowPhoneId()
                                }}
                                className="gap-2 rounded-xl text-xs font-semibold border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50"
                            >
                                <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                                Keep on Phone (Recommended)
                            </Button>
                        )}

                        <Button
                            onClick={confirmEcoAndDownload}
                            className="gap-2 rounded-xl text-xs font-semibold bg-[#0e2238] hover:bg-[#1a385c] text-white"
                        >
                            <Printer className="h-3.5 w-3.5 text-[#3fd8c3]" />
                            Download &amp; Print A4 PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
