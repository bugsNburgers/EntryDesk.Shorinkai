// ============================================================================
// EntryDesk — QR Verification Page
// /v/[token] — Public, rate-limited. Shows Valid ✓ or Not Valid ✗.
// ============================================================================

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import sql from '@/lib/db'
import { checkRateLimit } from '@/lib/auth/rate-limit-db'
import { CheckCircle2, XCircle, Calendar, MapPin, Building2, Trophy, ShieldCheck } from 'lucide-react'

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
            <VerifyShell valid={false} rateLimit>
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

    // Lookup entry by token
    const rows = await sql<{
        id: string
        status: string
        participation_type: string | null
        category_name: string | null
        chest_no: number | null
        student_name: string
        student_photo: string | null
        student_rank: string | null
        student_gender: string
        dojo_name: string
        event_title: string
        event_location: string | null
        start_date: string
        end_date: string
    }[]>`
        SELECT
            e.id,
            e.status,
            e.participation_type,
            COALESCE(c.name, e.category_snapshot->>'displayName') AS category_name,
            e.chest_no,
            s.name AS student_name,
            s.photo_url AS student_photo,
            s.rank AS student_rank,
            s.gender AS student_gender,
            d.name AS dojo_name,
            ev.title AS event_title,
            ev.location AS event_location,
            ev.start_date,
            ev.end_date
        FROM entries e
        JOIN students s ON e.student_id = s.id
        JOIN dojos d ON s.dojo_id = d.id
        JOIN events ev ON e.event_id = ev.id
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.qr_token = ${token}
        LIMIT 1
    `

    if (!rows.length) {
        return <NotValid reason="This credential does not exist or has been revoked." />
    }

    const entry = rows[0]

    if (entry.status !== 'approved') {
        return (
            <VerifyShell valid={false}>
                <StatusBadge valid={false} label="Not Valid" />
                <p className="text-sm text-center text-muted-foreground mt-2">
                    This entry has not been approved by the tournament organiser.
                    <br />Current status: <strong className="text-foreground capitalize">{entry.status.replace(/_/g, ' ')}</strong>
                </p>
                <AthleteInfo entry={entry} />
            </VerifyShell>
        )
    }

    return (
        <VerifyShell valid={true}>
            <StatusBadge valid={true} label="Valid Entry ✓" />
            <AthleteInfo entry={entry} />

            {entry.chest_no && (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 py-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Chest Number</p>
                    <p className="text-4xl font-black text-primary mt-0.5">#{entry.chest_no}</p>
                </div>
            )}

            <div className="rounded-2xl border bg-card p-4 grid grid-cols-2 gap-3 text-xs">
                <InfoChip label="Category" value={entry.category_name || 'Open'} />
                <InfoChip
                    label="Events"
                    value={
                        entry.participation_type === 'both' ? 'Kata & Kumite' :
                        entry.participation_type ? entry.participation_type.charAt(0).toUpperCase() + entry.participation_type.slice(1) :
                        'Both'
                    }
                />
                <InfoChip label="Belt" value={entry.student_rank || 'Open belt'} />
                <InfoChip label="Gender" value={entry.student_gender.charAt(0).toUpperCase() + entry.student_gender.slice(1)} />
            </div>
        </VerifyShell>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function formatDate(s: string, e: string) {
    const sd = new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const ed = new Date(e).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return s === e ? sd : `${sd} – ${ed}`
}

function VerifyShell({ valid, rateLimit, children }: { valid: boolean; rateLimit?: boolean; children: React.ReactNode }) {
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

function AthleteInfo({ entry }: { entry: any }) {
    return (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-4">
                {/* Photo */}
                <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-primary/10 border flex items-center justify-center">
                    {entry.student_photo ? (
                        <Image src={entry.student_photo} alt={entry.student_name} fill className="object-cover" unoptimized />
                    ) : (
                        <span className="text-2xl font-black text-primary">{entry.student_name.slice(0, 1)}</span>
                    )}
                </div>
                <div className="min-w-0">
                    <h2 className="text-lg font-black leading-tight truncate">{entry.student_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {entry.dojo_name}
                    </p>
                </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">{entry.event_title}</span>
                </p>
                <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    {formatDate(entry.start_date, entry.end_date)}
                </p>
                {entry.event_location && (
                    <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        {entry.event_location}
                    </p>
                )}
            </div>
        </div>
    )
}

function InfoChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="font-semibold text-foreground mt-0.5 truncate">{value}</p>
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
