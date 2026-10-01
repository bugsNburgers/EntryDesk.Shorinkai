// ============================================================================
// EntryDesk — Join Page: Public Dojo Landing Page
// /join/[slug]
// Server Component — shows dojo info + auth options. No auth required.
// ============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import sql from '@/lib/db'
import { getCurrentSession } from '@/lib/auth/session'
import { JoinPageClient } from './join-page-client'
import { redirect } from 'next/navigation'

interface JoinPageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
    const { slug } = await params
    const dojos = await sql<{ name: string; city: string | null }[]>`
        SELECT name, city FROM dojos WHERE slug = ${slug} AND join_link_enabled = TRUE LIMIT 1
    `
    if (!dojos.length) {
        return { title: 'Join a Dojo — EntryDesk' }
    }
    return {
        title: `Join ${dojos[0].name} — EntryDesk`,
        description: `Register yourself or your child at ${dojos[0].name}${dojos[0].city ? ` in ${dojos[0].city}` : ''} via EntryDesk.`,
    }
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { slug } = await params

    // If already logged in as a parent, redirect to parent portal with joinedDojo param
    const session = await getCurrentSession()
    if (session && session.user.role === 'parent') {
        redirect(`/athlete?joinedDojo=${slug}`)
    }
    // If logged in as coach/organiser/admin, go to dashboard
    if (session && session.user.role !== 'parent') {
        redirect('/dashboard')
    }

    const dojos = await sql<{
        id: string
        name: string
        city: string | null
        welcome_note: string | null
        join_link_enabled: boolean
        coach_name: string | null
        coach_avatar: string | null
    }[]>`
        SELECT
            d.id,
            d.name,
            d.city,
            d.welcome_note,
            d.join_link_enabled,
            u.full_name AS coach_name,
            u.avatar_url AS coach_avatar
        FROM dojos d
        JOIN users u ON d.coach_id = u.id
        WHERE d.slug = ${slug}
        LIMIT 1
    `

    if (!dojos.length) {
        notFound()
    }

    const dojo = dojos[0]

    if (!dojo.join_link_enabled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="text-center max-w-sm">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold mb-2">Link has been disabled</h1>
                    <p className="text-muted-foreground text-sm">
                        This join link is no longer active. Please ask your coach for an updated link.
                    </p>
                </div>
            </div>
        )
    }

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

    return (
        <div className="min-h-screen bg-background">
            {/* Minimal header */}
            <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur dark:border-white/[0.08]">
                <div className="mx-auto flex h-14 max-w-lg items-center px-5">
                    <div className="flex items-center gap-2">
                        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border/50 bg-background/70">
                            <Image src="/favicon.ico" alt="EntryDesk" fill className="object-cover" sizes="28px" />
                        </div>
                        <span className="text-sm font-semibold">EntryDesk</span>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-5 pt-24 pb-16">
                {/* Dojo info card */}
                <div className="mb-8 rounded-2xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur dark:border-white/[0.10]">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight">{dojo.name}</h1>
                            {dojo.city && (
                                <p className="text-sm text-muted-foreground">{dojo.city}</p>
                            )}
                        </div>
                    </div>

                    {/* Coach info */}
                    <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5 dark:bg-white/[0.04]">
                        {dojo.coach_avatar ? (
                            <Image
                                src={dojo.coach_avatar}
                                alt={dojo.coach_name ?? 'Coach'}
                                width={28}
                                height={28}
                                className="rounded-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                                {(dojo.coach_name ?? 'C').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="text-sm text-muted-foreground">
                            Coached by <span className="font-medium text-foreground">{dojo.coach_name ?? 'Your coach'}</span>
                        </span>
                    </div>

                    {dojo.welcome_note && (
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4 dark:border-white/[0.06]">
                            {dojo.welcome_note}
                        </p>
                    )}
                </div>

                {/* What happens next */}
                <div className="mb-6">
                    <h2 className="text-base font-semibold mb-3">How it works</h2>
                    <ol className="space-y-3">
                        {[
                            { step: '1', text: 'Sign in with Google or your email' },
                            { step: '2', text: 'Add your or your child\'s athlete details and photo' },
                            { step: '3', text: 'Your coach sees your registration in their roster' },
                            { step: '4', text: 'Get notified when entries are approved' },
                        ].map(({ step, text }) => (
                            <li key={step} className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20">
                                    {step}
                                </div>
                                <span className="text-sm text-muted-foreground">{text}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Auth form */}
                <JoinPageClient
                    dojoSlug={slug}
                    dojoName={dojo.name}
                    googleClientId={googleClientId}
                />

                <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                    By signing in, you agree to EntryDesk&apos;s{' '}
                    <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>
                    {' '}and{' '}
                    <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</a>.
                </p>
            </main>
        </div>
    )
}
