'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Github, Mail } from 'lucide-react'

export function SiteFooter() {
    return (
        <footer id="contact" className="scroll-mt-24 relative isolate overflow-hidden border-t border-border/40 bg-background/70 dark:border-white/[0.08] dark:bg-background/60">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-[center_35%] opacity-75 blur-[1px] scale-105 dark:opacity-80"
                style={{ backgroundImage: "url('/footer bg.webp')" }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/28 via-background/40 to-background/58 dark:from-background/18 dark:via-background/32 dark:to-background/52"
            />

            <div className="relative z-10 mx-auto max-w-6xl px-4 pb-6 pt-14 sm:px-6 xl:max-w-[95vw] xl:px-8">
                <div className="rounded-3xl border border-border/60 bg-background/35 p-8 shadow-sm backdrop-blur-[2px] dark:border-white/[0.12] dark:bg-background/25 md:p-10">
                    <div className="grid gap-10 md:grid-cols-3 md:items-start">
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/[0.12] dark:bg-white/[0.04]">
                                <span className="relative h-3.5 w-3.5 overflow-hidden rounded-full">
                                    <Image src="/favicon.ico" alt="EntryDesk logo" fill className="object-cover" sizes="14px" />
                                </span>
                                <span>EntryDesk</span>
                            </div>
                            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                                Lightweight event operations for coaches and organizers.
                            </p>
                            <a
                                href="https://github.com/ull0sm/EntryDesk"
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground"
                            >
                                <Github className="h-4 w-4" />
                                Open for contribution
                            </a>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Links</div>
                            <div className="space-y-3">
                                <Link href="/#features" className="group flex w-fit items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                                    Features
                                    <ArrowUpRight className="h-3.5 w-3.5 opacity-65 transition-opacity group-hover:opacity-100" />
                                </Link>
                                <Link href="/#upcoming-events" className="group flex w-fit items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                                    Events
                                    <ArrowUpRight className="h-3.5 w-3.5 opacity-65 transition-opacity group-hover:opacity-100" />
                                </Link>
                                <Link href="/login" className="group flex w-fit items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                                    Login
                                    <ArrowUpRight className="h-3.5 w-3.5 opacity-65 transition-opacity group-hover:opacity-100" />
                                </Link>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</div>
                            <div className="space-y-3">
                                <a href="mailto:hello@ull0sm.in" className="flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                                    <Mail className="h-4 w-4" />
                                    hello@ull0sm.in
                                </a>
                                <a href="mailto:hello@suprateekyawagal.in" className="flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                                    <Mail className="h-4 w-4" />
                                    hello@suprateekyawagal.in
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-border/40 dark:border-white/[0.08]">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-xs text-muted-foreground sm:px-6 xl:max-w-[95vw] xl:px-8">
                    <span>© {new Date().getFullYear()} EntryDesk</span>
                    <span>Next.js • PostgreSQL • Tailwind</span>
                </div>
            </div>
        </footer>
    )
}