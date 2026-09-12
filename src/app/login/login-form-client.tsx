'use client'

import { useState } from 'react'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { login } from './actions'
import { PendingButton } from '@/components/ui/pending-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NavigationOnPending } from '@/components/app/navigation-on-pending'
import { ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'

interface LoginFormClientProps {
    initialError?: string | null
    googleClientId: string
}

export function LoginFormClient({ initialError, googleClientId }: LoginFormClientProps) {
    const [customError, setCustomError] = useState<string | null>(null)
    const activeError = customError || initialError

    return (
        <div>
            {activeError && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>{activeError}</div>
                </div>
            )}

            <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">Authorized Sign In</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Access is restricted to authorized coaches and event organizers.
                </p>
            </div>

            <form action={login} className="grid gap-4">
                <NavigationOnPending title="Authenticating session" />
                <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="name@example.com"
                        className="h-11 border-border/50 bg-background/70 text-sm dark:border-white/[0.10]"
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                    </div>
                    <Input
                        id="login-password"
                        name="password"
                        type="password"
                        className="h-11 border-border/50 bg-background/70 text-sm dark:border-white/[0.10]"
                        autoComplete="current-password"
                        required
                    />
                </div>

                <PendingButton type="submit" className="mt-2 h-11 w-full gap-2 text-sm" pendingText="Verifying credentials...">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                </PendingButton>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50 dark:border-white/[0.10]" />
                </div>
                <div className="relative z-10 flex justify-center">
                    <span className="bg-card px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>

            <GoogleSignInButton
                clientId={googleClientId}
                onError={(err) => setCustomError(err)}
            />

            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-muted/20 py-2.5 px-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Zero Public Signup &middot; Strict Role-Based Access Control</span>
            </div>
        </div>
    )
}
