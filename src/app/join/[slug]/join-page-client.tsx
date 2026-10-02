'use client'

// ============================================================================
// EntryDesk — Join Page Client Auth Component
// Handles Google 1-Tap and Email OTP flows for parent sign-up
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface JoinPageClientProps {
    dojoSlug: string
    dojoName: string
    googleClientId: string
}

type AuthStep = 'choose' | 'otp_email' | 'otp_verify'

export function JoinPageClient({ dojoSlug, dojoName, googleClientId }: JoinPageClientProps) {
    const router = useRouter()
    const [step, setStep] = useState<AuthStep>('choose')
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [suggestion, setSuggestion] = useState<string | null>(null)
    const [cooldownSeconds, setCooldownSeconds] = useState(0)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [showEmailFallback, setShowEmailFallback] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const googleBtnRef = useRef<HTMLDivElement>(null)
    const codeInputRef = useRef<HTMLInputElement>(null)

    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const isTurnstileRequired = Boolean(turnstileSiteKey)

    // Cooldown timer
    useEffect(() => {
        if (cooldownSeconds <= 0) return
        const t = setTimeout(() => setCooldownSeconds((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [cooldownSeconds])

    // Auto-focus code input when step changes to verify
    useEffect(() => {
        if (step === 'otp_verify') {
            setTimeout(() => codeInputRef.current?.focus(), 100)
        }
    }, [step])

    const handleGoogleCredential = useCallback(
        async (response: { credential: string }) => {
            setGoogleLoading(true)
            setError(null)
            try {
                // Use existing verifyGoogleLogin action but with parent/athlete context
                const res = await fetch('/api/auth/google-join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: response.credential, dojoSlug }),
                })
                const data = await res.json()
                if (!res.ok || !data.success) {
                    setError(data.error ?? 'Google sign-in failed. Please try again.')
                } else {
                    router.push(data.redirectTo ?? `/parent?joinedDojo=${dojoSlug}`)
                }
            } catch {
                setError('Something went wrong. Please try again.')
            } finally {
                setGoogleLoading(false)
            }
        },
        [dojoSlug, router]
    )

    // Initialize Google Identity Services
    useEffect(() => {
        if (!googleClientId || !googleBtnRef.current || step !== 'choose') return

        const initGoogle = () => {
            if (!window.google || !googleBtnRef.current) return
            try {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: handleGoogleCredential,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                })
                googleBtnRef.current.innerHTML = ''
                const containerWidth = googleBtnRef.current.clientWidth || 360
                const btnWidth = Math.min(400, Math.max(250, containerWidth))
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline' as const,
                    size: 'large' as const,
                    text: 'continue_with' as const,
                    shape: 'pill' as const,
                    width: btnWidth,
                    logo_alignment: 'left' as const,
                })
            } catch (err) {
                console.error('[Google GIS] Render error:', err)
            }
        }

        if (window.google) {
            initGoogle()
        } else {
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client?hl=en'
            script.onload = initGoogle
            script.async = true
            document.head.appendChild(script)
        }
    }, [googleClientId, step, handleGoogleCredential])

    const sendOtp = async (targetEmail?: string) => {
        const emailToUse = targetEmail ?? email
        if (!emailToUse.trim()) {
            setError('Please enter your email address.')
            return
        }
        if (isTurnstileRequired && !turnstileToken) {
            setError('Please complete the CAPTCHA verification before requesting a code.')
            return
        }
        setLoading(true)
        setError(null)
        setSuggestion(null)
        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailToUse,
                    turnstileToken: turnstileToken || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Failed to send code. Please try again.')
            } else {
                if (data.suggestion) setSuggestion(data.suggestion)
                if (data.devCode) {
                    setCode(data.devCode)
                }
                setStep('otp_verify')
                setCooldownSeconds(30)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code || code.length !== 6) {
            setError('Please enter the 6-digit code from your email.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, dojoSlug }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Verification failed. Please try again.')
            } else {
                router.push(data.redirectTo ?? `/parent?joinedDojo=${dojoSlug}`)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (step === 'choose') {
        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur dark:border-white/[0.10]">
                    <h2 className="text-base font-semibold mb-1">
                        Register for {dojoName}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">
                        Sign in to get started. Takes less than 2 minutes.
                    </p>

                    {error && (
                        <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Google Button (Native pill, no overflow clipping) */}
                    {googleClientId ? (
                        <div className="mb-2">
                            <div className="w-full flex justify-center py-1">
                                <div
                                    ref={googleBtnRef}
                                    className="w-full flex justify-center min-h-[48px] [&_iframe]:!block"
                                />
                            </div>
                            {googleLoading && (
                                <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">Signing in with Google…</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-xs text-muted-foreground mb-4">
                            Google Sign-in is not configured.
                        </div>
                    )}

                    {/* Discrete Email Fallback (Hidden by default to protect 100 emails/day quota) */}
                    {!showEmailFallback ? (
                        <div className="mt-4 pt-3 border-t border-border/30 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEmailFallback(true)
                                    setError(null)
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                                <span>Don&apos;t have a Google account? Use email code</span>
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4 pt-4 border-t border-border/40 space-y-3 animate-in fade-in-50 duration-200">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="join-email" className="text-xs font-medium text-muted-foreground">
                                    Alternative: Sign in with email code
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmailFallback(false)
                                        setError(null)
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Hide
                                </button>
                            </div>

                            <p className="text-xs text-amber-700/90 dark:text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
                                💡 <strong>Google Sign-in is recommended</strong> for instant access. Email verification codes are rate-limited.
                            </p>

                            <div className="space-y-3">
                                <Input
                                    id="join-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (!isTurnstileRequired || turnstileToken)) {
                                            sendOtp()
                                        }
                                    }}
                                    disabled={loading}
                                    autoComplete="email"
                                    inputMode="email"
                                    className="h-11 text-base"
                                />

                                {/* Cloudflare Turnstile CAPTCHA */}
                                {isTurnstileRequired && (
                                    <div className="flex justify-center py-1">
                                        <Turnstile
                                            siteKey={turnstileSiteKey!}
                                            onSuccess={(token) => {
                                                setTurnstileToken(token)
                                                setError(null)
                                            }}
                                            onError={() => {
                                                setTurnstileToken(null)
                                                setError('CAPTCHA verification failed. Please try again.')
                                            }}
                                            onExpire={() => {
                                                setTurnstileToken(null)
                                            }}
                                        />
                                    </div>
                                )}

                                <Button
                                    onClick={() => sendOtp()}
                                    disabled={loading || !email.trim() || (isTurnstileRequired && !turnstileToken)}
                                    className="h-11 w-full text-sm font-semibold"
                                >
                                    {loading ? 'Sending code…' : 'Send verification code'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (step === 'otp_verify') {
        return (
            <div className="rounded-2xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur dark:border-white/[0.10]">
                <button
                    onClick={() => { setStep('choose'); setCode(''); setError(null); setShowEmailFallback(true) }}
                    className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back
                </button>

                <h2 className="text-base font-semibold mb-1">Check your email</h2>
                <p className="text-sm text-muted-foreground mb-5">
                    We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
                    It expires in 10 minutes.
                </p>

                {suggestion && (
                    <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-300">
                        Did you mean{' '}
                        <button
                            onClick={() => { setEmail(suggestion); setSuggestion(null); sendOtp(suggestion) }}
                            className="font-semibold underline underline-offset-2"
                        >
                            {suggestion}
                        </button>
                        ?
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <form onSubmit={verifyOtp} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="otp-code">Enter 6-digit code</Label>
                        <Input
                            ref={codeInputRef}
                            id="otp-code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={code}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '')
                                setCode(v)
                                if (v.length === 6) setError(null)
                            }}
                            disabled={loading}
                            autoComplete="one-time-code"
                            className="h-14 text-center text-2xl font-mono tracking-widest"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className="h-11 w-full text-sm font-semibold"
                    >
                        {loading ? 'Verifying…' : 'Verify & Sign In'}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        onClick={() => sendOtp()}
                        disabled={loading || cooldownSeconds > 0}
                        className="text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                        {cooldownSeconds > 0
                            ? `Resend in ${cooldownSeconds}s`
                            : 'Resend code'}
                    </button>
                </div>
            </div>
        )
    }

    return null
}
