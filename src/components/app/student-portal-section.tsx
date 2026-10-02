import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, Medal, Search, UserRound } from 'lucide-react'

export function StudentPortalSection() {
    return (
        <section id="student-portal" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-8 pt-2 md:px-8 xl:max-w-[95vw] xl:px-8">
            <div className="mb-8 text-center">
                <h2 className="text-4xl font-bold tracking-tight">Student Profiles, Instantly</h2>
                <p className="mx-auto mt-3 max-w-4xl text-center text-xl text-muted-foreground">
                    A dedicated portal for staff to search karate students and view complete performance history in seconds.
                </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm dark:border-white/[0.10]">
                <div className="grid gap-8 p-8 lg:grid-cols-[1.35fr_1fr] lg:p-10">
                    <div>
                        <Badge variant="secondary">Integrated student portal</Badge>
                        <h3 className="mt-4 text-3xl font-bold tracking-tight">Shorin Kai Student Profile Portal</h3>
                        <p className="mt-3 max-w-3xl text-muted-foreground">
                            Testlist helps staff and organizers quickly search students and open complete karate profiles with belt rank, dojo,
                            participation history, and medal results.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <FeaturePoint
                                icon={<Search className="h-4 w-4" />}
                                title="Fast student search"
                                description="Fuzzy search by full name or student ID to find the right student in seconds."
                            />
                            <FeaturePoint
                                icon={<UserRound className="h-4 w-4" />}
                                title="Complete profile view"
                                description="See identity details, belt badge, dojo, and total event statistics in one place."
                            />
                            <FeaturePoint
                                icon={<Medal className="h-4 w-4" />}
                                title="Medal timeline"
                                description="Track participation and results across events with a clear competition history."
                            />
                        </div>

                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <Button asChild className="h-11 gap-2 rounded-md px-6 text-base">
                                <a href="https://honorlog.shorinkai.in" target="_blank" rel="noreferrer">
                                    Open Student Portal
                                    <ArrowUpRight className="h-4 w-4" />
                                </a>
                            </Button>
                            <p className="text-sm text-muted-foreground">Live at honorlog.shorinkai.in</p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-muted/40 p-5 dark:bg-background/50">
                        <p className="text-sm font-semibold">Mock profile preview</p>

                        <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-border dark:ring-white/[0.08]">
                            <div className="h-12 bg-gradient-to-r from-primary/28 via-primary/22 to-primary/16" />
                            <div className="relative p-4 pt-5">
                                <div className="absolute -top-5 left-4 z-10 grid h-14 w-14 place-items-center rounded-xl bg-card text-lg font-semibold text-foreground shadow-sm ring-1 ring-border dark:ring-white/[0.12]">
                                    A
                                </div>

                                <div className="ml-20 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold leading-tight">Akshay Kumar</p>
                                        <p className="mt-1 text-xs text-muted-foreground">SK-0110 • North Branch</p>
                                    </div>
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                                        White Belt
                                    </Badge>
                                </div>

                                <div className="mt-4 grid grid-cols-4 gap-2">
                                    <MetricTile label="Events" value="1" />
                                    <MetricTile label="Gold" value="0" />
                                    <MetricTile label="Silver" value="0" />
                                    <MetricTile label="Bronze" value="0" />
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="h-4 w-1 rounded-full bg-primary/70" />
                                        <p className="text-sm font-semibold">Competition History</p>
                                    </div>

                                    <div className="mt-3 rounded-xl bg-background/70 p-3 ring-1 ring-border/40 dark:ring-white/[0.08]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold">International Friendship Cup</p>
                                                <p className="mt-1 text-xs text-muted-foreground">Pune Balewadi Complex</p>
                                            </div>
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                2025
                                            </span>
                                        </div>
                                        <div className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                                            Individual Kumite
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function FeaturePoint({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
    return (
        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-2xs dark:border-white/[0.10] dark:bg-background/70">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <span className="text-primary">{icon}</span>
                <span>{title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    )
}

function MetricTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-muted/35 px-2 py-2 text-center">
            <p className="text-base font-semibold leading-none">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
    )
}
