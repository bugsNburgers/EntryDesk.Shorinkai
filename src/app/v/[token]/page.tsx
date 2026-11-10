// ============================================================================
// EntryDesk — QR Verification Page
// /v/[token] — Public, rate-limited. Shows Valid ✓ or Not Valid ✗.
// ============================================================================

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import sql from '@/lib/db'
import { checkRateLimit } from '@/lib/auth/rate-limit-db'
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Verify Entry — EntryDesk',
    robots: 'noindex, nofollow',
}

interface VerifyPageProps {
    params: Promise<{ token: string }>
}

export default async function QrVerifyPage({ params }: VerifyPageProps) {
    const { token } = await params

    // Rate limit by IP: 60 requests / 5 min
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await checkRateLimit(`qr_verify:${ip}`, 60, 5)

    if (!rl.allowed) {
        return (
            <VerifyShell valid={false}>
                <p className="text-sm text-muted-foreground text-center">
                    Too many verification attempts. Please try again in {Math.ceil(rl.retryAfterSeconds / 60)} minute(s).
                </p>
            </VerifyShell>
        )
    }

    // Validate token format (32 hex chars or standard 36-char UUID)
    if (!/^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
        return <NotValid reason="Invalid credential code." />
    }

    const [entry] = await sql<{ chest_no: number | null }[]>`
        SELECT chest_no FROM entries WHERE qr_token = ${token} AND status = 'approved' LIMIT 1
    `
    if (!entry) return <NotValid reason="This credential is unavailable or has been revoked." />

    return (
        <VerifyShell valid>
            <StatusBadge valid label="Valid Entry" />
            {entry.chest_no != null && (
                <p className="rounded-lg border p-4 text-center text-xl font-semibold">
                    Chest number #{entry.chest_no}
                </p>
            )}
        </VerifyShell>
    )
}

function VerifyShell({ valid, children }: { valid: boolean; children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/40 flex flex-col items-center justify-start py-12 px-4">
            <div className="w-full max-w-sm space-y-5">
                {/* Header */}
                <div className="text-center space-y-1">
                    <div className="flex justify-center mb-3">
                        <span className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
                            <ShieldCheck className={`h-6 w-6 ${valid ? 'text-emerald-600' : 'text-rose-600'}`} />
                            EntryDesk
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Official Tournament Entry Verification</p>
                </div>

                {children}

                <div className="text-center pt-2">
                    <p className="text-[11px] text-muted-foreground">
                        Powered by <Link href="/" className="underline hover:text-foreground">EntryDesk</Link> — Digital Tournament Entry Management
                    </p>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ valid, label }: { valid: boolean; label: string }) {
    return (
        <div className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-3 text-center
            ${valid
                ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800'
                : 'border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800'
            }`}>
            {valid
                ? <CheckCircle2 className="h-14 w-14 text-emerald-600" strokeWidth={1.5} />
                : <XCircle className="h-14 w-14 text-rose-600" strokeWidth={1.5} />
            }
            <span className={`text-2xl font-black ${valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {label}
            </span>
        </div>
    )
}

function NotValid({ reason }: { reason: string }) {
    return (
        <VerifyShell valid={false}>
            <StatusBadge valid={false} label="Not Valid ✗" />
            <p className="text-sm text-center text-muted-foreground">{reason}</p>
        </VerifyShell>
    )
}
