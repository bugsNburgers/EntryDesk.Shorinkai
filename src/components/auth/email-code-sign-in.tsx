'use client'

// "Get a code on my email" for parents and athletes on /login (same API the dojo join page uses:
// POST /api/auth/otp then /api/auth/otp/verify). The verify route only ever signs in parents, so a
// coach/organiser email gets a clear error and must use Google or the password form.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import { Loader2, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function EmailCodeSignIn({ callbackUrl }: { callbackUrl?: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'email' | 'code'>('email')
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    const sendCode = async () => {
        if (!email.trim()) return setError('Type your email address.')
        if (siteKey && !turnstileToken) return setError('Please wait for the check below to finish.')
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, turnstileToken: turnstileToken || undefined }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Could not send the code. Try again.')
            } else {
                if (data.devCode) setCode(data.devCode)
                setStep('code')
            }
        } catch {
            setError('Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    const verify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (code.length !== 6) return setError('Type the 6-digit code from your email.')
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'That code did not work. Try again.')
            } else {
                const cb = callbackUrl && callbackUrl.startsWith('/athlete') ? callbackUrl : null
                router.push(cb ?? data.redirectTo ?? '/athlete')
            }
        } catch {
            setError('Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-border bg-card px-4 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
                <Mail className="h-5 w-5" aria-hidden="true" />
                Get a code on my email
            </button>
        )
    }

    return (
        <div className="space-y-3 rounded-xl border-[1.5px] border-border bg-background p-4">
            {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-[15px] font-semibold text-destructive">
                    {error}
                </p>
            )}
            {step === 'email' ? (
                <>
                    <label htmlFor="otp-email" className="flex flex-col gap-1.5 text-base font-semibold">
                        Your email
                        <Input
                            id="otp-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                            placeholder="name@gmail.com"
                            className="h-12 text-base font-normal"
                        />
                    </label>
                    {siteKey && (
                        <Turnstile siteKey={siteKey} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
                    )}
                    <button
                        type="button"
                        onClick={sendCode}
                        disabled={loading}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-base font-semibold text-background disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                        Send me a code
                    </button>
                </>
            ) : (
                <form onSubmit={verify} className="space-y-3">
                    <p className="text-[15px] text-muted-foreground">
                        We sent a 6-digit code to <b className="text-foreground">{email}</b>.
                    </p>
                    <label htmlFor="otp-code" className="flex flex-col gap-1.5 text-base font-semibold">
                        Code
                        <Input
                            id="otp-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-base font-semibold text-background disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setStep('email')
                            setCode('')
                        }}
                        className="min-h-11 w-full text-[15px] font-semibold text-muted-foreground"
                    >
                        Use a different email
                    </button>
                </form>
            )}
        </div>
    )
}
