import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { AppNavLink } from '@/components/app/nav-link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { LandingHeader } from '@/components/app/landing-header'

const LandingUiPreview = dynamic(
    () => import('@/components/app/landing-ui-preview').then((module) => module.LandingUiPreview),
    {
        loading: () => <FeatureSectionSkeleton />,
    }
)

const StudentPortalSection = dynamic(
    () => import('@/components/app/student-portal-section').then((module) => module.StudentPortalSection),
    {
        loading: () => <StudentPortalSkeleton />,
    }
)

const PublicEventsShell = dynamic(
    () => import('@/components/app/public-events-shell').then((module) => module.PublicEventsShell),
    {
        loading: () => <PublicEventsSkeleton />,
    }
)

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            <LandingHeader />

            {/* Hero */}
            <section className="relative min-h-[88vh] overflow-hidden px-6 pb-20 pt-32 md:flex md:min-h-[92vh] md:items-center md:px-8 md:pb-24 md:pt-24 lg:min-h-screen lg:px-10 lg:pt-32 xl:px-12">
                <Image
                    src="/hero-image-v2.webp"
                    alt="Karate athletes training"
                    fill
                    priority
                    quality={75}
                    className="object-cover object-center"
                    sizes="100vw"
                />
                {/* Layered overlays for depth */}
                <div className="absolute inset-0 bg-black/38" />
                <div className="absolute inset-0 bg-gradient-to-b from-sky-950/20 via-transparent to-background/80" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.32)_100%)]" />

                <div className="relative z-10 mx-auto max-w-4xl pt-12 text-center md:max-w-5xl md:pt-0 xl:max-w-6xl">
                    <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05]">
                        Run your tournament.
                        <br />
                        <span className="text-white/90">Without the chaos.</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 md:text-xl md:max-w-3xl leading-relaxed">
                        Coach registrations, entry submissions, approvals, and exports —
                        all in one place. Built for the karate community.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <AppNavLink href="/login">
                            <Button className="h-12 gap-2 rounded-lg px-7 text-base font-semibold shadow-lg shadow-black/20">
                                Get Started
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </AppNavLink>
                        <a href="#upcoming-events" className="inline-flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-medium text-white/80 hover:text-white transition-colors">
                            Browse Events
                            <ChevronDown className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>
            </section>

            <LandingUiPreview />

            <StudentPortalSection />

            <section className="w-full px-6 pb-20 pt-4 md:px-8">
                <PublicEventsShell />
            </section>
        </div>
    )
}

function FeatureSectionSkeleton() {
    return (
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 xl:max-w-[95vw] xl:px-8" aria-hidden>
            <div className="mx-auto max-w-3xl animate-pulse space-y-3 text-center">
                <div className="mx-auto h-10 w-80 rounded-md bg-muted/45" />
                <div className="mx-auto h-6 w-full max-w-2xl rounded-md bg-muted/35" />
            </div>
            <div className="mt-8 h-[420px] rounded-3xl border border-border/50 bg-muted/20" />
        </section>
    )
}

function StudentPortalSkeleton() {
    return (
        <section className="mx-auto max-w-7xl px-6 pb-8 pt-2 md:px-8 xl:max-w-[95vw] xl:px-8" aria-hidden>
            <div className="mb-8 animate-pulse space-y-3 text-center">
                <div className="mx-auto h-10 w-96 rounded-md bg-muted/45" />
                <div className="mx-auto h-6 w-full max-w-3xl rounded-md bg-muted/35" />
            </div>
            <div className="h-[520px] rounded-3xl border border-border/50 bg-muted/20" />
        </section>
    )
}

function PublicEventsSkeleton() {
    return (
        <div className="space-y-6" aria-hidden>
            <div className="animate-pulse space-y-3 text-center">
                <div className="mx-auto h-10 w-64 rounded-md bg-muted/45" />
                <div className="mx-auto h-5 w-full max-w-xl rounded-md bg-muted/35" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-56 rounded-xl border border-border/50 bg-muted/20" />
                ))}
            </div>
        </div>
    )
}