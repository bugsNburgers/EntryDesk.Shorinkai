// EntryDesk — Sign in for everyone (09/11/2026 redesign).
// Google first (works for every role), then email code (parents/athletes), and the coach/organiser
// password form tucked into a "Coach or organiser with a password?" section.
'use client'

import { useState } from 'react'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { EmailCodeSignIn } from '@/components/auth/email-code-sign-in'
import { login } from './actions'
import { PendingButton } from '@/components/ui/pending-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NavigationOnPending } from '@/components/app/navigation-on-pending'
import { AlertCircle } from 'lucide-react'

interface LoginFormClientProps {
    initialError?: string | null
    googleClientId: string
    callbackUrl?: string
}

export function LoginFormClient({ initialError, googleClientId, callbackUrl }: LoginFormClientProps) {
    const [customError, setCustomError] = useState<string | null>(null)
    const activeError = customError || initialError

    return (
        <div>
            {activeError && (
                <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div>{activeError}</div>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
                <p className="mt-1 text-base text-muted-foreground">For parents, athletes, coaches and organisers.</p>
            </div>

            <div className="space-y-3">
                <GoogleSignInButton clientId={googleClientId} onError={(err) => setCustomError(err)} />
                <EmailCodeSignIn callbackUrl={callbackUrl} />
                <p className="text-[15px] text-muted-foreground">
                    Parents: the first time, use the link your coach sent you. After that, sign in here.
                </p>
            </div>

            <details className="mt-6 border-t border-border pt-3" open={Boolean(initialError)}>
                <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold">
                    Coach or organiser with a password?
                </summary>
                <form action={login} className="mt-3 grid gap-4">
                    <NavigationOnPending title="Signing in" />
                    {callbackUrl && callbackUrl.startsWith('/') && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
                    <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-base font-semibold">Email</Label>
                        <Input id="login-email" name="email" type="email" autoComplete="email" required className="h-12 text-base" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-base font-semibold">Password</Label>
                        <Input id="login-password" name="password" type="password" autoComplete="current-password" required className="h-12 text-base" />
                    </div>
                    <PendingButton type="submit" className="min-h-12 w-full text-base" pendingText="Signing in…">
                        Sign in
                    </PendingButton>
                </form>
            </details>
        </div>
    )
}
