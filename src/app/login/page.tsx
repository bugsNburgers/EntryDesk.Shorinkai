import { getCurrentSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { HistoryBackIconButton } from '@/components/app/history-back'
import { ThemeSwitch } from '@/components/app/theme-toggle'
import { LoginFormClient } from './login-form-client'

type SearchParams = {
    error?: string | string[]
    message?: string | string[]
    retry?: string | string[]
    callbackUrl?: string | string[]
}

function getSingleParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

function getErrorMessage(errorCode?: string, retrySeconds?: string) {
    if (!errorCode) return null
    if (errorCode === 'invalid_credentials') return 'Invalid email or password. Please try again.'
    if (errorCode === 'auth_failed') return 'Unable to sign in right now. Please try again.'
    if (errorCode === 'rate_limited') return `Too many login attempts. Please wait ${retrySeconds || 60} seconds before trying again.`
    if (errorCode === 'account_disabled') return 'This account has been deactivated. Please contact an administrator.'
    if (errorCode === 'use_google') return 'This account was created with Google Sign-In. Please sign in using Google below.'
    return errorCode
}

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: SearchParams | Promise<SearchParams>
}) {
    const resolvedSearchParams = await searchParams
    const errorCode = getSingleParam(resolvedSearchParams?.error)
    const retrySeconds = getSingleParam(resolvedSearchParams?.retry)
    const errorMessage = getErrorMessage(errorCode, retrySeconds)
    const callbackUrl = getSingleParam(resolvedSearchParams?.callbackUrl)

    // Check existing session — redirect to callbackUrl if provided, else dashboard
    const sessionData = await getCurrentSession()
    if (sessionData) {
        const safeCb = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
        redirect(safeCb)
    }

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''

    return (
        <div className="min-h-screen bg-background">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur dark:border-white/[0.08]">
                <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6 sm:px-8">
                    <div className="flex items-center gap-3">
                        <HistoryBackIconButton fallbackHref="/" />
                        <Link href="/" className="flex items-center gap-2">
                            <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border/50 bg-background/70 dark:border-white/[0.12]">
                                <Image src="/favicon.ico" alt="EntryDesk logo" fill className="object-cover" sizes="32px" priority />
                            </div>
                            <span className="text-sm font-semibold">EntryDesk</span>
                        </Link>
                    </div>
                    <ThemeSwitch />
                </div>
            </header>

            <main className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center px-4 pt-20 pb-12 sm:px-6">
                <div className="w-full max-w-[460px]">
                    <section className="rounded-3xl border border-border bg-card p-6 shadow-md dark:border-white/[0.10] dark:bg-card/70 sm:p-8">
                        {/* Session-expired notice — shown when redirected from a protected page */}
                        {callbackUrl && callbackUrl.startsWith('/') && !errorMessage && (
                            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                                <span className="text-base leading-none mt-0.5">⏱</span>
                                <div>
                                    <p className="font-semibold">Session expired</p>
                                    <p className="text-xs mt-0.5 opacity-80">
                                        Please sign in again — you&apos;ll be sent right back to where you were.
                                    </p>
                                </div>
                            </div>
                        )}
                        <LoginFormClient
                            initialError={errorMessage}
                            googleClientId={googleClientId}
                            callbackUrl={callbackUrl}
                        />
                    </section>
                </div>
            </main>
        </div>
    )
}