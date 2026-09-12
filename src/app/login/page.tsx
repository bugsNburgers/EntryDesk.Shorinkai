import { getCurrentSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { HistoryBackIconButton } from '@/components/app/history-back'
import { ThemeSwitch } from '@/components/app/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { LoginFormClient } from './login-form-client'

type SearchParams = {
    error?: string | string[]
    message?: string | string[]
    retry?: string | string[]
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

    // Check existing session
    const sessionData = await getCurrentSession()
    if (sessionData) {
        redirect('/dashboard')
    }

    const features = ['Entry approvals', 'Student registration', 'Event exports', 'Coach workflows']
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''

    return (
        <div className="min-h-screen bg-background">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur dark:border-white/[0.08]">
                <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-8">
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

            <main className="grid w-full max-w-[1600px] mx-auto gap-10 px-8 pb-16 pt-28 lg:grid-cols-[1.1fr_460px] lg:items-start">
                <section>
                    <Badge variant="secondary" className="mb-5">Secure System</Badge>
                    <h1 className="text-5xl font-bold tracking-tight md:text-6xl">Sign In to EntryDesk</h1>
                    <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                        Dedicated operations portal for registered coaches and tournament organizers.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2">
                        {features.map((feature) => (
                            <Badge key={feature} className="border-0 bg-muted/30 text-foreground dark:bg-white/[0.08]">
                                {feature}
                            </Badge>
                        ))}
                    </div>

                    <div className="mt-8 hidden max-w-2xl rounded-2xl border border-border/50 dark:border-white/[0.10] lg:block">
                        <div className="grid grid-cols-2 border-b border-border/50 px-5 py-3 text-sm text-muted-foreground dark:border-white/[0.10]">
                            <span>Role</span>
                            <span>Main workflow</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-border/50 px-5 py-3 dark:border-white/[0.10]">
                            <span className="font-medium">Coach</span>
                            <span className="text-muted-foreground">Register athletes, create and submit entries</span>
                        </div>
                        <div className="grid grid-cols-2 px-5 py-3">
                            <span className="font-medium">Organizer</span>
                            <span className="text-muted-foreground">Review approvals, manage events, export lists</span>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur dark:border-white/[0.10] sm:p-8">
                    <LoginFormClient
                        initialError={errorMessage}
                        googleClientId={googleClientId}
                    />
                </section>
            </main>
        </div>
    )
}