'use client'

// ============================================================================
// EntryDesk — Coach Dojo Share Dialog
// Allows coaches to share dojo registration link via WhatsApp, Copy, QR code,
// and manage link status (enable/disable or regenerate).
// ============================================================================

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
    Copy,
    Check,
    Share2,
    QrCode,
    MessageCircle,
    Download,
    RefreshCw,
    ExternalLink,
} from 'lucide-react'
import { toggleDojoJoinLink, regenerateDojoJoinCode } from '@/app/dashboard/dojos/actions'

interface DojoShareDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    dojo: {
        id: string
        name: string
        slug?: string | null
        join_code?: string | null
        join_link_enabled?: boolean
    }
    coachName?: string
}

export function DojoShareDialog({
    open,
    onOpenChange,
    dojo,
    coachName = 'Your Coach',
}: DojoShareDialogProps) {
    const [copied, setCopied] = useState(false)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const [isEnabled, setIsEnabled] = useState(dojo.join_link_enabled !== false)
    const [currentSlug, setCurrentSlug] = useState(dojo.slug || '')
    const [isUpdating, setIsUpdating] = useState(false)
    const [origin, setOrigin] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin)
        }
    }, [])

    useEffect(() => {
        setIsEnabled(dojo.join_link_enabled !== false)
        if (dojo.slug) {
            setCurrentSlug(dojo.slug)
        }
    }, [dojo])

    const joinUrl = origin && currentSlug ? `${origin}/join/${currentSlug}` : ''

    // Generate QR Code when dialog opens or slug changes
    useEffect(() => {
        if (!joinUrl) return
        QRCode.toDataURL(joinUrl, {
            width: 320,
            margin: 2,
            color: {
                dark: '#0f172a',
                light: '#ffffff',
            },
        })
            .then(setQrDataUrl)
            .catch(console.error)
    }, [joinUrl])

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
                    // Fallback to wa.me if user cancelled or system failed
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
                })
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
        }
    }

    const handleDownloadQr = () => {
        if (!qrDataUrl) return
        const a = document.createElement('a')
        a.href = qrDataUrl
        a.download = `${dojo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`
        a.click()
        toast.success('QR Code downloaded!')
    }

    const handleToggleLink = async (checked: boolean) => {
        setIsUpdating(true)
        try {
            await toggleDojoJoinLink(dojo.id, checked)
            setIsEnabled(checked)
            toast.success(checked ? 'Registration link enabled' : 'Registration link disabled')
        } catch (err) {
            toast.error('Failed to update link status.')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleRegenerateCode = async () => {
        if (!confirm('Are you sure you want to regenerate the link? The previous link will stop working for athletes and parents.')) {
            return
        }
        setIsUpdating(true)
        try {
            const res = await regenerateDojoJoinCode(dojo.id)
            if (res.slug) {
                setCurrentSlug(res.slug)
                toast.success('New registration link generated successfully!')
            }
        } catch {
            toast.error('Failed to regenerate link.')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-primary" />
                        Athlete & Parent Registration Link
                    </DialogTitle>
                    <DialogDescription>
                        Share this link with athletes or parents so they can register directly for tournaments under{' '}
                        <span className="font-semibold text-foreground">{dojo.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Link display & quick copy */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Join Link</Label>
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 font-mono text-xs">
                            <span className="truncate flex-1 select-all">{joinUrl || 'Generating...'}</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={handleCopy}
                                title="Copy link"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    </div>

                    {/* Action buttons: WhatsApp + Copy */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={handleWhatsAppShare}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-medium"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Share on WhatsApp
                        </Button>
                        <Button variant="outline" onClick={handleCopy} className="gap-2">
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </Button>
                    </div>

                    {/* Printable QR Code section */}
                    <div className="rounded-lg border p-4 text-center bg-card">
                        <p className="text-xs font-medium mb-3 text-muted-foreground flex items-center justify-center gap-1.5">
                            <QrCode className="h-4 w-4" />
                            Dojo Wall QR Code
                        </p>
                        {qrDataUrl ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 inline-block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={qrDataUrl}
                                        alt={`QR code to join ${dojo.name}`}
                                        className="w-40 h-40 object-contain mx-auto"
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDownloadQr}
                                    className="text-xs gap-1.5"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download Printable QR
                                </Button>
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                                Loading QR Code...
                            </div>
                        )}
                    </div>

                    {/* Link Controls: Enable/Disable & Regenerate */}
                    <div className="border-t pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium">Accept Athlete & Parent Signups</p>
                                <p className="text-[11px] text-muted-foreground">
                                    When disabled, users opening the link see a friendly notice.
                                </p>
                            </div>
                            <Switch
                                checked={isEnabled}
                                onCheckedChange={handleToggleLink}
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-muted-foreground">Link compromised?</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRegenerateCode}
                                disabled={isUpdating}
                                className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Regenerate Link
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
