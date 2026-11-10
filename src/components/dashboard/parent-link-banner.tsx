'use client'

// ============================================================================
// EntryDesk — Coach Dashboard Parent Link Banner
// Prominent top banner for coaches providing quick access to their dojo's
// parent registration link with WhatsApp, Copy, and QR Code share actions.
// ============================================================================

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, QrCode, MessageCircle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DojoShareDialog } from './dojo-share-dialog'

interface ParentLinkBannerProps {
    dojo: {
        id: string
        name: string
        slug?: string | null
        join_code?: string | null
        join_link_enabled?: boolean
    }
    coachName?: string
    parentCount?: number
    pendingEntriesCount?: number
}

export function ParentLinkBanner({
    dojo,
    coachName = 'Coach',
    parentCount = 0,
    pendingEntriesCount = 0,
}: ParentLinkBannerProps) {
    const [copied, setCopied] = useState(false)
    const [isQrOpen, setIsQrOpen] = useState(false)
    const [origin, setOrigin] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin)
        }
    }, [])

    const joinUrl = origin && dojo.slug ? `${origin}/join/${dojo.slug}` : ''

    const shareMessage = `Namaste
This is ${coachName} from ${dojo.name}.

Please register yourself or your child for our karate tournaments using this link:
${joinUrl}

How it works:
1. Open the link and choose Sign in with Google, or sign in with an email code.
2. Add your or your child's athlete details and photo.
3. Register for the tournament from the same page.
4. Once fees are collected, I will check the entry and send it to the organiser. You can track status on the same page.

Next time, sign in at ${origin}/login with the same email.`

    const handleCopy = async () => {
        if (!joinUrl) return
        try {
            await navigator.clipboard.writeText(joinUrl)
            setCopied(true)
            toast.success('Link copied to clipboard!')
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error('Failed to copy link.')
        }
    }

    const handleWhatsAppShare = () => {
        if (!joinUrl) return
        if (navigator.share) {
            navigator
                .share({
                    title: `Join ${dojo.name}`,
                    text: shareMessage,
                })
                .catch(() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
                })
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
        }
    }

    if (!dojo.slug || dojo.join_link_enabled === false) return null

    return (
        <>
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <div>
                    <h2 className="text-lg font-bold">Invite parents</h2>
                    <p className="mt-0.5 text-[15px] text-muted-foreground">
                        Send this link. Parents use it to add their child to <b className="text-foreground">{dojo.name}</b>.
                    </p>
                </div>
                <Button
                    onClick={handleWhatsAppShare}
                    className="min-h-12 gap-2 bg-[#1f9d55] text-base font-semibold text-white hover:bg-[#178246]"
                >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    Send on WhatsApp
                </Button>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleCopy} className="min-h-12 gap-2 text-base font-semibold">
                        {copied ? <Check className="h-5 w-5 text-[var(--status-approved)]" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                        {copied ? 'Copied' : 'Copy link'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsQrOpen(true)} className="min-h-12 gap-2 text-base font-semibold">
                        <QrCode className="h-5 w-5" aria-hidden="true" />
                        Show QR
                    </Button>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {parentCount === 1 ? '1 family has joined' : `${parentCount} families have joined`}
                </p>
            </section>

            <DojoShareDialog
                open={isQrOpen}
                onOpenChange={setIsQrOpen}
                dojo={dojo}
                coachName={coachName}
            />
        </>
    )
}
