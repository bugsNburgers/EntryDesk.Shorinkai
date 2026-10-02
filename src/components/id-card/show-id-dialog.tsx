'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Smartphone, Download, Loader2, X, AlertCircle, Printer } from 'lucide-react'
import { IdCardPhonePass, type IdCardData } from './id-card-preview'
import { IdCardDownload } from './id-card-download'

interface ShowIdDialogProps {
    entryId: string
    initialData?: IdCardData | null
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    size?: 'sm' | 'default' | 'lg'
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export function ShowIdDialog({
    entryId,
    initialData,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    size = 'default',
    variant = 'default',
}: ShowIdDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [data, setData] = useState<IdCardData | null>(initialData ?? null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : internalOpen

    const handleOpenChange = (nextOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(nextOpen)
        }
        setControlledOpen?.(nextOpen)

        if (nextOpen && !data && !loading) {
            fetchCardData()
        }
    }

    const fetchCardData = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/id-card/${entryId}`)
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j.error || `Failed to load athlete credential (${res.status})`)
            }
            const cardData = await res.json()
            setData(cardData)
        } catch (err: any) {
            setError(err.message || 'Failed to load ID card')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button
                        size={size}
                        variant={variant}
                        className="gap-2 rounded-md font-bold bg-[#0e2238] hover:bg-[#1a385c] text-white shadow-sm transition-all"
                    >
                        <Smartphone className="h-4 w-4 text-[#3fd8c3]" />
                        Show ID
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent
                className="max-w-[440px] p-0 overflow-hidden border-0 bg-transparent shadow-2xl focus:outline-none focus-visible:outline-none"
                style={{ maxHeight: '92vh' }}
            >
                {/* Modal Container */}
                <div className="flex flex-col h-[90vh] max-h-[850px] bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-700 shadow-2xl">
                    {/* Top Action Bar */}
                    <div className="bg-[#071320] text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3fd8c3] animate-pulse" />
                            <span className="text-xs font-bold tracking-wider uppercase text-neutral-300">
                                Official Digital Pass
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* A4 Pass Download with Eco prompt */}
                            <IdCardDownload
                                entryId={entryId}
                                initialData={data}
                                size="sm"
                                variant="outline"
                                label="A4 Pass"
                                hideMenu
                                customButtonClass="h-8 px-3 rounded-lg border-neutral-700 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700 hover:text-white text-xs font-semibold"
                            />

                            <button
                                onClick={() => handleOpenChange(false)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Mobile Card Area */}
                    <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 bg-neutral-950 flex justify-center items-start">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-neutral-400 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-[#3fd8c3]" />
                                <p className="text-xs font-medium">Loading Athlete ID Card...</p>
                            </div>
                        ) : error ? (
                            <div className="max-w-xs text-center py-24 text-neutral-300 space-y-3">
                                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
                                <p className="text-sm font-semibold">{error}</p>
                                <Button
                                    size="sm"
                                    onClick={fetchCardData}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-md text-xs"
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : data ? (
                            <div className="w-full flex justify-center py-1">
                                <IdCardPhonePass data={data} />
                            </div>
                        ) : null}
                    </div>

                    {/* Bottom Helper Bar */}
                    <div className="bg-[#071320] px-4 py-2 text-[11px] text-neutral-400 flex items-center justify-between border-t border-neutral-800 shrink-0">
                        <span>Scan anywhere on tournament day</span>
                        <span className="text-[#3fd8c3] font-semibold">100% Paperless</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
