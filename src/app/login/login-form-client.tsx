// EntryDesk — Sign in for everyone.
// First visit: Google first (works for every role), then email code (parents/athletes), and the coach/organiser
// password form tucked into a "Coach or organiser with a password?" section.
// Returning visit (remembered method, see src/lib/auth/last-login.ts): ONLY that one thing, like Cloudflare:
// "Continue as pr***n@gmail.com" + "Not you?". "Not you?" forgets the hint and shows everything above.
'use client'

import { useState } from 'react'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { EmailCodeSignIn } from '@/components/auth/email-code-sign-in'
import { NotYouButton } from '@/components/auth/last-used'
import type { LastLogin } from '@/lib/auth/last-login-core'
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
    lastLogin?: LastLogin | null
}

export function LoginFormClient({ initialError, googleClientId, callbackUrl, lastLogin }: LoginFormClientProps) {
    const [customError, setCustomError] = useState<string | null>(null)
    const activeError = customError || initialError
    // After an error we always show every option, so nobody is stuck on one method.
    const focused = lastLogin && !initialError ? lastLogin : null

    const passwordForm = (
        <form action={login} className="grid gap-4">
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
    )

    return (
        <div>
            {activeError && (
                <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div>{activeError}</div>
                </div>
            )}

            {focused ? (
                <div>
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                        <p className="mt-1 text-base text-muted-foreground">
                            {focused.method === 'google' && 'Continue to EntryDesk.'}
                            {focused.method === 'email_code' && `We'll email you a code, like last time (${focused.maskedEmail}).`}
                            {focused.method === 'password' && `Sign in with your password, like last time (${focused.maskedEmail}).`}
                        </p>
                    </div>

                    {focused.method === 'google' && (
                        <div className="flex justify-center">
                            <GoogleSignInButton
                                clientId={googleClientId}
                                onError={(err) => setCustomError(err)}
                                continueAs={focused.maskedEmail}
                            />
                        </div>
                    )}
                    {focused.method === 'email_code' && <EmailCodeSignIn callbackUrl={callbackUrl} defaultOpen />}
                    {focused.method === 'password' && passwordForm}

                    <div className="mt-4 border-t border-border pt-2">
                        <NotYouButton />
                    </div>
                </div>
            ) : (
                <>
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
                        <div className="mt-3">{passwordForm}</div>
                    </details>
                </>
            )}
        </div>
    )
}
