'use client'

// ============================================================================
// EntryDesk — Coach Dashboard Parent Link Banner
// Prominent top banner for coaches providing quick access to their dojo's
// parent registration link with WhatsApp, Copy, and QR Code share actions.
// ============================================================================

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Copy,
    Check,
    Share2,
    QrCode,
    MessageCircle,
    Users,
    Clock,
    Link2,
} from 'lucide-react'
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

    const shareMessage = `Namaste 🙏
This is ${coachName} from ${dojo.name}.

Please register yourself or your child for our karate tournaments using this link:
${joinUrl}

How it works:
1. Open the link and enter your email. You will get a 6-digit code. No password needed.
2. Add your or your child's athlete details and photo.
3. Register for the tournament from the same page.
4. I will check the entry and send it to the organiser. You can track status on the same page.

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

    if (!dojo.slug) return null

    return (
        <>
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.08] via-background to-primary/[0.04] p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <Link2 className="h-3 w-3" />
                                Athlete & Parent Registration Link
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                                for dojo {dojo.name}
                            </span>
                        </div>
                        <p className="text-sm text-foreground/90 max-w-xl">
                            Share this link with athletes or parents so they can register for tournaments
                        </p>
                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                                <Users className="h-3.5 w-3.5 text-primary" />
                                {parentCount} registered
                            </span>
                            {pendingEntriesCount > 0 && (
                                <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    {pendingEntriesCount} entr{pendingEntriesCount !== 1 ? 'ies' : 'y'} waiting for your review
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handleWhatsAppShare}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-1.5 h-8 text-xs font-medium shadow-sm"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Share on WhatsApp
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopy}
                            className="gap-1.5 h-8 text-xs bg-background/80 hover:bg-background"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy Link'}
                        </Button>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setIsQrOpen(true)}
                            className="gap-1.5 h-8 text-xs"
                        >
                            <QrCode className="h-3.5 w-3.5" />
                            Show QR
                        </Button>
                    </div>
                </div>
            </div>

            <DojoShareDialog
                open={isQrOpen}
                onOpenChange={setIsQrOpen}
                dojo={dojo}
                coachName={coachName}
            />
        </>
    )
}
