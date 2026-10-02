'use client'

// ============================================================================
// EntryDesk — Team ID Cards Printable Grid (4 cards per A4 sheet)
// ============================================================================

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Scissors, Eye, AlertCircle } from 'lucide-react'
import { IdCardPreview, type IdCardData } from './id-card-preview'

interface TeamCardsPrintClientProps {
    eventTitle: string
    eventId: string
    cards: IdCardData[]
}

export function TeamCardsPrintClient({
    eventTitle,
    eventId,
    cards,
}: TeamCardsPrintClientProps) {
    const [showCutGuides, setShowCutGuides] = useState(true)

    // Chunk cards into groups of 4 (4 cards per A4 page)
    const chunks: IdCardData[][] = []
    for (let i = 0; i < cards.length; i += 4) {
        chunks.push(cards.slice(i, i + 4))
    }

    const totalPages = chunks.length

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 pb-16">
            {/* Top Toolbar (Hidden when printing) */}
            <header className="no-print sticky top-0 z-30 bg-card/95 backdrop-blur border-b px-4 py-3 shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href={`/dashboard/events/${eventId}/entries`}>
                            <Button variant="ghost" size="sm" className="gap-1.5 rounded-md">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Event
                            </Button>
                        </Link>
                        <div className="border-l pl-3">
                            <h1 className="text-base font-bold truncate max-w-sm sm:max-w-md">
                                {eventTitle}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {cards.length} approved athlete cards • {totalPages} A4 {totalPages === 1 ? 'page' : 'pages'} (4 cards/page)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCutGuides(!showCutGuides)}
                            className="rounded-md text-xs gap-1.5"
                        >
                            <Scissors className="h-3.5 w-3.5" />
                            {showCutGuides ? 'Hide Cut Lines' : 'Show Cut Lines'}
                        </Button>
                        <Button
                            onClick={() => window.print()}
                            size="sm"
                            className="rounded-md font-semibold gap-2 bg-primary text-primary-foreground shadow"
                        >
                            <Printer className="h-4 w-4" />
                            Print Team Cards ({cards.length})
                        </Button>
                    </div>
                </div>
            </header>

            {/* Print Help Notice (Hidden when printing) */}
            <div className="no-print max-w-4xl mx-auto mt-4 px-4">
                <div className="rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>
                            <strong>Print tip:</strong> In the print dialog, set <strong>Margins: None / Minimum</strong> and ensure <strong>Background graphics</strong> is turned ON for crisp colors.
                        </span>
                    </div>
                </div>
            </div>

            {/* If no approved cards */}
            {cards.length === 0 ? (
                <div className="max-w-md mx-auto mt-16 p-8 rounded-lg bg-card border text-center shadow-sm space-y-3">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                    <h2 className="text-lg font-bold">No approved entries to print</h2>
                    <p className="text-xs text-muted-foreground">
                        ID cards can only be generated for entries that have been approved by the tournament organiser.
                    </p>
                    <Link href={`/dashboard/events/${eventId}/entries`}>
                        <Button size="sm" variant="outline" className="mt-2 rounded-md">
                            Return to Entries
                        </Button>
                    </Link>
                </div>
            ) : (
                /* Sheets Container */
                <main className="max-w-4xl mx-auto mt-6 px-4 space-y-8 print:m-0 print:p-0 print:max-w-none">
                    {chunks.map((group, pageIdx) => (
                        <div
                            key={pageIdx}
                            className={`a4-sheet bg-white text-black mx-auto overflow-hidden shadow-xl rounded-lg print:shadow-none print:rounded-none print:m-0 relative ${
                                pageIdx < chunks.length - 1 ? 'page-break' : ''
                            }`}
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                padding: '8mm',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* Page header (only on screen) */}
                            <div className="no-print absolute top-2 right-4 text-[10px] text-neutral-400 font-mono">
                                Sheet {pageIdx + 1} of {totalPages}
                            </div>

                            {/* 2x2 Grid of Cards */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 95mm)',
                                    gridTemplateRows: 'repeat(2, 137mm)',
                                    gap: '4mm',
                                    justifyContent: 'center',
                                    alignContent: 'center',
                                    height: '281mm',
                                }}
                            >
                                {group.map((card) => (
                                    <div
                                        key={card.id}
                                        style={{
                                            width: '95mm',
                                            height: '137mm',
                                            position: 'relative',
                                            border: showCutGuides ? '1px dashed #cbd5e1' : 'none',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#ffffff',
                                        }}
                                    >
                                        <IdCardPreview data={card} scale={0.93} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>
            )}

            {/* Embedded CSS for Print Mode */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .a4-sheet {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 8mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                    }
                    .page-break {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                }
            `}</style>
        </div>
    )
}
